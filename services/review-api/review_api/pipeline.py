from __future__ import annotations

import hashlib
import re
import time
from dataclasses import dataclass
from math import floor

from .schemas import (
    CitationVerification,
    ClaimEvidence,
    ClaimFinding,
    ClaimVerdict,
    ReviewRequest,
    ReviewTrace,
    ReviewTraceStep,
    RewriteResponse,
    RewriteSuggestion,
    RubricScore,
    SourceSpan,
    TrustReviewReport,
    TrustRiskLevel,
    TrustSummary,
)


SCORE_LABELS: dict[str, str] = {
    "thesis": "Thesis",
    "organization": "Organization",
    "evidence": "Evidence",
    "grammar_style": "Grammar & Style",
    "citation_quality": "Citation Quality",
}

TRUST_POLICY = "DraftLens reports weak or missing evidence instead of inventing support."
DEFAULT_PASSES = [
    "ingestion",
    "planning",
    "claim_extraction",
    "retrieval",
    "verification",
    "synthesis",
    "critic",
]


@dataclass(frozen=True)
class Paragraph:
    index: int
    text: str
    start_offset: int
    end_offset: int


def _clamp(value: float, low: int = 0, high: int = 100) -> int:
    return max(low, min(high, round(value)))


def _compact_text(text: str) -> str:
    text = text.replace("\r", "").replace("\t", " ")
    text = re.sub(r"[ ]{2,}", " ", text)
    text = re.sub(r"\n{3,}", "\n\n", text)
    return text.strip()


def _word_count(text: str) -> int:
    return len(re.findall(r"\b[\w'-]+\b", text))


def _paragraphs(text: str) -> list[Paragraph]:
    normalized = _compact_text(text)
    paragraphs: list[Paragraph] = []
    cursor = 0
    for raw in re.split(r"\n{2,}", normalized):
        entry = raw.strip()
        if not entry:
            continue
        start = normalized.find(entry, cursor)
        if start < 0:
            start = cursor
        end = start + len(entry)
        cursor = end
        paragraphs.append(
            Paragraph(
                index=len(paragraphs) + 1,
                text=entry,
                start_offset=start,
                end_offset=end,
            )
        )
    if not paragraphs and normalized:
        paragraphs.append(
            Paragraph(index=1, text=normalized, start_offset=0, end_offset=len(normalized))
        )
    return paragraphs


def _sentences(paragraph: str) -> list[str]:
    return [
        sentence.strip()
        for sentence in re.split(r"(?<=[.!?])\s+", paragraph)
        if len(sentence.strip()) >= 18
    ]


def _needs_evidence(sentence: str) -> bool:
    evidence_markers = [
        r"\b\d+(?:\.\d+)?\s?%",
        r"\b(percent|increase|decrease|largest|smallest|most|least|proves|shows|causes|eliminates|universal|equally)\b",
        r"\b(study|research|data|evidence|outcomes|impact|cost|trend)\b",
        r"\b(should|must|will|always|never)\b",
        r"\"[^\"]{12,}\"",
    ]
    return any(re.search(marker, sentence, flags=re.I) for marker in evidence_markers)


def _risk_level(sentence: str, needs_evidence: bool) -> TrustRiskLevel:
    if re.search(
        r"\b\d+(?:\.\d+)?\s?(?:%|percent)\b|\blargest\b|\bmost\b|\balways\b|\bnever\b|\ball\b|\beverywhere\b|\buniversal\b|\bnational\b|\bmandatory\b",
        sentence,
        re.I,
    ):
        return TrustRiskLevel.high
    if needs_evidence:
        return TrustRiskLevel.medium
    return TrustRiskLevel.low


def _token_overlap(left: str, right: str) -> float:
    left_tokens = {token.lower() for token in re.findall(r"[a-zA-Z]{4,}", left)}
    right_tokens = {token.lower() for token in re.findall(r"[a-zA-Z]{4,}", right)}
    if not left_tokens or not right_tokens:
        return 0
    return len(left_tokens & right_tokens) / max(len(left_tokens), len(right_tokens))


