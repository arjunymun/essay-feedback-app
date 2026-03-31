import { createClient } from "@supabase/supabase-js";

import { env, flags } from "@/lib/env";

export function createSupabaseAdminClient() {
  if (!flags.hasSupabaseService) {
    throw new Error("Supabase service role environment variables are missing.");
  }

  return createClient(
    env.NEXT_PUBLIC_SUPABASE_URL,
    env.SUPABASE_SERVICE_ROLE_KEY,
    {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    },
  );
}
