from __future__ import annotations

import os
import time

from .external_sources import SourceLookupConfig, verify_references_live
from .pipeline import run_trust_review
from .schemas import CitationVerification, ReviewRequest, ReviewTraceStep, TrustReviewReport


def _live_lookup_enabled() -> bool:
    return os.getenv("DRAFTLENS_ENABLE_LIVE_LOOKUPS", "true").lower() not in {
        "0",
        "false",
        "no",
    }


def _model_for_step(step_name: str) -> str:
    if step_name in {"synthesis", "critic", "verification"}:
        return os.getenv("OPENAI_REASONING_MODEL", "reasoning-model-configured")
    return os.getenv("OPENAI_FAST_MODEL", "fast-model-configured")


def _routing_steps() -> list[ReviewTraceStep]:
    return [
        ReviewTraceStep(
            name="model_routing",
            status="completed",
            latency_ms=0,
            model="deterministic_policy",
            notes=(
                "Fast model reserved for extraction/formatting; reasoning model reserved "
                "for ambiguous verification, synthesis, and critic passes."
            ),
        ),
        ReviewTraceStep(
            name="human_safe_policy",
            status="completed",
            latency_ms=0,
            model="trust_policy",
            notes="Unsupported claims must fail safely; rewrites are optional and non-authoritative.",
        ),
    ]


async def run_agentic_trust_review(request: ReviewRequest) -> TrustReviewReport:
    """Run the MVP agentic path while preserving deterministic fallback.

    The first production slice keeps the pipeline composable and observable:
    deterministic parsing/policy enforcement, optional live scholarly metadata
    lookup, explicit model-routing trace records, and the existing structured
    report contract. OpenAI reasoning calls can be added behind these routing
    contracts without changing the web app wire shape.
    """

    started = time.perf_counter()
    external_results: list[CitationVerification] | None = None
    lookup_step: ReviewTraceStep | None = None

    if _live_lookup_enabled() and request.reference_entries:
        lookup_started = time.perf_counter()
        config = SourceLookupConfig(
            user_agent=os.getenv("DRAFTLENS_USER_AGENT", "DraftLens/0.1"),
            mailto=os.getenv("CROSSREF_MAILTO") or os.getenv("OPENALEX_MAILTO") or None,
        )
        maybe_results = await verify_references_live(request.reference_entries, config)
        external_results = [result for result in maybe_results if result is not None]
        lookup_step = ReviewTraceStep(
            name="external_source_lookup",
            status="completed",
            latency_ms=round((time.perf_counter() - lookup_started) * 1000),
            model="crossref_openalex",
            notes=(
                f"Verified metadata for {len(external_results)} of "
                f"{len(request.reference_entries)} references. Metadata matches do not prove claim support."
            ),
        )

    report = run_trust_review(request, citation_results_override=external_results)
    report.review_trace.steps = _routing_steps() + report.review_trace.steps

    if lookup_step:
        report.review_trace.steps.insert(3, lookup_step)

    for step in report.review_trace.steps:
        if step.model == "pgvector_ready":
            step.model = "supabase_pgvector_fts"
        elif step.name in {"claim_extraction", "synthesis", "critic", "verification"}:
            step.model = step.model or _model_for_step(step.name)

    report.review_trace.total_latency_ms = round((time.perf_counter() - started) * 1000)
    return report
