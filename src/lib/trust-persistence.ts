import { createHash } from "node:crypto";

import type { SupabaseClient } from "@supabase/supabase-js";

import { generateEmbeddings, type EmbeddingProvider } from "@/lib/embeddings";
import type {
  ClaimEvidence,
  ClaimFinding,
  EssayExtraction,
  EssayReport,
  ReviewTraceStep,
} from "@/lib/types";
import { compactText } from "@/lib/utils";

type ParagraphAnchor = {
  index: number;
  content: string;
  startOffset: number;
  endOffset: number;
};

type TrustPersistenceInput = {
  userId: string;
  submissionId: string;
  reviewJobId: string | null;
  extraction: EssayExtraction;
  report: EssayReport;
  embeddingProvider?: EmbeddingProvider;
};

type PlannedClaim = {
  externalId: string;
  row: Record<string, unknown>;
};

type PlannedEvidenceSource = {
  externalId: string;
  claimExternalId: string;
  row: Record<string, unknown>;
};

type PlannedClaimEvidence = {
  claimExternalId: string;
  evidenceExternalId: string;
  verdict: "supports" | "partially_supports" | "contradicts" | "insufficient";
  confidence: number;
  quote: string | null;
  notes: string;
};

export type TrustPersistencePlan = {
  document: Record<string, unknown>;
  sections: Array<Record<string, unknown> & { section_index: number }>;
  chunks: Array<Record<string, unknown> & { sectionIndex: number | null }>;
  claims: PlannedClaim[];
  evidenceSources: PlannedEvidenceSource[];
  claimEvidence: PlannedClaimEvidence[];
  reviewReport: Record<string, unknown>;
  agentTrace: Record<string, unknown> | null;
  modelUsageEvents: Record<string, unknown>[];
};

function hashText(text: string) {
  return createHash("sha256").update(text, "utf8").digest("hex");
}

function splitParagraphs(text: string): ParagraphAnchor[] {
  const normalized = compactText(text);
  const parts = normalized.split(/\n{2,}/).map((entry) => entry.trim()).filter(Boolean);
  let cursor = 0;

  return parts.map((content, index) => {
    const startOffset = normalized.indexOf(content, cursor);
    const safeStart = startOffset >= 0 ? startOffset : cursor;
    const endOffset = safeStart + content.length;
    cursor = endOffset;

    return {
      index: index + 1,
      content,
      startOffset: safeStart,
      endOffset,
    };
  });
}

function toChunkRows(userId: string, paragraphs: ParagraphAnchor[]) {
  return paragraphs
    .filter((paragraph) => paragraph.content.length >= 24)
    .map((paragraph, index) => ({
      user_id: userId,
      sectionIndex: paragraph.index,
      chunk_index: index + 1,
      page_start: 1,
      page_end: 1,
      paragraph_start: paragraph.index,
      paragraph_end: paragraph.index,
      start_offset: paragraph.startOffset,
      end_offset: paragraph.endOffset,
      content: paragraph.content,
      embedding: null,
      metadata: {
        anchor: {
          page: 1,
          paragraph: paragraph.index,
          startOffset: paragraph.startOffset,
          endOffset: paragraph.endOffset,
        },
        retrievalStatus: "embedding_pending",
      },
    }));
}

function evidenceVerdictForFinding(finding: ClaimFinding): PlannedClaimEvidence["verdict"] {
  if (finding.verdict === "supported") {
    return "supports";
  }

  if (finding.verdict === "partially_supported") {
    return "partially_supports";
  }

  return "insufficient";
}

function evidenceSourceType(evidence: ClaimEvidence) {
  return evidence.sourceType;
}

function usageEventFromStep(
  userId: string,
  reviewJobId: string,
  step: ReviewTraceStep,
  estimatedCostUsd: number | null | undefined,
) {
  return {
    user_id: userId,
    review_job_id: reviewJobId,
    provider: step.model === "trust_policy" ? "draftlens" : "openai",
    model: step.model ?? "deterministic",
    step_name: step.name,
    input_tokens: 0,
    output_tokens: 0,
    latency_ms: step.latencyMs ?? null,
    estimated_cost_usd: estimatedCostUsd
      ? Number((estimatedCostUsd / Math.max(1, 1)).toFixed(6))
      : 0,
  };
}

