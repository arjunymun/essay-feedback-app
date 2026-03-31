import Link from "next/link";

import { SetupNotice } from "@/components/dashboard/setup-notice";
import { SiteHeader } from "@/components/marketing/site-header";
import { APP_NAME, APP_TAGLINE } from "@/lib/constants";
import { flags } from "@/lib/env";
import { getCurrentUser } from "@/lib/auth";

function FeatureCard({
  title,
  description,
}: {
  title: string;
  description: string;
}) {
  return (
    <div className="glass-card rounded-[2rem] p-6">
      <h3 className="font-display text-3xl text-[var(--foreground)]">{title}</h3>
      <p className="mt-3 text-sm leading-7 text-[var(--muted)]">{description}</p>
    </div>
  );
}

export default async function Home() {
  const user = await getCurrentUser().catch(() => null);

  return (
    <div className="page-shell">
      <SiteHeader signedIn={Boolean(user)} />

      <main className="mx-auto flex w-full max-w-6xl flex-1 flex-col gap-12 px-6 pb-16 lg:px-10">
        <section className="hero-card overflow-hidden rounded-[2.5rem] px-8 py-12 lg:px-12 lg:py-16">
          <div className="grid gap-10 lg:grid-cols-[1.3fr_0.9fr]">
            <div>
              <p className="eyebrow">{APP_NAME}</p>
              <h1 className="mt-5 max-w-3xl font-display text-5xl leading-tight text-[var(--foreground)] md:text-6xl">
                Turn a draft into a report students can actually revise from.
              </h1>
              <p className="mt-6 max-w-2xl text-lg leading-8 text-[var(--muted)]">
                {APP_TAGLINE} Upload a paper, get transparent rubric scoring, spot questionable references, and tighten the writing without turning it into obvious AI gloss.
              </p>

              <div className="mt-8 flex flex-col gap-4 sm:flex-row">
                <Link className="primary-button" href={user ? "/dashboard" : "/sign-up"}>
                  {user ? "Open dashboard" : "Start free"}
                </Link>
                <Link className="secondary-button" href="/pricing">
                  See pricing path
                </Link>
              </div>
            </div>

            <div className="glass-card rounded-[2rem] p-6">
              <p className="eyebrow">What the report includes</p>
              <ul className="mt-5 space-y-4 text-sm leading-7 text-[var(--muted)]">
                <li>Overall essay score plus five rubric subscores.</li>
                <li>APA and MLA citation format and metadata checks.</li>
                <li>Highest-priority revision guidance instead of generic fluff.</li>
                <li>Paragraph-level rewrites that preserve meaning and authorship.</li>
              </ul>
            </div>
          </div>
        </section>

        <SetupNotice
          hasSupabase={flags.hasSupabasePublic}
          hasServiceRole={flags.hasSupabaseService}
          hasOpenAI={flags.hasOpenAI}
        />

        <section className="grid gap-5 lg:grid-cols-3">
          <FeatureCard
            title="Citation-aware"
            description="DraftLens does not stop at grammar. It looks for a reference section, detects APA or MLA, and checks likely source existence through academic metadata APIs."
          />
          <FeatureCard
            title="Feedback first"
            description="The core product is coaching, not detector gaming. Students see strengths, risks, and next edits in a format that feels credible enough for real use."
          />
          <FeatureCard
            title="Resume-worthy build"
            description="Full-stack auth, uploads, AI analysis, citation verification, saved reports, and a clear business path make this a strong portfolio project and a realistic side-hustle foundation."
          />
        </section>
      </main>
    </div>
  );
}
