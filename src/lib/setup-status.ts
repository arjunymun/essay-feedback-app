import { ESSAY_UPLOAD_BUCKET } from "@/lib/constants";
import { flags } from "@/lib/env";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";

export type RuntimeSetupStatus = {
  schemaReady: boolean;
  billingReady: boolean;
  trustSchemaReady: boolean;
  bucketReady: boolean;
  message: string | null;
};

export async function getRuntimeSetupStatus(): Promise<RuntimeSetupStatus | null> {
  if (!flags.hasSupabaseService) {
    return null;
  }

  try {
    const admin = createSupabaseAdminClient();

    const coreChecks = await Promise.all([
      admin.from("submissions").select("id", { head: true, count: "exact" }).limit(1),
      admin.from("credit_ledger").select("id", { head: true, count: "exact" }).limit(1),
    ]);
    const billingCheck = await admin
      .from("credit_purchases")
      .select("id", { head: true, count: "exact" })
      .limit(1);
    const trustChecks = await Promise.all([
      admin.from("review_jobs").select("id", { head: true, count: "exact" }).limit(1),
      admin.from("documents").select("id", { head: true, count: "exact" }).limit(1),
      admin.from("claims").select("id", { head: true, count: "exact" }).limit(1),
      admin.from("review_reports").select("id", { head: true, count: "exact" }).limit(1),
    ]);

    const schemaError = coreChecks.find((result) => result.error)?.error;
    if (schemaError) {
      return {
        schemaReady: false,
        billingReady: false,
        trustSchemaReady: false,
        bucketReady: false,
        message:
          "Supabase connected, but the core DraftLens tables are missing. Run the SQL in supabase/migrations/20260331_init.sql inside the SQL Editor for this project.",
      };
    }

    const billingReady = !billingCheck.error;
    const trustSchemaReady = !trustChecks.some((result) => result.error);

    const { data: bucket, error: bucketError } = await admin.storage.getBucket(
      ESSAY_UPLOAD_BUCKET,
    );

    return {
      schemaReady: true,
      billingReady,
      trustSchemaReady,
      bucketReady: Boolean(bucket) && !bucketError,
      message: bucketError
        ? `Database tables are ready, but the ${ESSAY_UPLOAD_BUCKET} storage bucket is still missing. Run the migration to create it.`
        : trustSchemaReady
          ? "Supabase keys and DraftLens trust-platform database objects are connected."
          : billingReady
            ? "Core DraftLens and billing tables are connected. The trust-platform migration still needs to be applied for provenance tables."
            : "Core DraftLens tables are connected. Billing and trust-platform migrations still need to be applied.",
    };
  } catch (error) {
    return {
      schemaReady: false,
      billingReady: false,
      trustSchemaReady: false,
      bucketReady: false,
      message:
        error instanceof Error
          ? error.message
          : "Supabase could not be reached from the app runtime.",
    };
  }
}