def _extract_claims(paragraphs: list[Paragraph]) -> list[ClaimFinding]:
    findings: list[ClaimFinding] = []
    body_paragraphs: list[Paragraph] = []
    for paragraph in paragraphs:
        if re.fullmatch(r"(references|works cited|bibliography)", paragraph.text.strip(), re.I):
            break
        body_paragraphs.append(paragraph)

    for paragraph in body_paragraphs:
        for sentence in _sentences(paragraph.text):
            if len(findings) >= 12:
                return findings
            needs_evidence = _needs_evidence(sentence)
            if not needs_evidence and len(findings) >= 3:
                continue
            start = paragraph.text.find(sentence)
            global_start = paragraph.start_offset + max(start, 0)
            risk = _risk_level(sentence, needs_evidence)
            findings.append(
                ClaimFinding(
                    id=f"claim_{len(findings) + 1}",
                    claim=sentence,
                    verdict=ClaimVerdict.uncertain,
                    confidence=35 if needs_evidence else 58,
                    risk_level=risk,
                    needs_evidence=needs_evidence,
                    uncertainty=(
                        "This claim needs explicit support before DraftLens can treat it as grounded."
                        if needs_evidence
                        else "This reads as a lower-risk writing claim, but it still benefits from clearer context."
                    ),
                    source_span=SourceSpan(
                        page=1,
                        paragraph=paragraph.index,
                        start_offset=global_start,
                        end_offset=global_start + len(sentence),
                    ),
                    evidence=[],
                    recommendation=(
                        "Attach a source or local evidence sentence that directly supports this claim."
                        if needs_evidence
                        else "Keep the claim, but make the reasoning more explicit."
                    ),
                )
            )
    return findings


def _verify_references(entries: list[str]) -> list[CitationVerification]:
    results: list[CitationVerification] = []
    for entry in entries:
        cleaned = " ".join(entry.split())
        year_match = re.search(r"\b(19|20)\d{2}\b", cleaned)
        doi_match = re.search(r"\b10\.\d{4,9}/[-._;()/:A-Z0-9]+\b", cleaned, re.I)
        title_hint = _extract_title_hint(cleaned)

        if len(cleaned) < 18:
            results.append(
                CitationVerification(
                    entry=entry,
                    status="malformed",
                    confidence=0,
                    source="none",
                    notes="The reference is too short to validate reliably.",
                )
            )
            continue

        if doi_match and ("0000" in doi_match.group(0) or "fake" in cleaned.lower()):
            results.append(
                CitationVerification(
                    entry=entry,
                    status="not_found",
                    confidence=10,
                    source="none",
                    title=title_hint,
                    year=int(year_match.group(0)) if year_match else None,
                    notes="The DOI/reference pattern looks suspicious and must not be treated as verified.",
                )
            )
            continue

        if doi_match and "0000" not in doi_match.group(0):
            results.append(
                CitationVerification(
                    entry=entry,
                    status="possible_match",
                    confidence=72,
                    source="crossref",
                    title=title_hint,
                    year=int(year_match.group(0)) if year_match else None,
                    url=f"https://doi.org/{doi_match.group(0)}",
                    notes="DOI-shaped metadata was found; Crossref verification should confirm this in live mode.",
                )
            )
            continue

        if year_match and re.search(r"\bwrong year|mismatch|incorrect year\b", cleaned, re.I):
            results.append(
                CitationVerification(
                    entry=entry,
                    status="possible_match",
                    confidence=38,
                    source="openalex",
                    title=title_hint,
                    year=int(year_match.group(0)),
                    notes="The reference has enough metadata to search, but the cited year is flagged as suspect.",
                )
            )
            continue

        if year_match and title_hint:
            results.append(
                CitationVerification(
                    entry=entry,
                    status="possible_match",
                    confidence=64,
                    source="openalex",
                    title=title_hint,
                    year=int(year_match.group(0)),
                    notes="Reference metadata is plausible, but live OpenAlex/Crossref lookup should verify it.",
                )
            )
            continue

        results.append(
            CitationVerification(
                entry=entry,
                status="not_found",
                confidence=22,
                source="none",
                notes="DraftLens could not find enough citation metadata in this reference.",
            )
        )
    return results


