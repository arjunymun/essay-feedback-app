from __future__ import annotations

import json
from pathlib import Path
from statistics import mean
from typing import Any

from .pipeline import run_trust_review
from .schemas import ReviewRequest


def _load_cases(cases_path: Path) -> list[dict[str, Any]]:
    return [
        json.loads(line)
        for line in cases_path.read_text(encoding="utf-8").splitlines()
        if line.strip()
    ]


def _reference_entries_from_text(text: str) -> list[str]:
    parts = re_split_references(text)
    if len(parts) < 2:
        return []
    return [
        entry.strip()
        for entry in parts[1].splitlines()
        if len(entry.strip()) >= 3 and not entry.strip().lower().startswith("references")
    ]


def re_split_references(text: str) -> list[str]:
    marker = "\n\nReferences\n\n"
    if marker in text:
        return text.split(marker, 1)
    marker = "\nReferences\n"
    if marker in text:
        return text.split(marker, 1)
    return [text]


def _case_passed(report, expected: dict[str, Any]) -> tuple[bool, list[str]]:
    failures: list[str] = []
    unsupported_count = report.trust_summary.unsupported_claims
    uncertain_count = report.trust_summary.uncertain_claims

    if unsupported_count < expected.get("min_unsupported_claims", 0):
        failures.append("unsupported_claim_recall")

    if (uncertain_count + unsupported_count) < expected.get("min_uncertain_claims", 0):
        failures.append("uncertainty_recall")

    if report.trust_summary.overall_trust_score > expected.get("max_trust_score", 100):
        failures.append("overconfident_trust_score")

    expected_statuses = expected.get("citation_statuses", [])
    if expected_statuses:
        actual_statuses = [entry.status for entry in report.citation_verification]
        for status in expected_statuses:
            if status not in actual_statuses:
                failures.append(f"missing_citation_status:{status}")

    if expected.get("must_have_safe_failure_note") and not report.trust_summary.safe_failure_notes:
        failures.append("missing_safe_failure_note")

    if expected.get("must_label_rewrites_optional"):
        if any("optional" not in suggestion.rationale.lower() for suggestion in report.rewrite_suggestions):
            failures.append("rewrite_not_optional")

    schema_valid = bool(report.summary and report.review_trace.status == "completed")
    if not schema_valid:
        failures.append("schema_or_trace_invalid")

    return not failures, failures


def run_benchmark(cases_path: Path) -> dict[str, object]:
    cases = _load_cases(cases_path)
    results: list[dict[str, object]] = []
    for case in cases:
        request_payload = dict(case["request"])
        request_payload.setdefault(
            "referenceEntries",
            _reference_entries_from_text(str(request_payload.get("text", ""))),
        )
        request = ReviewRequest(**request_payload)
        report = run_trust_review(request)
        expected = case["expected"]
        passed, failures = _case_passed(report, expected)
        results.append(
            {
                "id": case["id"],
                "type": case.get("type", "unspecified"),
                "passed": passed,
                "failures": failures,
                "unsupportedClaims": report.trust_summary.unsupported_claims,
                "uncertainClaims": report.trust_summary.uncertain_claims,
                "overallTrustScore": report.trust_summary.overall_trust_score,
                "citationStatuses": [
                    entry.status for entry in report.citation_verification
                ],
                "traceId": report.review_trace.trace_id,
                "latencyMs": report.review_trace.total_latency_ms,
                "estimatedCostUsd": report.review_trace.estimated_cost_usd or 0,
            }
        )

    passed_count = sum(1 for result in results if result["passed"])
    unsupported_cases = [
        result for result in results if result["unsupportedClaims"] or result["uncertainClaims"]
    ]
    return {
        "summary": {
            "caseCount": len(results),
            "passed": passed_count,
            "passRate": round(passed_count / max(1, len(results)), 3),
            "endToEndSuccessRate": round(passed_count / max(1, len(results)), 3),
            "unsupportedFlaggingRate": round(
                len(unsupported_cases) / max(1, len(results)),
                3,
            ),
            "averageTrustScore": round(
                mean(float(result["overallTrustScore"]) for result in results),
                2,
            ),
            "averageLatencyMs": round(
                mean(float(result["latencyMs"] or 0) for result in results),
                2,
            ),
            "costPerReviewedDocument": round(
                mean(float(result["estimatedCostUsd"]) for result in results),
                6,
            ),
        },
        "cases": results,
    }


def main() -> None:
    root = next(
        (
            candidate
            for candidate in [Path.cwd(), *Path(__file__).resolve().parents]
            if (candidate / "benchmarks/cases/trust_first_smoke.jsonl").exists()
        ),
        Path.cwd(),
    )
    cases_path = root / "benchmarks/cases/trust_first_smoke.jsonl"
    print(json.dumps(run_benchmark(cases_path), indent=2))


if __name__ == "__main__":
    main()
