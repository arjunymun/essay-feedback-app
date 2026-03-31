import Link from "next/link";

import { BuyCreditsButton } from "@/components/billing/buy-credits-button";
import { SiteHeader } from "@/components/marketing/site-header";
import { getCurrentUser } from "@/lib/auth";
import { formatCurrency, getCreditPack } from "@/lib/billing";
import { STARTER_PACK_KEY } from "@/lib/constants";

export default async function PricingPage({
  searchParams,
}: {
  searchParams?: Promise<{ billing?: string }>;
}) {
  const user = await getCurrentUser().catch(() => null);
  const pack = getCreditPack(STARTER_PACK_KEY);
  const resolvedSearchParams = searchParams ? await searchParams : undefined;
  const billingState = resolvedSearchParams?.billing;

  if (!pack) {
    throw new Error("Starter pack configuration is missing.");
  }

  return (
    <div className="page-shell">
      <SiteHeader signedIn={Boolean(user)} />

      <main className="mx-auto flex w-full max-w-5xl flex-1 flex-col gap-6 px-6 pb-16 lg:px-10">
        <section className="hero-card rounded-[2.5rem] px-8 py-12 lg:px-12">
          <p className="eyebrow">Billing sandbox</p>
          <h1 className="mt-4 font-display text-5xl text-[var(--foreground)]">
            Buy credits when the free analyses run out
          </h1>
          <p className="mt-5 max-w-3xl text-lg leading-8 text-[var(--muted)]">
            DraftLens starts every user with 3 free analyses. This first Stripe launch keeps
            the pricing simple: one starter pack in test mode so the billing path can be
            validated safely before any live launch.
          </p>
          {billingState === "cancelled" ? (
            <p className="mt-5 rounded-[1.4rem] border border-amber-300/20 bg-amber-300/8 px-4 py-3 text-sm leading-7 text-amber-100">
              Checkout was canceled, so no credits were added to your account.
            </p>
          ) : null}
          <div className="mt-8 flex flex-wrap gap-4">
            {user ? (
              <BuyCreditsButton className="primary-button" packKey={pack.key}>
                Buy {pack.credits} analyses for {formatCurrency(pack.unitAmount, pack.currency)}
              </BuyCreditsButton>
            ) : (
              <Link className="primary-button" href="/sign-up">
                Start with free analyses
              </Link>
            )}
            <Link className="secondary-button" href="/">
              Back to home
            </Link>
          </div>
        </section>

        <section className="grid gap-5 lg:grid-cols-[1.1fr_0.9fr]">
          <div className="glass-card rounded-[2rem] p-6">
            <p className="eyebrow">Starter offer</p>
            <h2 className="mt-4 font-display text-4xl text-[var(--foreground)]">
              {pack.credits} analyses for {formatCurrency(pack.unitAmount, pack.currency)}
            </h2>
            <p className="mt-4 text-sm leading-7 text-[var(--muted)]">
              {pack.description}
            </p>
            <ul className="mt-5 space-y-3 text-sm leading-7 text-[var(--muted)]">
              <li>One-time payment through Stripe Checkout.</li>
              <li>Credits are added after payment confirmation via webhook.</li>
              <li>This release uses Stripe test mode, not live billing.</li>
            </ul>
          </div>

          <div className="glass-card rounded-[2rem] p-6">
            <p className="eyebrow">Why packs, not token pricing</p>
            <p className="mt-4 text-sm leading-7 text-[var(--muted)]">
              Students buy analyses, not raw model usage. Token costs still matter internally,
              but the public offer stays simple and easier to trust.
            </p>
          </div>
        </section>
      </main>
    </div>
  );
}
