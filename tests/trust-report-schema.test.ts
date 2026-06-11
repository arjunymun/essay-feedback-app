import { describe, expect, it } from "vitest";

import { trustReportExtensionSchema } from "@/lib/analysis/report-schema";

describe("trust-first report extension schema", () => {
  it("accepts claim-level provenance and trace data", () => {
    const parsed = trustReportExtensionSchema.parse({
      trustSummary: {
        overallTrustScore: 76,
        supportedClaims: 2,
        partiallySupportedClaims: 1,
        unsupportedClaims: 1,
        uncertainClaims: 1,
        safeFailureNotes: [
          "One claim could not be verified with available document evidence.",
        ],
        uncertaintyPolicy:
          "DraftLens reports missing support instead of inventing evidence.",
      },
      claimFindings: [
        {
          id: "claim_1",
          claim:
            "Coastal cities should begin adaptation planning before flood damage compounds.",
          verdict: "partially_supported",
          confidence: 68,
          riskLevel: "medium",
          needsEvidence: true,
          uncertainty:
            "The draft gives policy context but does not include a direct source for the cost claim.",
          sourceSpan: {
            page: 1,
            paragraph: 2,
            startOffset: 24,
            endOffset: 118,
          },
          evidence: [
            {
              title: "Essay paragraph 2",
              sourceType: "document_chunk",
              confidence: 62,
              quote:
                "Cities should begin adaptation planning earlier than they currently do.",
              notes: "Local document evidence only; external support still needed.",
            },
          ],
          recommendation:
            "Add a source that directly supports the timing and cost comparison.",
        },
      ],
      reviewTrace: {
        workflowName: "trust_first_review",
        status: "completed",
        traceId: "trace_demo",
        passes: ["ingestion", "planning", "claim_extraction", "verification", "critic"],
        totalLatencyMs: 1320,
        estimatedCostUsd: 0.04,
        steps: [
          {
            name: "claim_extraction",
            status: "completed",
            latencyMs: 220,
            model: "deterministic",
          },
        ],
      },
    });

    expect(parsed.trustSummary.overallTrustScore).toBe(76);
    expect(parsed.claimFindings[0]?.verdict).toBe("partially_supported");
    expect(parsed.reviewTrace.passes).toContain("critic");
  });

  it("rejects overconfident invalid claim verdicts", () => {
    expect(() =>
      trustReportExtensionSchema.parse({
        trustSummary: {
          overallTrustScore: 101,
          supportedClaims: 0,
          partiallySupportedClaims: 0,
          unsupportedClaims: 0,
          uncertainClaims: 0,
          safeFailureNotes: [],
          uncertaintyPolicy: "Invalid",
        },
        claimFindings: [
          {
            id: "claim_1",
            claim: "A claim",
            verdict: "definitely_true",
            confidence: 120,
            riskLevel: "extreme",
            needsEvidence: true,
            uncertainty: "Invalid",
            sourceSpan: {},
            evidence: [],
            recommendation: "Invalid",
          },
        ],
        reviewTrace: {
          workflowName: "trust_first_review",
          status: "completed",
          passes: [],
          steps: [],
        },
      }),
    ).toThrow();
  });
});
