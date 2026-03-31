import Link from "next/link";

import { SignOutButton } from "@/components/auth/sign-out-button";
import { SubmissionList } from "@/components/dashboard/submission-list";
import { UploadForm } from "@/components/dashboard/upload-form";
import { requireUser } from "@/lib/auth";
import { ensureSeedCredits, getCreditSummary, listUserSubmissions } from "@/lib/data";
import { listDemoSubmissions, DEMO_CREDIT_SUMMARY } from "@/lib/demo";
import { flags } from "@/lib/env";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export default async function DashboardPage() {
  const user = await requireUser();
  const [submissions, creditSummary] = flags.hasSupabasePublic
    ? await (async () => {
        if (flags.hasSupabaseService) {
          const admin = createSupabaseAdminClient();
          await ensureSeedCredits(admin, user.id);
        }

        const supabase = await createSupabaseServerClient();
        return Promise.all([
          listUserSubmissions(supabase, user.id),
          getCreditSummary(supabase, user.id),
        ]);
      })()
    : [listDemoSubmissions(), DEMO_CREDIT_SUMMARY];

  return (
    <div className="page-shell">
      <main className="mx-auto flex w-full max-w-6xl flex-1 flex-col gap-8 px-6 py-8 lg:px-10">
        <section className="flex flex-col gap-5 rounded-[2.5rem] border border-[var(--border)] bg-black/10 px-8 py-8 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <p className="eyebrow">Dashboard</p>
            <h1 className="mt-4 font-display text-5xl text-[var(--foreground)]">
              Welcome back
            </h1>
            <p className="mt-4 max-w-2xl text-sm leading-7 text-[var(--muted)]">
              Upload one document at a time, review the rubric, and keep the strongest edits for your next revision cycle.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <Link className="secondary-button" href="/setup">
              Setup
            </Link>
            <Link className="secondary-button" href="/account">
              Account
            </Link>
            <Link className="secondary-button" href="/pricing">
              Pricing
            </Link>
            <SignOutButton />
          </div>
        </section>

        <UploadForm creditsRemaining={creditSummary.remaining} />

        {flags.isDemoMode ? (
          <section className="rounded-[1.8rem] border border-sky-300/20 bg-sky-300/8 px-6 py-5 text-sm leading-7 text-sky-100">
            <p>
              Demo mode is active. You can inspect the seeded sample report and the
              rewrite lab now, then wire Supabase and OpenAI when you are ready for real
              uploads.
            </p>
            <div className="mt-4 flex flex-wrap gap-3">
              <Link className="secondary-button" href="/dashboard/submissions/demo-report">
                Open sample report
              </Link>
              <Link className="secondary-button" href="/setup">
                Finish setup
              </Link>
            </div>
          </section>
        ) : null}

        <section className="grid gap-5 lg:grid-cols-3">
          <div className="glass-card rounded-[2rem] p-6">
            <p className="eyebrow">How scoring works</p>
            <p className="mt-4 text-sm leading-7 text-[var(--muted)]">
              DraftLens combines rubric logic, citation checks, and writing-pattern
              signals to estimate how strong the draft is across thesis, structure,
              evidence, style, and citation quality.
            </p>
          </div>

          <div className="glass-card rounded-[2rem] p-6">
            <p className="eyebrow">Citation confidence</p>
            <p className="mt-4 text-sm leading-7 text-[var(--muted)]">
              Citation results are confidence signals, not absolute truth. A “matched”
              source is a strong metadata match, while “possible match” and “not found”
              are prompts for manual review.
            </p>
          </div>

          <div className="glass-card rounded-[2rem] p-6">
            <p className="eyebrow">Current analysis mode</p>
            <p className="mt-4 text-sm leading-7 text-[var(--muted)]">
              {flags.hasOpenAI
                ? "AI-assisted analysis is available in this environment, so reports can include richer summaries and rewrite quality."
                : "Fallback analysis mode is active in this environment, so the app still works without paid AI calls but uses simpler report generation."}
            </p>
          </div>
        </section>

        <section className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="eyebrow">Report history</p>
              <h2 className="mt-2 font-display text-3xl text-[var(--foreground)]">
                Previous analyses
              </h2>
            </div>
          </div>
          <SubmissionList submissions={submissions} />
        </section>
      </main>
    </div>
  );
}
