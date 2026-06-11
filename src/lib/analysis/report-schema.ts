import { z } from "zod";

import { SCORE_KEYS, SCORE_LABELS } from "@/lib/constants";
import type { EssayReport, RubricScore } from "@/lib/types";
import {
  buildCitationSummary,
  calculateCitationQualityScore,
} from "@/lib/analysis/citations";
import { average } from "@/lib/utils";

const scoreKeySchema = z.enum(SCORE_KEYS);
const claimVerdictSchema = z.enum([
  "supported",
  "partially_supported",
  "unsupported",
  "uncertain",
  "not_applicable",
]);
const trustRiskLevelSchema = z.enum(["low", "medium", "high"]);
const reviewTraceStepStatusSchema = z.enum(["completed", "failed", "skipped"]);

export const aiEssayAnalysisSchema = z.object({
  summary: z.string().min(20).max(400),
  strengths: z.array(z.string().min(8).max(180)).min(2).max(4),
  highestPriorityFixes: z.array(z.string().min(8).max(180)).min(2).max(5),
  rubric: z
    .array(
      z.object({
        key: scoreKeySchema,
        score: z.number().int().min(0).max(100),
        summary: z.string().min(8).max(220),
      }),
    )
    .length(5),
  rewriteSuggestions: z
    .array(
      z.object({
        originalExcerpt: z.string().min(12).max(500),
        improvedVersion: z.string().min(12).max(500),
        rationale: z.string().min(8).max(180),
      }),
    )
    .max(4),
});

export type AiEssayAnalysis = z.infer<typeof aiEssayAnalysisSchema>;

export const trustReportExtensionSchema = z.object({
  trustSummary: z.object({
    overallTrustScore: z.number().int().min(0).max(100),
    supportedClaims: z.number().int().min(0),
    partiallySupportedClaims: z.number().int().min(0),
    unsupportedClaims: z.number().int().min(0),
    uncertainClaims: z.number().int().min(0),
    safeFailureNotes: z.array(z.string().min(4).max(260)).max(8),
    uncertaintyPolicy: z.string().min(12).max(260),
  }),
  claimFindings: z
    .array(
      z.object({
        id: z.string().min(3).max(80),
        claim: z.string().min(8).max(700),
        verdict: claimVerdictSchema,
        confidence: z.number().int().min(0).max(100),
        riskLevel: trustRiskLevelSchema,
        needsEvidence: z.boolean(),
        uncertainty: z.string().min(8).max(360),
        sourceSpan: z.object({
          page: z.number().int().min(1).nullable().optional(),
          paragraph: z.number().int().min(1).nullable().optional(),
          startOffset: z.number().int().min(0).nullable().optional(),
          endOffset: z.number().int().min(0).nullable().optional(),
        }),
        evidence: z
          .array(
            z.object({
              title: z.string().min(2).max(240),
              sourceType: z.enum([
                "document_chunk",
                "crossref",
                "openalex",
                "user_reference",
                "none",
              ]),
              confidence: z.number().int().min(0).max(100),
              quote: z.string().max(600).nullable().optional(),
              url: z.string().url().nullable().optional(),
              notes: z.string().min(4).max(360),
            }),
          )
          .max(8),
        recommendation: z.string().min(8).max(360),
      }),
    )
    .max(24),
  reviewTrace: z.object({
    workflowName: z.string().min(3).max(120),
    status: z.enum(["completed", "failed", "fallback"]),
    traceId: z.string().min(3).max(160).nullable().optional(),
    passes: z.array(z.string().min(2).max(80)).max(16),
    totalLatencyMs: z.number().int().min(0).nullable().optional(),
    estimatedCostUsd: z.number().min(0).nullable().optional(),
    steps: z
      .array(
        z.object({
          name: z.string().min(2).max(120),
          status: reviewTraceStepStatusSchema,
          latencyMs: z.number().int().min(0).nullable().optional(),
          model: z.string().max(120).nullable().optional(),
          notes: z.string().max(360).nullable().optional(),
        }),
      )
      .max(24),
  }),
});

export const reviewServiceReportSchema = z
  .object({
    summary: z.string().min(20).max(700),
    overallScore: z.number().int().min(0).max(100),
    citationStyle: z.enum(["apa", "mla", "unknown"]),
    strengths: z.array(z.string().min(8).max(220)).min(1).max(5),
    highestPriorityFixes: z.array(z.string().min(8).max(260)).min(1).max(6),
    rubric: z
      .array(
        z.object({
          key: scoreKeySchema,
          label: z.string().min(2).max(80),
          score: z.number().int().min(0).max(100),
          summary: z.string().min(8).max(260),
        }),
      )
      .length(5),
    rewriteSuggestions: z
      .array(
        z.object({
          originalExcerpt: z.string().min(1).max(700),
          improvedVersion: z.string().min(1).max(700),
          rationale: z.string().min(4).max(220),
        }),
      )
      .max(4),
    citationVerification: z.array(
      z.object({
        entry: z.string().min(1).max(900),
        status: z.enum(["matched", "possible_match", "not_found", "malformed"]),
        confidence: z.number().int().min(0).max(100),
        source: z.enum(["crossref", "openalex", "none"]),
        title: z.string().nullable().optional(),
        authors: z.string().nullable().optional(),
        year: z.number().int().nullable().optional(),
        url: z.string().url().nullable().optional(),
        notes: z.string().min(4).max(360),
      }),
    ),
  })
  .merge(trustReportExtensionSchema);

export function normalizeRubricEntries(
  rubric: AiEssayAnalysis["rubric"],
): RubricScore[] {
  const asMap = new Map(rubric.map((entry) => [entry.key, entry]));

  return SCORE_KEYS.map((key) => {
    const existing = asMap.get(key);
    return {
      key,
      label: SCORE_LABELS[key],
      score: existing?.score ?? 60,
      summary: existing?.summary ?? "Needs a closer manual review.",
    };
  });
}

export function buildCitationAwareReport(
  report: Omit<EssayReport, "citationVerification" | "overallScore"> & {
    rubric: RubricScore[];
  },
  citationStyle: EssayReport["citationStyle"],
  citationVerification: EssayReport["citationVerification"],
  inTextCitationCount: number,
) {
  const citationScore = calculateCitationQualityScore(
    citationVerification,
    inTextCitationCount,
  );
  const citationSummary = buildCitationSummary(citationVerification, citationStyle);

  const rubric = report.rubric.map((entry) =>
    entry.key === "citation_quality"
      ? {
          ...entry,
          score: citationScore,
          summary: citationSummary,
        }
      : entry,
  );

  return {
    ...report,
    rubric,
    citationVerification,
    overallScore: Math.round(average(rubric.map((entry) => entry.score))),
  };
}
