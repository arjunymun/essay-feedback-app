import { describe, expect, it } from "vitest";

import { buildTrustPersistencePlan } from "@/lib/trust-persistence";
import type { EssayExtraction, EssayReport } from "@/lib/types";

const extraction: EssayExtraction = {
  title: "Evidence Review Draft",
  text: `This essay argues that coastal cities should begin adaptation planning earlier.

Delayed planning creates higher long-term costs and weakens public trust.

References

Smith, J. (2023). Resilient shorelines. Journal of Climate Policy.`,
  wordCount: 26,
  citationStyle: "apa",
  referenceEntries: [
    {
      raw: "Smith, J. (2023). Resilient shorelines. Journal of Climate Policy.",
      cleaned: "Smith, J. (2023). Resilient shorelines. Journal of Climate Policy.",
      titleHint: "Resilient shorelines",
      yearHint: 2023,
    },
  ],
  inTextCitations: ["(Smith, 2023)"],
  excerpt: "This essay argues that coastal cities should begin adaptation planning earlier.",
};

const report: EssayReport = {
  summary: "DraftLens found one claim that needs stronger evidence.",
  overallScore: 76,
  citationStyle: "apa",
  rubric: [
    { key: "thesis", label: "Thesis", score: 80, summary: "Clear thesis." },
    { key: "organization", label: "Organization", score: 78, summary: "Readable structure." },
    { key: "evidence", label: "Evidence", score: 64, summary: "Evidence needs work." },
    { key: "grammar_style", label: "Grammar & Style", score: 84, summary: "Clear prose." },
    { key: "citation_quality", label: "Citation Quality", score: 70, summary: "Some metadata." },
  ],
  strengths: ["The document has a visible claim."],
  highestPriorityFixes: ["Add direct evidence for the cost claim."],
  rewriteSuggestions: [],
  citationVerification: [
    {
      entry: "Smith, J. (2023). Resilient shorelines. Journal of Climate Policy.",
      status: "possible_match",
      confidence: 64,
      source: "openalex",
      title: "Resilient shorelines",
      year: 2023,
      notes: "Plausible metadata.",
    },
  ],
  trustSummary: {
    overallTrustScore: 58,
    supportedClaims: 0,
    partiallySupportedClaims: 1,
    unsupportedClaims: 0,
    uncertainClaims: 0,
    safeFailureNotes: ["Evidence is partial."],
    uncertaintyPolicy:
      "DraftLens reports weak or missing evidence instead of inventing support.",
  },
  claimFindings: [
    {
      id: "claim_1",
      claim: "Delayed planning creates higher long-term costs and weakens public trust.",
      verdict: "partially_supported",
      confidence: 62,
      riskLevel: "medium",
      needsEvidence: true,
      uncertainty: "Evidence is present but partial.",
      sourceSpan: { page: 1, paragraph: 2, startOffset: 78, endOffset: 148 },
      evidence: [
        {
          title: "Document paragraph 2",
          sourceType: "document_chunk",
          confidence: 62,
          quote: "Delayed planning creates higher long-term costs and weakens public trust.",
          notes: "Local context repeats the claim.",
        },
      ],
      recommendation: "Add direct support.",
    },
  ],
  reviewTrace: {
    workflowName: "trust_first_review",
    status: "completed",
    traceId: "trace_test",
    passes: ["ingestion", "claim_extraction", "verification", "critic"],
    totalLatencyMs: 420,
    estimatedCostUsd: 0.03,
    steps: [
      {
        name: "verification",
        status: "completed",
        latencyMs: 120,
        model: "deterministic",
      },
    ],
  },
};

describe("trust persistence plan", () => {
  it("maps report artifacts into provenance rows without storing raw files", () => {
    const plan = buildTrustPersistencePlan({
      userId: "user_1",
      submissionId: "sub_1",
      reviewJobId: "job_1",
      extraction,
      report,
    });

    expect(plan.document.title).toBe("Evidence Review Draft");
    expect(plan.sections.length).toBeGreaterThanOrEqual(2);
    expect(plan.chunks.length).toBeGreaterThanOrEqual(2);
    expect(plan.claims).toHaveLength(1);
    expect(plan.evidenceSources).toHaveLength(1);
    expect(plan.claimEvidence[0]).toMatchObject({
      claimExternalId: "claim_1",
      verdict: "partially_supports",
      confidence: 62,
    });
    expect(plan.reviewReport.trust_score).toBe(58);
    expect(plan.agentTrace?.provider_trace_id).toBe("trace_test");
    expect(plan.modelUsageEvents[0]).toMatchObject({
      step_name: "verification",
      model: "deterministic",
    });
  });
});
