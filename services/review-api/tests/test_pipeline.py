from review_api.pipeline import run_trust_review
from review_api.schemas import ReviewRequest


def test_pipeline_produces_claim_findings_and_trace():
    request = ReviewRequest(
        submission_id="sub_demo",
        user_id="user_demo",
        title="Coastal Cities",
        text=(
            "Coastal cities should begin adaptation planning earlier because flood "
            "damage is becoming more expensive. This draft cites Smith 2023 but "
            "does not prove the cost trend.\n\n"
            "References\n\n"
            "Smith, J. (2023). Resilient shorelines and urban adaptation. "
            "Journal of Climate Policy."
        ),
        citation_style="apa",
        reference_entries=[
            "Smith, J. (2023). Resilient shorelines and urban adaptation. Journal of Climate Policy."
        ],
        in_text_citations=["(Smith, 2023)"],
    )

    report = run_trust_review(request)

    assert report.summary
    assert report.citation_style == "apa"
    assert len(report.claim_findings) >= 1
    assert report.claim_findings[0].source_span.paragraph == 1
    assert report.trust_summary.uncertainty_policy.startswith("DraftLens reports")
    assert "critic" in report.review_trace.passes
    assert report.review_trace.status == "completed"


def test_pipeline_flags_claims_without_evidence_safely():
    request = ReviewRequest(
        submission_id="sub_risky",
        user_id="user_demo",
        title="Admissions Draft",
        text=(
            "My tutoring program improved district math outcomes by 48 percent in "
            "six months. I also created the largest student-led research archive in "
            "the region."
        ),
        citation_style="unknown",
        reference_entries=[],
        in_text_citations=[],
    )

    report = run_trust_review(request)

    assert report.trust_summary.unsupported_claims >= 1
    assert any(
        finding.verdict in {"unsupported", "uncertain"}
        for finding in report.claim_findings
    )
    assert any("not enough support" in note.lower() for note in report.trust_summary.safe_failure_notes)


def test_pipeline_does_not_verify_fake_doi():
    request = ReviewRequest(
        submission_id="sub_fake_doi",
        user_id="user_demo",
        title="Citation Trap",
        text=(
            "Remote tutoring always improves graduation rates by 42 percent. "
            "The citation looks official but should not be trusted.\n\n"
            "References\n\n"
            "Doe, J. (2024). Fake tutoring outcomes. Journal of Made Up Evidence. "
            "https://doi.org/10.0000/fake-doi"
        ),
        citation_style="apa",
        reference_entries=[
            "Doe, J. (2024). Fake tutoring outcomes. Journal of Made Up Evidence. "
            "https://doi.org/10.0000/fake-doi"
        ],
        in_text_citations=["(Doe, 2024)"],
    )

    report = run_trust_review(request)

    assert report.citation_verification[0].status == "not_found"
    assert report.citation_verification[0].confidence <= 20
    assert report.trust_summary.unsupported_claims >= 1