export function buildTrustPersistencePlan({
  userId,
  submissionId,
  reviewJobId,
  extraction,
  report,
}: TrustPersistenceInput): TrustPersistencePlan {
  const normalizedText = compactText(extraction.text);
  const paragraphs = splitParagraphs(normalizedText);
  const trustScore = report.trustSummary?.overallTrustScore ?? null;

  const sections = paragraphs.map((paragraph) => ({
    user_id: userId,
    heading:
      /^(references|works cited|bibliography)$/i.test(paragraph.content)
        ? paragraph.content
        : null,
    section_index: paragraph.index,
    start_offset: paragraph.startOffset,
    end_offset: paragraph.endOffset,
  }));

  const chunks = toChunkRows(userId, paragraphs);

  const claims: PlannedClaim[] =
    report.claimFindings?.map((finding) => ({
      externalId: finding.id,
      row: {
        user_id: userId,
        claim_text: finding.claim,
        support_required: finding.needsEvidence,
        risk_level: finding.riskLevel,
        source_span: finding.sourceSpan,
        verdict: finding.verdict,
        confidence: finding.confidence,
        uncertainty: finding.uncertainty,
        recommendation: finding.recommendation,
      },
    })) ?? [];

  const evidenceSources: PlannedEvidenceSource[] = [];
  const claimEvidence: PlannedClaimEvidence[] = [];

  report.claimFindings?.forEach((finding) => {
    finding.evidence.forEach((evidence, index) => {
      const externalId = `${finding.id}_evidence_${index + 1}`;
      evidenceSources.push({
        externalId,
        claimExternalId: finding.id,
        row: {
          user_id: userId,
          source_type: evidenceSourceType(evidence),
          title: evidence.title,
          url: evidence.url ?? null,
          source_identifier: evidence.url ?? `${finding.id}:${index + 1}`,
          metadata: {
            quote: evidence.quote ?? null,
            notes: evidence.notes,
            confidence: evidence.confidence,
            claimId: finding.id,
          },
        },
      });
      claimEvidence.push({
        claimExternalId: finding.id,
        evidenceExternalId: externalId,
        verdict: evidenceVerdictForFinding(finding),
        confidence: evidence.confidence,
        quote: evidence.quote ?? null,
        notes: evidence.notes,
      });
    });
  });

  return {
    document: {
      user_id: userId,
      submission_id: submissionId,
      normalized_text_hash: hashText(normalizedText),
      title: extraction.title,
      metadata: {
        wordCount: extraction.wordCount,
        citationStyle: extraction.citationStyle,
        referenceCount: extraction.referenceEntries.length,
        inTextCitationCount: extraction.inTextCitations.length,
        retention: "source_file_deleted_after_processing",
      },
    },
    sections,
    chunks,
    claims,
    evidenceSources,
    claimEvidence,
    reviewReport: {
      user_id: userId,
      submission_id: submissionId,
      review_job_id: reviewJobId,
      report_json: report,
      trust_score: trustScore,
    },
    agentTrace:
      reviewJobId && report.reviewTrace
        ? {
            user_id: userId,
            review_job_id: reviewJobId,
            provider_trace_id: report.reviewTrace.traceId ?? null,
            summary: report.reviewTrace,
            raw_trace_retained: false,
          }
        : null,
    modelUsageEvents:
      reviewJobId && report.reviewTrace
        ? report.reviewTrace.steps.map((step) =>
            usageEventFromStep(
              userId,
              reviewJobId,
              step,
              report.reviewTrace?.estimatedCostUsd,
            ),
          )
        : [],
  };
}

async function insertIfAny(
  client: SupabaseClient,
  table: string,
  rows: Record<string, unknown>[],
) {
  if (!rows.length) {
    return [];
  }

  const { data, error } = await client.from(table).insert(rows).select("*");
  if (error) {
    throw new Error(error.message);
  }

  return data ?? [];
}