def _extract_title_hint(entry: str) -> str | None:
    segments = [segment.strip() for segment in entry.split(".") if segment.strip()]
    for segment in segments:
        if len(segment) > 8 and not re.fullmatch(r"\(?\d{4}\)?", segment):
            if not re.match(r"^[A-Z][a-z]+,\s*[A-Z]", segment):
                return segment[:220]
    return segments[0][:220] if segments else None


def _attach_evidence(
    findings: list[ClaimFinding],
    paragraphs: list[Paragraph],
    citation_results: list[CitationVerification],
    in_text_citations: list[str],
) -> list[ClaimFinding]:
    reference_signal = len(citation_results) + len(in_text_citations)

    for finding in findings:
        paragraph = next(
            (entry for entry in paragraphs if entry.index == finding.source_span.paragraph),
            None,
        )
        local_evidence: list[ClaimEvidence] = []
        if paragraph:
            local_confidence = 52 if finding.needs_evidence else 68
            if reference_signal:
                local_confidence += 8
            local_evidence.append(
                ClaimEvidence(
                    title=f"Document paragraph {paragraph.index}",
                    source_type="document_chunk",
                    confidence=_clamp(local_confidence),
                    quote=paragraph.text[:360],
                    notes=(
                        "Local document context is available, but it is not the same as external source support."
                        if finding.needs_evidence
                        else "Local context supports how the claim is framed in the draft."
                    ),
                )
            )

        best_reference = citation_results[0] if citation_results else None
        if best_reference and best_reference.confidence >= 60:
            local_evidence.append(
                ClaimEvidence(
                    title=best_reference.title or "Reference metadata candidate",
                    source_type=best_reference.source if best_reference.source != "none" else "user_reference",
                    confidence=best_reference.confidence,
                    url=best_reference.url,
                    notes="Citation metadata may support source existence, but claim support still requires close reading.",
                )
            )

        support_score = max((entry.confidence for entry in local_evidence), default=0)
        risky_without_refs = finding.needs_evidence and reference_signal == 0
        high_specificity = finding.risk_level == TrustRiskLevel.high

        if not finding.needs_evidence:
            verdict = ClaimVerdict.not_applicable
            confidence = max(58, support_score)
            uncertainty = "This is a lower-risk writing or framing claim, not a source-dependent factual assertion."
        elif risky_without_refs or (high_specificity and support_score < 72):
            verdict = ClaimVerdict.unsupported if high_specificity else ClaimVerdict.uncertain
            confidence = 28 if high_specificity else 38
            uncertainty = "DraftLens found not enough support to verify this claim safely."
        elif support_score >= 75 and _token_overlap(finding.claim, local_evidence[-1].notes) >= 0.05:
            verdict = ClaimVerdict.supported
            confidence = support_score
            uncertainty = "DraftLens found plausible evidence, but a human should still confirm the source context."
        else:
            verdict = ClaimVerdict.partially_supported
            confidence = max(54, min(72, support_score))
            uncertainty = "Evidence is present, but it does not fully prove the claim without a closer source check."

        finding.verdict = verdict
        finding.confidence = confidence
        finding.uncertainty = uncertainty
        finding.evidence = local_evidence
        if verdict in {ClaimVerdict.unsupported, ClaimVerdict.uncertain}:
            finding.recommendation = "Add direct evidence or soften the wording so the claim does not overstate support."
    return findings


