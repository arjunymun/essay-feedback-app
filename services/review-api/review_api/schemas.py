from __future__ import annotations

from enum import Enum
from typing import Literal

from pydantic import BaseModel, ConfigDict, Field


def to_camel(value: str) -> str:
    first, *rest = value.split("_")
    return first + "".join(part.capitalize() for part in rest)


class DraftLensModel(BaseModel):
    model_config = ConfigDict(
        alias_generator=to_camel,
        populate_by_name=True,
        extra="forbid",
    )


CitationStyle = Literal["apa", "mla", "unknown"]
ScoreKey = Literal["thesis", "organization", "evidence", "grammar_style", "citation_quality"]


class ClaimVerdict(str, Enum):
    supported = "supported"
    partially_supported = "partially_supported"
    unsupported = "unsupported"
    uncertain = "uncertain"
    not_applicable = "not_applicable"


class TrustRiskLevel(str, Enum):
    low = "low"
    medium = "medium"
    high = "high"


class ReviewRequest(DraftLensModel):
    submission_id: str
    user_id: str
    title: str
    text: str = Field(min_length=40, max_length=100_000)
    citation_style: CitationStyle = "unknown"
    reference_entries: list[str] = Field(default_factory=list)
    in_text_citations: list[str] = Field(default_factory=list)
    requested_passes: list[str] | None = None


class RewriteRequest(DraftLensModel):
    excerpt: str = Field(min_length=30, max_length=1600)


class RubricScore(DraftLensModel):
    key: ScoreKey
    label: str
    score: int = Field(ge=0, le=100)
    summary: str


class RewriteSuggestion(DraftLensModel):
    original_excerpt: str
    improved_version: str
    rationale: str


class CitationVerification(DraftLensModel):
    entry: str
    status: Literal["matched", "possible_match", "not_found", "malformed"]
    confidence: int = Field(ge=0, le=100)
    source: Literal["crossref", "openalex", "none"]
    title: str | None = None
    authors: str | None = None
    year: int | None = None
    url: str | None = None
    notes: str


class SourceSpan(DraftLensModel):
    page: int | None = Field(default=None, ge=1)
    paragraph: int | None = Field(default=None, ge=1)
    start_offset: int | None = Field(default=None, ge=0)
    end_offset: int | None = Field(default=None, ge=0)


class ClaimEvidence(DraftLensModel):
    title: str
    source_type: Literal["document_chunk", "crossref", "openalex", "user_reference", "none"]
    confidence: int = Field(ge=0, le=100)
    quote: str | None = None
    url: str | None = None
    notes: str


class ClaimFinding(DraftLensModel):
    id: str
    claim: str
    verdict: ClaimVerdict
    confidence: int = Field(ge=0, le=100)
    risk_level: TrustRiskLevel
    needs_evidence: bool
    uncertainty: str
    source_span: SourceSpan
    evidence: list[ClaimEvidence] = Field(default_factory=list)
    recommendation: str


class TrustSummary(DraftLensModel):
    overall_trust_score: int = Field(ge=0, le=100)
    supported_claims: int = Field(ge=0)
    partially_supported_claims: int = Field(ge=0)
    unsupported_claims: int = Field(ge=0)
    uncertain_claims: int = Field(ge=0)
    safe_failure_notes: list[str] = Field(default_factory=list)
    uncertainty_policy: str


class ReviewTraceStep(DraftLensModel):
    name: str
    status: Literal["completed", "failed", "skipped"]
    latency_ms: int | None = Field(default=None, ge=0)
    model: str | None = None
    notes: str | None = None


class ReviewTrace(DraftLensModel):
    workflow_name: str = "trust_first_review"
    status: Literal["completed", "failed", "fallback"] = "completed"
    trace_id: str | None = None
    passes: list[str] = Field(default_factory=list)
    total_latency_ms: int | None = Field(default=None, ge=0)
    estimated_cost_usd: float | None = Field(default=None, ge=0)
    steps: list[ReviewTraceStep] = Field(default_factory=list)


class TrustReviewReport(DraftLensModel):
    summary: str
    overall_score: int = Field(ge=0, le=100)
    citation_style: CitationStyle
    rubric: list[RubricScore]
    strengths: list[str]
    highest_priority_fixes: list[str]
    rewrite_suggestions: list[RewriteSuggestion]
    citation_verification: list[CitationVerification]
    trust_summary: TrustSummary
    claim_findings: list[ClaimFinding]
    review_trace: ReviewTrace


class RewriteResponse(DraftLensModel):
    rewrite: str
    policy: str = "Optional revision only; DraftLens does not add facts or citations."
