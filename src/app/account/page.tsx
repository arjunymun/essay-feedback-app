import { SignOutButton } from "@/components/auth/sign-out-button";
import { requireUser } from "@/lib/auth";
import { getCreditSummary } from "@/lib/data";
import { DEMO_CREDIT_SUMMARY } from "@/lib/demo";
import { flags } from "@/lib/env";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export default async function AccountPage() {
  const user = await requireUser();
  const creditSummary = flags.hasSupabasePublic
    ? await (async () => {
        const supabase = await createSupabaseServerClient();
        return getCreditSummary(supabase, user.id);
      })()
    : DEMO_CREDIT_SUMMARY;

  return (
    <div className="page-shell">
      <main className="mx-auto flex w-full max-w-4xl flex-1 flex-col gap-6 px-6 py-8 lg:px-10">
        <section className="glass-card rounded-[2rem] p-8">
          <p className="eyebrow">Account</p>
          <h1 className="mt-4 font-display text-5xl text-[var(--foreground)]">
            Your workspace settings
          </h1>

          <div className="mt-8 grid gap-4 md:grid-cols-3">
            <div className="metric-card">
              <p className="text-xs uppercase tracking-[0.18em] text-[var(--muted-soft)]">
                Email
              </p>
              <p className="mt-3 text-[var(--foreground)]">{user.email}</p>
            </div>
            <div className="metric-card">
              <p className="text-xs uppercase tracking-[0.18em] text-[var(--muted-soft)]">
                Remaining credits
              </p>
              <p className="mt-3 text-[var(--foreground)]">{creditSummary.remaining}</p>
            </div>
            <div className="metric-card">
              <p className="text-xs uppercase tracking-[0.18em] text-[var(--muted-soft)]">
                Total analyses used
              </p>
              <p className="mt-3 text-[var(--foreground)]">{creditSummary.totalConsumed}</p>
            </div>
          </div>

          <div className="mt-8 flex flex-wrap items-center gap-3">
            <SignOutButton />
          </div>
        </section>

        <section className="glass-card rounded-[2rem] p-8 text-sm leading-7 text-[var(--muted)]">
          <p className="eyebrow">Privacy defaults</p>
          <p className="mt-4">
            DraftLens stores structured report data and short excerpts for dashboard history. The original uploaded file and full extracted essay text are removed after processing completes.
          </p>
          {flags.isDemoMode ? (
            <p className="mt-4 text-sky-200">
              You are currently viewing demo-mode data because Supabase is not configured on this machine yet.
            </p>
          ) : null}
        </section>
      </main>
    </div>
  );
}