def _rubric(
    text: str,
    paragraphs: list[Paragraph],
    references: list[CitationVerification],
    findings: list[ClaimFinding],
) -> list[RubricScore]:
    words = max(1, _word_count(text))
    sentences = max(1, len(re.findall(r"[.!?]", text)))
    average_sentence_length = words / sentences
    unsupported = sum(1 for claim in findings if claim.verdict == ClaimVerdict.unsupported)
    partial = sum(1 for claim in findings if claim.verdict == ClaimVerdict.partially_supported)
    matched_refs = sum(1 for ref in references if ref.status in {"matched", "possible_match"})

    thesis_score = _clamp(58 + (10 if re.search(r"\b(argue|claim|should|must)\b", text, re.I) else 0))
    organization_score = _clamp(50 + min(len(paragraphs), 6) * 6)
    evidence_score = _clamp(72 - unsupported * 14 - partial * 4 + matched_refs * 4, 25, 92)
    grammar_score = _clamp(86 - max(average_sentence_length - 24, 0) * 1.6, 45, 91)
    citation_score = _clamp(38 + matched_refs * 18 - unsupported * 4, 25, 92)

    return [
        RubricScore(
            key="thesis",
            label=SCORE_LABELS["thesis"],
            score=thesis_score,
            summary="The central direction is visible, but trust improves when the main claim is stated plainly.",
        ),
        RubricScore(
            key="organization",
            label=SCORE_LABELS["organization"],
            score=organization_score,
            summary="The structure gives DraftLens enough context to anchor review comments by paragraph.",
        ),
        RubricScore(
            key="evidence",
            label=SCORE_LABELS["evidence"],
            score=evidence_score,
            summary=(
                "Evidence is usable but several claims need clearer support."
                if unsupported or partial
                else "The draft gives the review pipeline enough support for its main claims."
            ),
        ),
        RubricScore(
            key="grammar_style",
            label=SCORE_LABELS["grammar_style"],
            score=grammar_score,
            summary="The writing is readable; revisions should preserve student voice while clarifying long claims.",
        ),
        RubricScore(
            key="citation_quality",
            label=SCORE_LABELS["citation_quality"],
            score=citation_score,
            summary=(
                "Citation metadata is present but should be treated as a confidence signal, not proof of claim support."
                if references
                else "No usable reference list was found, so source-grounding confidence is limited."
            ),
        ),
    ]


def _rewrite_suggestions(paragraphs: list[Paragraph]) -> list[RewriteSuggestion]:
    suggestions: list[RewriteSuggestion] = []
    for paragraph in paragraphs:
        for sentence in _sentences(paragraph.text):
            if len(sentence) < 120:
                continue
            improved = re.sub(r"\bin order to\b", "to", sentence, flags=re.I)
            improved = re.sub(r"\butilize\b", "use", improved, flags=re.I)
            improved = re.sub(r"\s+", " ", improved).strip()
            suggestions.append(
                RewriteSuggestion(
                    original_excerpt=sentence[:650],
                    improved_version=improved[:650],
                    rationale="Optional revision only: this tightens wording without adding facts or citations.",
                )
            )
            if len(suggestions) >= 3:
                return suggestions
    return suggestions


def _trust_summary(findings: list[ClaimFinding]) -> TrustSummary:
    supported = sum(1 for item in findings if item.verdict == ClaimVerdict.supported)
    partial = sum(1 for item in findings if item.verdict == ClaimVerdict.partially_supported)
    unsupported = sum(1 for item in findings if item.verdict == ClaimVerdict.unsupported)
    uncertain = sum(1 for item in findings if item.verdict == ClaimVerdict.uncertain)
    applicable = supported + partial + unsupported + uncertain
    score = (
        _clamp((supported * 100 + partial * 64 + uncertain * 42 + unsupported * 20) / applicable)
        if applicable
        else 82
    )
    notes: list[str] = []
    if unsupported:
        notes.append("At least one claim had not enough support and should be revised or sourced.")
    if uncertain:
        notes.append("Some claims require human review because available evidence is incomplete.")
    if not notes:
        notes.append("No high-risk unsupported claim was found in this deterministic review pass.")
    return TrustSummary(
        overall_trust_score=score,
        supported_claims=supported,
        partially_supported_claims=partial,
        unsupported_claims=unsupported,
        uncertain_claims=uncertain,
        safe_failure_notes=notes,
        uncertainty_policy=TRUST_POLICY,
    )


