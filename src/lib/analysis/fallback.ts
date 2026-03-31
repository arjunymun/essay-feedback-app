import { SCORE_LABELS } from "@/lib/constants";
import type { EssayExtraction, RubricScore } from "@/lib/types";
import { clamp } from "@/lib/utils";

function sentenceCount(text: string) {
  return text.split(/[.!?]+/).filter((entry) => entry.trim().length > 0).length;
}

function paragraphCount(text: string) {
  return text.split(/\n{2,}/).filter((entry) => entry.trim().length > 0).length;
}

function findLongSentences(text: string) {
  return text
    .split(/(?<=[.!?])\s+/)
    .map((entry) => entry.trim())
    .filter((entry) => entry.length > 130)
    .slice(0, 3);
}

function shortenSentence(sentence: string) {
  return sentence
    .replace(/\s*,\s*/g, ", ")
    .replace(/\s*;\s*/g, ". ")
    .replace(/\s+which\s+/gi, " and ")
    .replace(/\s+that\s+/gi, " ")
    .trim();
}

export function buildFallbackEssayReport(extraction: EssayExtraction) {
  const paragraphs = paragraphCount(extraction.text);
  const sentences = Math.max(1, sentenceCount(extraction.text));
  const averageSentenceLength = extraction.wordCount / sentences;
  const evidenceDensity =
    extraction.referenceEntries.length + extraction.inTextCitations.length;
  const thesisScore = clamp(
    55 +
      (/\b(i argue|this essay|this paper|in this essay|the central claim)\b/i.test(
        extraction.text,
      )
        ? 18
        : 0) +
      (paragraphs >= 4 ? 8 : 0),
    42,
    88,
  );
  const organizationScore = clamp(48 + paragraphs * 6, 40, 90);
  const evidenceScore = clamp(45 + evidenceDensity * 4, 35, 92);
  const grammarStyleScore = clamp(
    78 - Math.max(averageSentenceLength - 22, 0) * 1.4,
    48,
    90,
  );

  const rubric: RubricScore[] = [
    {
      key: "thesis",
      label: SCORE_LABELS.thesis,
      score: Math.round(thesisScore),
      summary:
        thesisScore >= 70
          ? "The essay points toward a clear central claim."
          : "The paper would benefit from a sharper, earlier thesis statement.",
    },
    {
      key: "organization",
      label: SCORE_LABELS.organization,
      score: Math.round(organizationScore),
      summary:
        organizationScore >= 70
          ? "The structure is readable and mostly easy to follow."
          : "Paragraph transitions and sequencing need more signposting.",
    },
    {
      key: "evidence",
      label: SCORE_LABELS.evidence,
      score: Math.round(evidenceScore),
      summary:
        evidenceScore >= 70
          ? "The essay uses supporting material in a reasonably consistent way."
          : "Add more concrete evidence and explain how each source supports the claim.",
    },
    {
      key: "grammar_style",
      label: SCORE_LABELS.grammar_style,
      score: Math.round(grammarStyleScore),
      summary:
        grammarStyleScore >= 72
          ? "The prose is generally clear, with a few areas to tighten."
          : "Several sentences are too long or indirect, which blunts clarity.",
    },
    {
      key: "citation_quality",
      label: SCORE_LABELS.citation_quality,
      score: 58,
      summary:
        extraction.referenceEntries.length > 0
          ? "Some references were found, but they still need source-level validation."
          : "The essay does not clearly separate a reference list for citation checking.",
    },
  ];

  const rewriteSuggestions = findLongSentences(extraction.text).map((sentence) => ({
    originalExcerpt: sentence,
    improvedVersion: shortenSentence(sentence),
    rationale: "Shorter, more direct phrasing usually sounds more natural and easier to trust.",
  }));

  return {
    summary:
      "This draft shows a workable argument, but the next improvement should focus on tightening structure, backing claims with clearer evidence, and smoothing sentence-level phrasing.",
    strengths: [
      "The essay contains enough material to identify a central direction and likely purpose.",
      "There is visible source usage or citation intent, which gives the analysis something concrete to build on.",
      "The draft already has enough structure to support focused revision instead of a complete rewrite.",
    ],
    highestPriorityFixes: [
      "State the central claim more directly in the opening section.",
      "Follow evidence with a sentence that explains why it matters to the argument.",
      "Break up long, multi-clause sentences into clearer claims.",
    ],
    rubric,
    rewriteSuggestions,
    citationStyle: extraction.citationStyle,
  };
}
