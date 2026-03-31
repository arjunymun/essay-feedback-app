import { z } from "zod";

import { SCORE_KEYS, SCORE_LABELS } from "@/lib/constants";
import type { EssayReport, RubricScore } from "@/lib/types";
import {
  buildCitationSummary,
  calculateCitationQualityScore,
} from "@/lib/analysis/citations";
import { average } from "@/lib/utils";

const scoreKeySchema = z.enum(SCORE_KEYS);

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