export async function persistTrustReviewArtifacts(
  client: SupabaseClient,
  input: TrustPersistenceInput,
) {
  const plan = buildTrustPersistencePlan(input);
  const embeddingProvider = input.embeddingProvider ?? generateEmbeddings;

  // Upsert the document first so a crash later leaves the submission in a
  // degraded-but-recoverable state rather than completely blank.
  const { data: document, error: documentError } = await client
    .from("documents")
    .upsert(plan.document, { onConflict: "submission_id" })
    .select("*")
    .single();

  if (documentError || !document) {
    throw new Error(documentError?.message ?? "Could not persist reviewed document.");
  }

  // Delete stale child records by document id now that the document is safe.
  // document_chunks and claims both have ON DELETE CASCADE from documents,
  // but we delete them explicitly here since we're upserting (not deleting) the parent.
  const documentId = String(document.id);
  await client.from("document_chunks").delete().eq("document_id", documentId);
  await client.from("document_sections").delete().eq("document_id", documentId);
  await client.from("claims").delete().eq("document_id", documentId);

  if (input.reviewJobId) {
    await client.from("agent_traces").delete().eq("review_job_id", input.reviewJobId);
    await client
      .from("model_usage_events")
      .delete()
      .eq("review_job_id", input.reviewJobId);
  }
  const sectionRows = plan.sections.map((section) => ({
    ...section,
    document_id: documentId,
  }));
  const sections = await insertIfAny(client, "document_sections", sectionRows);
  const sectionIdsByIndex = new Map(
    sections.map((section) => [Number(section.section_index), String(section.id)]),
  );

  const chunkRows: Array<
    Record<string, unknown> & {
      content: string;
      metadata: Record<string, unknown>;
    }
  > = plan.chunks.map((chunk) => {
    const sectionIndex = chunk.sectionIndex;
    const row = { ...chunk } as Record<string, unknown>;
    delete row.sectionIndex;

    return {
      ...row,
      content: String(row.content ?? ""),
      metadata: (row.metadata as Record<string, unknown>) ?? {},
      document_id: documentId,
      section_id: sectionIndex ? sectionIdsByIndex.get(sectionIndex) ?? null : null,
    };
  });
  const embeddings = await embeddingProvider(chunkRows.map((chunk) => String(chunk.content)))
    .catch(() => null);

  await insertIfAny(
    client,
    "document_chunks",
    chunkRows.map((chunk, index) => ({
      ...chunk,
      embedding: embeddings?.[index] ?? null,
      metadata: {
        ...(chunk.metadata as Record<string, unknown>),
        retrievalStatus: embeddings?.[index] ? "embedded" : "embedding_unavailable",
      },
    })),
  );

  const insertedClaims = await insertIfAny(
    client,
    "claims",
    plan.claims.map((claim) => ({
      ...claim.row,
      document_id: documentId,
    })),
  );
  const claimIdsByExternalId = new Map(
    plan.claims.map((claim, index) => [
      claim.externalId,
      insertedClaims[index]?.id ? String(insertedClaims[index].id) : null,
    ]),
  );

  const insertedEvidence = await insertIfAny(
    client,
    "evidence_sources",
    plan.evidenceSources.map((source) => source.row),
  );
  const evidenceIdsByExternalId = new Map(
    plan.evidenceSources.map((source, index) => [
      source.externalId,
      insertedEvidence[index]?.id ? String(insertedEvidence[index].id) : null,
    ]),
  );

  const claimEvidenceRows: Record<string, unknown>[] = [];
  plan.claimEvidence.forEach((entry) => {
    const claimId = claimIdsByExternalId.get(entry.claimExternalId);
    const evidenceId = evidenceIdsByExternalId.get(entry.evidenceExternalId);

    if (!claimId || !evidenceId) {
      return;
    }

    claimEvidenceRows.push({
      user_id: input.userId,
      claim_id: claimId,
      evidence_source_id: evidenceId,
      verdict: entry.verdict,
      confidence: entry.confidence,
      quote: entry.quote,
      notes: entry.notes,
    });
  });

  await insertIfAny(client, "claim_evidence", claimEvidenceRows);

  // Insert new report before deleting old ones — a crash before the delete
  // leaves a stale row but never a missing row.
  const insertedReports = await insertIfAny(client, "review_reports", [plan.reviewReport]);
  const newReportId = insertedReports[0]?.id ? String(insertedReports[0].id) : null;
  if (newReportId) {
    await client
      .from("review_reports")
      .delete()
      .eq("submission_id", input.submissionId)
      .neq("id", newReportId);
  }

  if (plan.agentTrace) {
    await insertIfAny(client, "agent_traces", [plan.agentTrace]);
  }

  await insertIfAny(client, "model_usage_events", plan.modelUsageEvents);

  return {
    documentId,
    claimCount: insertedClaims.length,
    evidenceCount: insertedEvidence.length,
  };
}
