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

          {flags.hasSupabasePublic ? (
            <AuthForm mode="sign-in" />
          ) : (
            <div className="glass-card rounded-[2rem] p-8">
              <p className="eyebrow">Demo access</p>
              <h1 className="mt-4 font-display text-4xl text-[var(--foreground)]">
                Explore the app without auth
              </h1>
              <p className="mt-4 text-sm leading-7 text-[var(--muted)]">
                Supabase is not configured yet, so localhost is running in demo mode. You can still walk through the dashboard and sample report right now.
              </p>
              <Link className="primary-button mt-6" href="/dashboard">
                Enter demo workspace
              </Link>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
