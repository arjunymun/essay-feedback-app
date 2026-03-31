import Link from "next/link";

import { BuyCreditsButton } from "@/components/billing/buy-credits-button";
import { SignOutButton } from "@/components/auth/sign-out-button";
import { formatCurrency, getCreditPack } from "@/lib/billing";
import { STARTER_PACK_KEY } from "@/lib/constants";
import { requireUser } from "@/lib/auth";
import {
  ensureSeedCredits,
  getCreditSummary,
  getLatestCreditPurchaseForUser,
} from "@/lib/data";
import { DEMO_CREDIT_SUMMARY } from "@/lib/demo";
import { flags } from "@/lib/env";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { formatDateTime } from "@/lib/utils";

export const dynamic = "force-dynamic";

export default async function AccountPage({
  searchParams,
}: {
  searchParams?: Promise<{ billing?: string }>;
}) {
  const user = await requireUser();
  const pack = getCreditPack(STARTER_PACK_KEY);
  const resolvedSearchParams = searchParams ? await searchParams : undefined;
  const billingState = resolvedSearchParams?.billing;
  const data = flags.hasSupabasePublic
    ? await (async () => {
        if (flags.hasSupabaseService) {
          const admin = createSupabaseAdminClient();
          await ensureSeedCredits(admin, user.id);
        }

        const supabase = await createSupabaseServerClient();
        const creditSummary = await getCreditSummary(supabase, user.id);
        const latestPurchase = await getLatestCreditPurchaseForUser(supabase, user.id).catch(
          () => null,
        );

        return {
          creditSummary,
          latestPurchase,
        };
      })()
    : {
        creditSummary: DEMO_CREDIT_SUMMARY,
        latestPurchase: null,
      };

  const { creditSummary, latestPurchase } = data;

  return (
    <div className="page-shell">
      <main className="mx-auto flex w-full max-w-4xl flex-1 flex-col gap-6 px-6 py-8 lg:px-10">
        <section className="glass-card rounded-[2rem] p-8">
          <p className="eyebrow">Account</p>
          <h1 className="mt-4 font-display text-5xl text-[var(--foreground)]">
            Your workspace settings
          </h1>
          {billingState === "success" ? (
            <p className="mt-5 rounded-[1.4rem] border border-emerald-300/20 bg-emerald-300/10 px-4 py-3 text-sm leading-7 text-emerald-100">
              Stripe Checkout completed. Your credits will appear here as soon as the webhook
              confirms the payment.
            </p>
          ) : null}

          <div className="mt-8 grid gap-4 md:grid-cols-4">
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
            <div className="metric-card">
              <p className="text-xs uppercase tracking-[0.18em] text-[var(--muted-soft)]">
                Paid credits added
              </p>
              <p className="mt-3 text-[var(--foreground)]">{creditSummary.totalPurchased}</p>
            </div>
          </div>

          <div className="mt-8 flex flex-wrap items-center gap-3">
            {pack ? (
              <BuyCreditsButton className="primary-button" packKey={pack.key}>
                Buy {pack.credits} more for {formatCurrency(pack.unitAmount, pack.currency)}
              </BuyCreditsButton>
            ) : null}
            <Link className="secondary-button" href="/pricing">
              View pricing
            </Link>
            <SignOutButton />
          </div>
        </section>

        <section className="grid gap-6 lg:grid-cols-[1fr_1fr]">
          <div className="glass-card rounded-[2rem] p-8 text-sm leading-7 text-[var(--muted)]">
            <p className="eyebrow">Billing sandbox</p>
            <p className="mt-4">
              This version uses Stripe test mode. Purchases are meant to validate the billing
              flow and credit fulfillment safely before any live launch.
            </p>
            {latestPurchase ? (
              <p className="mt-4">
                Latest purchase: {latestPurchase.credits_awarded} credits from{" "}
                {formatDateTime(latestPurchase.created_at)}.
              </p>
            ) : (
              <p className="mt-4">No Stripe purchases have been recorded for this account yet.</p>
            )}
          </div>

          <div className="glass-card rounded-[2rem] p-8 text-sm leading-7 text-[var(--muted)]">
            <p className="eyebrow">Privacy defaults</p>
            <p className="mt-4">
              DraftLens stores structured report data and short excerpts for dashboard history.
              The original uploaded file and full extracted essay text are removed after
              processing completes.
            </p>
            {flags.isDemoMode ? (
              <p className="mt-4 text-sky-200">
                You are currently viewing demo-mode data because Supabase is not configured on
                this machine yet.
              </p>
            ) : null}
          </div>
        </section>
      </main>
    </div>
  );
}
