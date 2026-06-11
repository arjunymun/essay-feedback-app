import { reviewServiceReportSchema } from "@/lib/analysis/report-schema";
import { env, flags } from "@/lib/env";
import type { EssayExtraction, EssayReport } from "@/lib/types";
import { AppError } from "@/lib/utils";

function reviewServiceHeaders() {
  const headers: HeadersInit = {
    "Content-Type": "application/json",
  };

  if (env.DRAFTLENS_REVIEW_SECRET) {
    headers["x-draftlens-review-secret"] = env.DRAFTLENS_REVIEW_SECRET;
  }

  return headers;
}

export function buildReviewServicePayload(
  submissionId: string,
  userId: string,
  extraction: EssayExtraction,
) {
  return {
    submissionId,
    userId,
    title: extraction.title,
    text: extraction.text,
    citationStyle: extraction.citationStyle,
    referenceEntries: extraction.referenceEntries.map((entry) => entry.raw),
    inTextCitations: extraction.inTextCitations,
  };
}

export async function generateTrustReportWithReviewService(
  submissionId: string,
  userId: string,
  extraction: EssayExtraction,
): Promise<EssayReport | null> {
  if (!flags.hasReviewService) {
    return null;
  }

  const response = await fetch(`${env.REVIEW_SERVICE_URL}/v1/reviews/analyze`, {
    method: "POST",
    headers: reviewServiceHeaders(),
    body: JSON.stringify(buildReviewServicePayload(submissionId, userId, extraction)),
  });

  const payload = (await response.json().catch(() => null)) as unknown;

  if (!response.ok) {
    throw new AppError("The trust review service could not analyze this document.", 502);
  }

  return reviewServiceReportSchema.parse(payload) as EssayReport;
}

export async function rewriteWithReviewService(excerpt: string) {
  if (!flags.hasReviewService) {
    return null;
  }

  const response = await fetch(`${env.REVIEW_SERVICE_URL}/v1/rewrite`, {
    method: "POST",
    headers: reviewServiceHeaders(),
    body: JSON.stringify({ excerpt }),
  });

  const payload = (await response.json().catch(() => null)) as
    | { rewrite?: unknown }
    | null;

  if (!response.ok || typeof payload?.rewrite !== "string") {
    throw new AppError("The trust rewrite service could not revise this passage.", 502);
  }

  return payload.rewrite.trim() || null;
}
