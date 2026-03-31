import type { SupabaseClient } from "@supabase/supabase-js";

import { FREE_ANALYSIS_CREDITS } from "@/lib/constants";
import type {
  CreditPurchaseRecord,
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
    .select("delta, kind")
    .eq("user_id", userId);

  if (error) {
    throw new AppError(error.message, 500);
  }

  const entries = (data ?? []).map((entry) => ({
    delta: Number(entry.delta ?? 0),
    kind: String(entry.kind ?? ""),
  }));
  const deltas = entries.map((entry) => entry.delta);
  const totalAwarded = deltas.filter((value) => value > 0).reduce((a, b) => a + b, 0);
  const totalConsumed = Math.abs(
    deltas.filter((value) => value < 0).reduce((a, b) => a + b, 0),
  );
  const totalPurchased = entries
    .filter((entry) => entry.kind === "purchase" && entry.delta > 0)
    .reduce((sum, entry) => sum + entry.delta, 0);

  return {
    remaining: deltas.reduce((a, b) => a + b, 0),
    totalAwarded,
    totalConsumed,
    totalPurchased,
    totalFreeCredits: totalAwarded - totalPurchased,
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
      "You have used all available credits. Buy a starter pack to keep analyzing essays.",
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

function asCreditPurchaseRecord(row: unknown) {
  return row as CreditPurchaseRecord;
}

export async function listCreditPurchasesForUser(
  client: SupabaseClient,
  userId: string,
) {
  const { data, error } = await client
    .from("credit_purchases")
    .select("*")
    .eq("user_id", userId)
    .order("created_at", { ascending: false });

  if (error) {
    throw new AppError(error.message, 500);
  }

  return (data ?? []).map(asCreditPurchaseRecord);
}

export async function getLatestCreditPurchaseForUser(
  client: SupabaseClient,
  userId: string,
) {
  const { data, error } = await client
    .from("credit_purchases")
    .select("*")
    .eq("user_id", userId)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) {
    throw new AppError(error.message, 500);
  }

  return data ? asCreditPurchaseRecord(data) : null;
}

export async function fulfillCreditPurchase(
  admin: SupabaseClient,
  values: {
    userId: string;
    stripeCheckoutSessionId: string;
    stripePaymentIntentId?: string | null;
    packKey: string;
    creditsAwarded: number;
    paymentStatus: string;
  },
) {
  const { data: existing, error: lookupError } = await admin
    .from("credit_purchases")
    .select("*")
    .eq("stripe_checkout_session_id", values.stripeCheckoutSessionId)
    .maybeSingle();

  if (lookupError) {
    throw new AppError(lookupError.message, 500);
  }

  if (existing?.fulfilled_at) {
    return {
      alreadyFulfilled: true,
      purchase: asCreditPurchaseRecord(existing),
    };
  }

  const purchasePayload = {
    user_id: values.userId,
    stripe_checkout_session_id: values.stripeCheckoutSessionId,
    stripe_payment_intent_id: values.stripePaymentIntentId ?? null,
    pack_key: values.packKey,
    credits_awarded: values.creditsAwarded,
    payment_status: values.paymentStatus,
  };

  const purchase = existing
    ? await (async () => {
        const { data, error } = await admin
          .from("credit_purchases")
          .update(purchasePayload)
          .eq("id", existing.id)
          .select("*")
          .single();

        if (error) {
          throw new AppError(error.message, 500);
        }

        return asCreditPurchaseRecord(data);
      })()
    : await (async () => {
        const { data, error } = await admin
          .from("credit_purchases")
          .insert(purchasePayload)
          .select("*")
          .single();

        if (error) {
          throw new AppError(error.message, 500);
        }

        return asCreditPurchaseRecord(data);
      })();

  const { error: ledgerError } = await admin.from("credit_ledger").insert({
    user_id: values.userId,
    delta: values.creditsAwarded,
    kind: "purchase",
    note: `Purchased ${values.creditsAwarded} analysis credits via Stripe (${values.packKey}).`,
  });

  if (ledgerError) {
    throw new AppError(ledgerError.message, 500);
  }

  const { data: fulfilledPurchase, error: fulfilledError } = await admin
    .from("credit_purchases")
    .update({
      payment_status: "fulfilled",
      fulfilled_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })
    .eq("id", purchase.id)
    .select("*")
    .single();

  if (fulfilledError) {
    throw new AppError(fulfilledError.message, 500);
  }

  return {
    alreadyFulfilled: false,
    purchase: asCreditPurchaseRecord(fulfilledPurchase),
  };
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
