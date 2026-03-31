import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

import { env, flags } from "@/lib/env";

export async function createSupabaseServerClient() {
  if (!flags.hasSupabasePublic) {
    throw new Error("Supabase public environment variables are missing.");
  }

  const cookieStore = await cookies();

  return createServerClient(
    env.NEXT_PUBLIC_SUPABASE_URL,
    env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) => {
              cookieStore.set(name, value, options);
            });
          } catch {
            // Server components cannot always mutate cookies. Proxy refreshes
            // the session for navigational requests.
          }
        },
      },
    },
  );
}
