import Link from "next/link";

import { AuthForm } from "@/components/auth/auth-form";
import { SetupNotice } from "@/components/dashboard/setup-notice";
import { SiteHeader } from "@/components/marketing/site-header";
import { flags } from "@/lib/env";

export default function SignInPage() {
  return (
    <div className="page-shell">
      <SiteHeader />

      <main className="mx-auto flex w-full max-w-6xl flex-1 flex-col gap-6 px-6 pb-16 lg:px-10">
        <SetupNotice
          hasSupabase={flags.hasSupabasePublic}
          hasServiceRole={flags.hasSupabaseService}
          hasOpenAI={flags.hasOpenAI}
        />
        <div className="grid gap-6 lg:grid-cols-[0.9fr_1.1fr]">
          <div className="glass-card rounded-[2rem] p-8 text-sm leading-7 text-[var(--muted)]">
            <p className="eyebrow">Private workspace</p>
            <p className="mt-5">
              Accounts are required because every upload consumes credits and creates a saved report history. Original files are deleted after processing.
            </p>
            <p className="mt-5">
              Need a new account?{" "}
              <Link className="text-[var(--accent-strong)]" href="/sign-up">
                Create one here
              </Link>
              .
            </p>
          </div>

          <AuthForm mode="sign-in" />
        </div>
      </main>
    </div>
  );
}
