import Link from "next/link";

import { APP_NAME } from "@/lib/constants";
import { env, flags } from "@/lib/env";

type SetupItemProps = {
  label: string;
  ready: boolean;
  detail: string;
};

function SetupItem({ label, ready, detail }: SetupItemProps) {
  return (
    <div className="metric-card">
      <div className="flex items-center justify-between gap-3">
        <p className="text-sm font-medium text-[var(--foreground)]">{label}</p>
        <span
          className={`rounded-full px-3 py-1 text-[11px] uppercase tracking-[0.18em] ${
            ready
              ? "bg-emerald-400/15 text-emerald-100"
              : "bg-amber-300/15 text-amber-100"
          }`}
        >
          {ready ? "Ready" : "Needed"}
        </span>
      </div>
      <p className="mt-3 text-sm leading-7 text-[var(--muted)]">{detail}</p>
    </div>
  );
}

export default function SetupPage() {
  const steps = [
    {
      label: "Supabase public keys",
      ready: flags.hasSupabasePublic,
      detail:
        "Needed for browser auth, route protection, and loading real user submissions instead of demo data. The app accepts either the newer publishable key or the older anon key.",
    },
    {
      label: "Supabase server key",
      ready: flags.hasSupabaseService,
      detail:
        "Needed for privileged database writes, credit ledger updates, and source-file cleanup after analysis. The app accepts either the newer secret key or the older service-role key.",
    },
    {
      label: "OpenAI API key",
      ready: flags.hasOpenAI,
      detail:
        "Needed for richer scoring, stronger rewrite quality, and the full structured analysis pipeline.",
    },
  ];

  return (
    <div className="page-shell">
      <main className="mx-auto flex w-full max-w-5xl flex-1 flex-col gap-8 px-6 py-8 lg:px-10">
        <section className="glass-card rounded-[2.5rem] p-8">
          <p className="eyebrow">Setup guide</p>
          <h1 className="mt-4 font-display text-5xl text-[var(--foreground)]">
            Connect the real services behind {APP_NAME}
          </h1>
          <p className="mt-4 max-w-3xl text-sm leading-7 text-[var(--muted)]">
            The product already has a working demo experience on localhost. This page
            shows exactly what still needs to be connected for live auth, uploads,
            analysis, and saved reports.
          </p>

          <div className="mt-6 flex flex-wrap gap-3">
            <Link className="primary-button" href="/dashboard">
              Open dashboard
            </Link>
            <Link className="secondary-button" href="/dashboard/submissions/demo-report">
              View sample report
            </Link>
          </div>
        </section>

        <section className="grid gap-4 md:grid-cols-3">
          {steps.map((step) => (
            <SetupItem
              key={step.label}
              detail={step.detail}
              label={step.label}
              ready={step.ready}
            />
          ))}
        </section>

        <section className="grid gap-6 lg:grid-cols-[1.15fr_0.85fr]">
          <div className="glass-card rounded-[2rem] p-6">
            <p className="eyebrow">Next actions</p>
            <ol className="mt-4 space-y-4 text-sm leading-7 text-[var(--muted)]">
              <li>Create `.env.local` from `.env.example`.</li>
              <li>
                Add `NEXT_PUBLIC_SUPABASE_PROJECT_REF=qhjsrxmjbbluswomychr` or set
                `NEXT_PUBLIC_SUPABASE_URL=https://qhjsrxmjbbluswomychr.supabase.co`.
              </li>
              <li>
                Add `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` and `SUPABASE_SECRET_KEY`.
                If your dashboard still shows the older names, `NEXT_PUBLIC_SUPABASE_ANON_KEY`
                and `SUPABASE_SERVICE_ROLE_KEY` also work.
              </li>
              <li>Add `OPENAI_API_KEY` and keep `OPENAI_MODEL` on the default unless we intentionally change it.</li>
              <li>Run the SQL in `supabase/migrations/20260331_init.sql` against your Supabase project.</li>
              <li>Restart `npm run dev` and test sign-up, upload, and report generation end to end.</li>
            </ol>
          </div>

          <div className="glass-card rounded-[2rem] p-6">
            <p className="eyebrow">What already works</p>
            <ul className="mt-4 space-y-4 text-sm leading-7 text-[var(--muted)]">
              <li>The landing page, dashboard shell, account screen, and pricing page are live.</li>
              <li>Demo submissions and the report detail view are available immediately.</li>
              <li>The rewrite endpoint stays callable locally, even before OpenAI is connected.</li>
              <li>Build, lint, and tests are already passing on the current codebase.</li>
              {env.NEXT_PUBLIC_SUPABASE_PROJECT_REF ? (
                <li>Project reference detected: `{env.NEXT_PUBLIC_SUPABASE_PROJECT_REF}`.</li>
              ) : null}
            </ul>
          </div>
        </section>
      </main>
    </div>
  );
}