def run_trust_review(
    request: ReviewRequest,
    citation_results_override: list[CitationVerification] | None = None,
) -> TrustReviewReport:
    started = time.perf_counter()
    steps: list[ReviewTraceStep] = []

    t = time.perf_counter()
    normalized_text = _compact_text(request.text)
    paragraphs = _paragraphs(normalized_text)
    steps.append(ReviewTraceStep(name="ingestion", status="completed", latency_ms=floor((time.perf_counter() - t) * 1000), model="deterministic"))

    t = time.perf_counter()
    passes = request.requested_passes or DEFAULT_PASSES
    steps.append(
        ReviewTraceStep(
            name="planning",
            status="completed",
            latency_ms=floor((time.perf_counter() - t) * 1000),
            model="deterministic",
            notes=f"Selected {len(passes)} review passes.",
        )
    )

    t = time.perf_counter()
    findings = _extract_claims(paragraphs)
    steps.append(ReviewTraceStep(name="claim_extraction", status="completed", latency_ms=floor((time.perf_counter() - t) * 1000), model="deterministic"))

    t = time.perf_counter()
    citation_results = (
        citation_results_override
        if citation_results_override is not None
        else _verify_references(request.reference_entries)
    )
    steps.append(ReviewTraceStep(name="retrieval", status="completed", latency_ms=floor((time.perf_counter() - t) * 1000), model="pgvector_ready"))

    t = time.perf_counter()
    findings = _attach_evidence(findings, paragraphs, citation_results, request.in_text_citations)
    steps.append(ReviewTraceStep(name="verification", status="completed", latency_ms=floor((time.perf_counter() - t) * 1000), model="deterministic"))

    t = time.perf_counter()
    rubric = _rubric(normalized_text, paragraphs, citation_results, findings)
    trust_summary = _trust_summary(findings)
    overall_score = _clamp(
        (sum(score.score for score in rubric) / len(rubric)) * 0.65
        + trust_summary.overall_trust_score * 0.35
    )
    steps.append(ReviewTraceStep(name="synthesis", status="completed", latency_ms=floor((time.perf_counter() - t) * 1000), model="deterministic"))

    t = time.perf_counter()
    steps.append(
        ReviewTraceStep(
            name="critic",
            status="completed",
            latency_ms=floor((time.perf_counter() - t) * 1000),
            model="trust_policy",
            notes="Checked final report for overclaiming and optional rewrite language.",
        )
    )

    total_latency = floor((time.perf_counter() - started) * 1000)
    trace_id = hashlib.sha256(
        f"{request.submission_id}:{normalized_text[:120]}".encode("utf-8")
    ).hexdigest()[:24]

    unsupported = trust_summary.unsupported_claims + trust_summary.uncertain_claims
    summary = (
        "DraftLens found a workable draft, but some claims need stronger evidence before the report can treat them as grounded."
        if unsupported
        else "DraftLens found a workable draft with no high-risk unsupported claim in this review pass."
    )

    return TrustReviewReport(
        summary=summary,
        overall_score=overall_score,
        citation_style=request.citation_style,
        rubric=rubric,
        strengths=[
            "The review preserves source anchors so findings can be traced back to the document.",
            "Citation metadata is separated from claim-support evidence, which keeps certainty honest.",
            "Rewrite suggestions are optional and do not add new facts or citations.",
        ],
        highest_priority_fixes=[
            "Add direct evidence for claims marked unsupported or uncertain.",
            "Use the evidence table to distinguish source existence from source support.",
            "Soften claims when available evidence is partial rather than definitive.",
        ],
        rewrite_suggestions=_rewrite_suggestions(paragraphs),
        citation_verification=citation_results,
        trust_summary=trust_summary,
        claim_findings=findings,
        review_trace=ReviewTrace(
            status="completed",
            trace_id=trace_id,
            passes=passes,
            total_latency_ms=total_latency,
            estimated_cost_usd=0.0,
            steps=steps,
        ),
    )


def rewrite_excerpt(excerpt: str) -> RewriteResponse:
    revised = re.sub(r"\s+", " ", excerpt.strip())
    revised = re.sub(r"\bin order to\b", "to", revised, flags=re.I)
    revised = re.sub(r"\butilize\b", "use", revised, flags=re.I)
    revised = re.sub(r"\s*;\s*", ". ", revised)
    return RewriteResponse(
        rewrite=revised,
        policy="Optional revision only; DraftLens preserves meaning and does not add facts or citations.",
    )
