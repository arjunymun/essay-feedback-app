import { buildFallbackEssayReport } from "@/lib/analysis/fallback";
import { generateEssayAnalysisWithOpenAI } from "@/lib/analysis/openai";
import {
  buildCitationAwareReport,
  normalizeRubricEntries,
} from "@/lib/analysis/report-schema";
import { verifyCitationEntries } from "@/lib/analysis/citations";
import type { EssayExtraction, EssayReport } from "@/lib/types";

export async function generateEssayReport(
  extraction: EssayExtraction,
): Promise<EssayReport> {
  const aiReport = await generateEssayAnalysisWithOpenAI(extraction).catch(
    () => null,
  );

  const citationVerification = await verifyCitationEntries(
    extraction.referenceEntries,
  );

  const baseReport = aiReport
    ? {
        summary: aiReport.summary,
        strengths: aiReport.strengths,
        highestPriorityFixes: aiReport.highestPriorityFixes,
        rewriteSuggestions: aiReport.rewriteSuggestions,
        rubric: normalizeRubricEntries(aiReport.rubric),
        citationStyle: extraction.citationStyle,
      }
    : buildFallbackEssayReport(extraction);

  return buildCitationAwareReport(
    baseReport,
    extraction.citationStyle,
    citationVerification,
    extraction.inTextCitations.length,
  );
}
