import Link from "next/link";

import { SignOutButton } from "@/components/auth/sign-out-button";
import { SubmissionList } from "@/components/dashboard/submission-list";
import { UploadForm } from "@/components/dashboard/upload-form";
import { requireUser } from "@/lib/auth";
import { getCreditSummary, listUserSubmissions } from "@/lib/data";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export default async function DashboardPage() {
  const user = await requireUser();
  const supabase = await createSupabaseServerClient();
  const [submissions, creditSummary] = await Promise.all([
    listUserSubmissions(supabase, user.id),
    getCreditSummary(supabase, user.id),
  ]);

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
