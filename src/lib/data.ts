import type { SupabaseClient } from "@supabase/supabase-js";

import { FREE_ANALYSIS_CREDITS } from "@/lib/constants";
import type {
  CreditLedgerEntry,
  CreditSummary,
  EssayReport,
  SubmissionRecord,
} from "@/lib/types";
import { AppError } from "@/lib/utils";

function asSubmissionRecord(row: unknown): SubmissionRecord {
  return row as SubmissionRecord;
}

export async function listUserSubmissions(
  client: SupabaseClient,
  userId: string,
) {
  const { data, error } = await client
    .from("submissions")
    .select("*")
    .eq("user_id", userId)
    .order("created_at", { ascending: false });

  if (error) {
    throw new AppError(error.message, 500);
  }

  return (data ?? []).map(asSubmissionRecord);
}

export async function getSubmissionForUser(
  client: SupabaseClient,
  submissionId: string,
  userId: string,
) {
  const { data, error } = await client
    .from("submissions")
    .select("*")
    .eq("id", submissionId)
    .eq("user_id", userId)
    .maybeSingle();

  if (error) {
    throw new AppError(error.message, 500);
  }

  return data ? asSubmissionRecord(data) : null;
}

export async function ensureSeedCredits(
  admin: SupabaseClient,
  userId: string,
) {
  const { data, error } = await admin
    .from("credit_ledger")
    .select("id")
    .eq("user_id", userId)
    .limit(1);

  if (error) {
    throw new AppError(error.message, 500);
  }

  if (!data?.length) {
    const { error: insertError } = await admin.from("credit_ledger").insert({
      user_id: userId,
      delta: FREE_ANALYSIS_CREDITS,
      kind: "seed",
      note: "Initial free analyses",
    });

    if (insertError) {
      throw new AppError(insertError.message, 500);
    }
  }
}

export async function getCreditSummary(
  client: SupabaseClient,
  userId: string,
): Promise<CreditSummary> {
  const { data, error } = await client
    .from("credit_ledger")
    .select("delta")
    .eq("user_id", userId);

  if (error) {
    throw new AppError(error.message, 500);
  }

  const deltas = (data ?? []).map((entry) => Number(entry.delta ?? 0));
  const totalAwarded = deltas.filter((value) => value > 0).reduce((a, b) => a + b, 0);
  const totalConsumed = Math.abs(
    deltas.filter((value) => value < 0).reduce((a, b) => a + b, 0),
  );

  return {
    remaining: deltas.reduce((a, b) => a + b, 0),
    totalAwarded,
    totalConsumed,
  };
}

export async function reserveCredit(
  admin: SupabaseClient,
  userId: string,
): Promise<CreditLedgerEntry> {
  await ensureSeedCredits(admin, userId);

  const summary = await getCreditSummary(admin, userId);
  if (summary.remaining <= 0) {
    throw new AppError(
      "You have used all free analyses for now. Join the pricing waitlist for phase 2 access.",
      402,
    );
  }

  const { data, error } = await admin
    .from("credit_ledger")
    .insert({
      user_id: userId,
      delta: -1,
      kind: "reserved",
      note: "Reserved for essay analysis",
    })
    .select("*")
    .single();

  if (error) {
    throw new AppError(error.message, 500);
  }

  return data as CreditLedgerEntry;
}

export async function createSubmissionRecord(
  admin: SupabaseClient,
  values: Partial<SubmissionRecord> & {
    user_id: string;
    title: string;
    file_name: string;
    mime_type: string;
    reserved_credit_entry_id: string;
  },
) {
  const { data, error } = await admin
    .from("submissions")
    .insert({
      ...values,
      status: "processing",
      citation_style: "unknown",
      word_count: 0,
    })
    .select("*")
    .single();

  if (error) {
    throw new AppError(error.message, 500);
  }

  return asSubmissionRecord(data);
}

export async function setSubmissionStoragePath(
  admin: SupabaseClient,
  submissionId: string,
  storageObjectPath: string,
) {
  const { error } = await admin
    .from("submissions")
    .update({ storage_object_path: storageObjectPath })
    .eq("id", submissionId);

  if (error) {
    throw new AppError(error.message, 500);
  }
}

export async function finalizeSubmission(
  admin: SupabaseClient,
  submissionId: string,
  report: EssayReport,
  extras: {
    title: string;
    wordCount: number;
    citationStyle: SubmissionRecord["citation_style"];
    reportExcerpt: string;
  },
) {
  const { error } = await admin
    .from("submissions")
    .update({
      title: extras.title,
      status: "completed",
      word_count: extras.wordCount,
      citation_style: extras.citationStyle,
      overall_score: report.overallScore,
      report_json: report,
      report_excerpt: extras.reportExcerpt,
      completed_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      error_message: null,
      storage_object_path: null,
      source_deleted_at: new Date().toISOString(),
    })
    .eq("id", submissionId);

  if (error) {
    throw new AppError(error.message, 500);
  }
}

export async function markSubmissionFailed(
  admin: SupabaseClient,
  submissionId: string,
  message: string,
) {
  const { error } = await admin
    .from("submissions")
    .update({
      status: "failed",
      error_message: message,
      updated_at: new Date().toISOString(),
    })
    .eq("id", submissionId);

  if (error) {
    throw new AppError(error.message, 500);
  }
}

export async function consumeReservedCredit(
  admin: SupabaseClient,
  reservationId: string,
  submissionId: string,
) {
  const { error } = await admin
    .from("credit_ledger")
    .update({
      kind: "consumed",
      submission_id: submissionId,
      note: "Essay analysis completed",
    })
    .eq("id", reservationId);

  if (error) {
    throw new AppError(error.message, 500);
  }
}

export async function releaseReservedCredit(
  admin: SupabaseClient,
  userId: string,
  reservationId: string,
  submissionId?: string,
) {
  const { error } = await admin.from("credit_ledger").insert({
    user_id: userId,
    submission_id: submissionId ?? null,
    delta: 1,
    kind: "released",
    note: `Released reserved credit ${reservationId} after a failed analysis.`,
  });

  if (error) {
    throw new AppError(error.message, 500);
  }
}
