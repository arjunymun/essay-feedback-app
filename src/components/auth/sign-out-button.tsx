"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";

import { flags } from "@/lib/env";
import { createSupabaseBrowserClient } from "@/lib/supabase/browser";

export function SignOutButton() {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  return (
    <button
      className="rounded-full border border-[var(--border-strong)] px-4 py-2 text-sm text-[var(--foreground)] transition hover:-translate-y-0.5"
      disabled={isPending}
      onClick={() => {
        startTransition(async () => {
          if (flags.hasSupabasePublic) {
            const supabase = createSupabaseBrowserClient();
            await supabase.auth.signOut();
          }
          router.push("/");
          router.refresh();
        });
      }}
      type="button"
    >
      {isPending ? "Signing out..." : "Sign out"}
    </button>
  );
}
