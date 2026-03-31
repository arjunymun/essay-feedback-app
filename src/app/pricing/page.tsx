import Link from "next/link";

import { SiteHeader } from "@/components/marketing/site-header";

export default function PricingPage() {
  return (
    <div className="page-shell">
      <SiteHeader />

      <main className="mx-auto flex w-full max-w-5xl flex-1 flex-col gap-6 px-6 pb-16 lg:px-10">
        <section className="hero-card rounded-[2.5rem] px-8 py-12 lg:px-12">
          <p className="eyebrow">Phase 2 monetization</p>
          <h1 className="mt-4 font-display text-5xl text-[var(--foreground)]">
            Freemium now, billing next
          </h1>
          <p className="mt-5 max-w-3xl text-lg leading-8 text-[var(--muted)]">
            The current MVP uses internal credits only. The next milestone adds subscriptions or top-up packs through Stripe after the feedback workflow is stable.
          </p>
          <div className="mt-8 flex flex-wrap gap-4">
            <Link className="primary-button" href="/sign-up">
              Start with free analyses
            </Link>
            <Link className="secondary-button" href="/">
              Back to home
            </Link>
          </div>
        </section>
      </main>
    </div>
  );
}
