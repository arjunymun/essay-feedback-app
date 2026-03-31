import { ESSAY_UPLOAD_BUCKET } from "@/lib/constants";
import { flags } from "@/lib/env";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";

export type RuntimeSetupStatus = {
  schemaReady: boolean;
  bucketReady: boolean;
  message: string | null;
};

export async function getRuntimeSetupStatus(): Promise<RuntimeSetupStatus | null> {
  if (!flags.hasSupabaseService) {
    return null;
  }

  try {
    const admin = createSupabaseAdminClient();

    const tableChecks = await Promise.all([
      admin.from("submissions").select("id", { head: true, count: "exact" }).limit(1),
      admin.from("credit_ledger").select("id", { head: true, count: "exact" }).limit(1),
    ]);

    const schemaError = tableChecks.find((result) => result.error)?.error;
    if (schemaError) {
      return {
        schemaReady: false,
        bucketReady: false,
        message:
          "Supabase connected, but the DraftLens tables are missing. Run the SQL in supabase/migrations/20260331_init.sql inside the SQL Editor for this project.",
      };
    }

    const { data: bucket, error: bucketError } = await admin.storage.getBucket(
      ESSAY_UPLOAD_BUCKET,
    );

    return {
      schemaReady: true,
      bucketReady: Boolean(bucket) && !bucketError,
      message: bucketError
        ? `Database tables are ready, but the ${ESSAY_UPLOAD_BUCKET} storage bucket is still missing. Run the migration to create it.`
        : "Supabase keys and DraftLens database objects are connected.",
    };
  } catch (error) {
    return {
      schemaReady: false,
      bucketReady: false,
      message:
        error instanceof Error
          ? error.message
          : "Supabase could not be reached from the app runtime.",
    };
  }
}
