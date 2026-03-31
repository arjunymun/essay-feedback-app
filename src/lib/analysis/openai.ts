import OpenAI from "openai";
import { zodTextFormat } from "openai/helpers/zod";

import { aiEssayAnalysisSchema } from "@/lib/analysis/report-schema";
import { env, flags } from "@/lib/env";
import type { EssayExtraction, RewriteSuggestion } from "@/lib/types";

const analysisPrompt = `You are an academic writing coach for student essays.
Return only structured data.
Score the writing on thesis, organization, evidence, grammar_style, and citation_quality.
Do not encourage cheating, detector evasion, or fabricated sources.
For rewrite suggestions, preserve the student's ideas and make the wording sound clearer, more natural, and more human.
Do not invent facts, citations, or claims.`;

const rewritePrompt = `You are helping a student revise one passage from an essay.
Keep the meaning, evidence, and ownership intact.
Make the language more natural, direct, and readable.
Do not add facts or citations.
Return only the revised passage.`;

function createClient() {
  return new OpenAI({ apiKey: env.OPENAI_API_KEY });
}

export async function generateEssayAnalysisWithOpenAI(extraction: EssayExtraction) {
  if (!flags.hasOpenAI) {
    return null;
  }

  const client = createClient();
  const response = await client.responses.parse({
    model: env.OPENAI_MODEL,
    reasoning: { effort: "minimal" },
    input: `${analysisPrompt}

Essay title: ${extraction.title}
Word count: ${extraction.wordCount}
Detected citation style: ${extraction.citationStyle}
Reference count: ${extraction.referenceEntries.length}
In-text citation count: ${extraction.inTextCitations.length}

Essay:
${extraction.text}`,
    text: {
      format: zodTextFormat(aiEssayAnalysisSchema, "essay_analysis"),
      verbosity: "medium",
    },
  });

  return response.output_parsed;
}

export async function rewriteExcerptWithOpenAI(excerpt: string) {
  if (!flags.hasOpenAI) {
    return null;
  }

  const client = createClient();
  const response = await client.responses.create({
    model: env.OPENAI_MODEL,
    reasoning: { effort: "minimal" },
    input: `${rewritePrompt}

Passage:
${excerpt}`,
    text: {
      verbosity: "low",
    },
  });

  return response.output_text.trim() || null;
}

export function buildFallbackRewrite(excerpt: string): RewriteSuggestion {
  const improvedVersion = excerpt
    .replace(/\s+/g, " ")
    .replace(/\s*;\s*/g, ". ")
    .replace(/\s*,\s*/g, ", ")
    .replace(/\butilize\b/gi, "use")
    .replace(/\bin order to\b/gi, "to")
    .trim();

  return {
    originalExcerpt: excerpt,
    improvedVersion,
    rationale: "The revision trims filler phrasing and keeps the sentence closer to natural spoken rhythm.",
  };
}
