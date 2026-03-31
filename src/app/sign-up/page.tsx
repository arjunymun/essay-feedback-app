import Link from "next/link";

import { AuthForm } from "@/components/auth/auth-form";
import { SetupNotice } from "@/components/dashboard/setup-notice";
import { SiteHeader } from "@/components/marketing/site-header";
import { flags } from "@/lib/env";

export default function SignUpPage() {
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
            <p className="eyebrow">Free start</p>
            <p className="mt-5">
              New accounts receive three free analyses. Reports stay in the dashboard, but the original source file is removed after processing.
            </p>
            <p className="mt-5">
              Already have an account?{" "}
              <Link className="text-[var(--accent-strong)]" href="/sign-in">
                Sign in
              </Link>
              .
            </p>
          </div>

          {flags.hasSupabasePublic ? (
            <AuthForm mode="sign-up" />
          ) : (
            <div className="glass-card rounded-[2rem] p-8">
              <p className="eyebrow">Demo access</p>
              <h1 className="mt-4 font-display text-4xl text-[var(--foreground)]">
                Backend-free preview
              </h1>
              <p className="mt-4 text-sm leading-7 text-[var(--muted)]">
                Until Supabase is wired in, this project exposes a demo workspace so you can inspect the product surface and the sample analysis experience.
              </p>
              <Link className="primary-button mt-6" href="/dashboard">
                Open demo workspace
              </Link>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
