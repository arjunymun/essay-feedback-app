import {
  ArrowRight,
  CheckCircle2,
  ClipboardCheck,
  FileCheck2,
  Layers3,
  SearchCheck,
  ShieldCheck,
  Sparkles,
  Workflow,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import Link from "next/link";

import { SiteHeader } from "@/components/marketing/site-header";
import { TrustOrbitScene } from "@/components/marketing/trust-orbit-scene";
import { APP_NAME, APP_TAGLINE } from "@/lib/constants";
import { getCurrentUser } from "@/lib/auth";
import { flags } from "@/lib/env";

type Feature = {
  title: string;
  description: string;
  icon: LucideIcon;
};

const featureCards: Feature[] = [
  {
    title: "Claim-level findings",
    description:
      "DraftLens extracts important statements, labels support requirements, and shows the reviewer which claims are strong, partial, or unsupported.",
    icon: FileCheck2,
  },
  {
    title: "Verifier pass",
    description:
      "Citations, references, named entities, quotations, and source metadata are checked separately from the writing-quality rubric.",
    icon: SearchCheck,
  },
  {
    title: "Traceable review runs",
    description:
      "Each review can expose job stages, model usage, uncertainty, and failure-safe reasons instead of hiding everything in one opaque response.",
    icon: Workflow,
  },
  {
    title: "Optional rewrites",
    description:
      "Rewrite suggestions are framed as non-authoritative edits, so students keep ownership and reviewers can accept or reject changes.",
    icon: Sparkles,
  },
];

const processSteps = [
  "Upload a DOCX or text PDF and preserve source anchors.",
  "Plan the review passes needed for the document and rubric.",
  "Retrieve evidence, verify citations, and flag uncertainty.",
  "Generate a report with provenance, confidence, and next actions.",
];

function SectionHeader({
  title,
  description,
}: {
  title: string;
  description: string;
}) {
  return (
    <div className="marketing-section-header">
      <h2>{title}</h2>
      <p>{description}</p>
    </div>
  );
}

function FeatureCard({ title, description, icon: Icon }: Feature) {
  return (
    <article className="marketing-feature-card marketing-reveal">
      <div className="marketing-icon">
        <Icon aria-hidden="true" size={22} />
      </div>
      <h3>{title}</h3>
      <p>{description}</p>
    </article>
  );
}

function ReviewControlsCard() {
  const setupItems = [
    { label: "Evidence policy", value: "Trust-first" },
    { label: "Source handling", value: "Least retention" },
    { label: "Reviewer handoff", value: "Traceable" },
  ];

  return (
    <aside className="marketing-status-card" aria-label="Review controls">
      <div>
        <p className="marketing-status-kicker">Review controls</p>
        <h3>Built for reviewers who need to know what the system checked.</h3>
      </div>
      <div className="marketing-status-list">
        {setupItems.map((item) => (
          <div key={item.label} className="marketing-status-row">
            <span className="marketing-dot-ready" />
            <span>{item.label}</span>
            <strong>{item.value}</strong>
          </div>
        ))}
      </div>
    </aside>
  );
}

function HeroPreview() {
  return (
    <div className="marketing-preview" aria-label="DraftLens report preview">
      <div className="marketing-preview-topbar">
        <span />
        <span />
        <span />
        <strong>Review report</strong>
      </div>
      <div className="marketing-preview-grid">
        <div className="marketing-preview-main">
          <div className="marketing-preview-score">
            <div>
              <p>Evidence readiness</p>
              <strong>78%</strong>
            </div>
            <div className="marketing-preview-meter" aria-hidden="true">
              <span />
            </div>
          </div>

          <div className="marketing-claim-card">
            <div className="marketing-claim-header">
              <span>Claim 04</span>
              <strong>Partial support</strong>
            </div>
            <p>
              &quot;Urban tree cover can reduce local heat exposure by
              double-digit percentages in every neighborhood.&quot;
            </p>
            <div className="marketing-evidence-row">
              <CheckCircle2 aria-hidden="true" size={18} />
              <span>Source metadata matched, but local scope is not proven.</span>
            </div>
          </div>

          <div className="marketing-mini-table">
            <div>
              <span>Citation</span>
              <strong>Verified metadata</strong>
            </div>
            <div>
              <span>Quote check</span>
              <strong>Needs review</strong>
            </div>
            <div>
              <span>Rewrite</span>
              <strong>Optional</strong>
            </div>
          </div>
        </div>

        <div className="marketing-preview-side">
          <div>
            <p>Pipeline</p>
            <span>queued</span>
            <span>ingested</span>
            <span>verified</span>
            <span>criticized</span>
          </div>
          <div>
            <p>Trace</p>
            <strong>4 stages</strong>
            <span>cost and latency recorded</span>
          </div>
        </div>
      </div>
    </div>
  );
}

export default async function Home() {
  const user = await getCurrentUser().catch(() => null);
  const primaryHref = user ? "/dashboard" : flags.isDemoMode ? "/dashboard" : "/sign-up";
  const primaryLabel = user ? "Open dashboard" : flags.isDemoMode ? "Explore workspace" : "Start free";

  return (
    <div className="marketing-shell page-shell">
      <SiteHeader signedIn={Boolean(user)} />

      <main>
        <section className="marketing-hero">
          <div className="marketing-hero-copy marketing-reveal">
            <h1>Evidence-grounded document review for drafts that need trust.</h1>
            <p>
              {APP_TAGLINE} {APP_NAME} turns uploads into claim-level review
              reports with citation checks, provenance, uncertainty, and
              revision guidance that stays honest when evidence is thin.
            </p>
            <div className="marketing-hero-actions">
              <Link className="primary-button" href={primaryHref}>
                {primaryLabel}
                <ArrowRight aria-hidden="true" size={18} />
              </Link>
              <Link className="secondary-button" href="/dashboard/submissions/demo-report">
                View sample report
              </Link>
            </div>
          </div>

          <div className="marketing-hero-visual marketing-reveal">
            <HeroPreview />
          </div>
        </section>

        <section className="marketing-proof-strip" aria-label="Product proof points">
          <span>Auth, uploads, credits preserved</span>
          <span>Crossref and OpenAlex checks</span>
          <span>Traceable sample reports</span>
        </section>

        <TrustOrbitScene />

        <section id="product" className="marketing-section">
          <SectionHeader
            title="A review workflow, not a generic essay bot."
            description="The upgraded surface is built around the same primitives a real reviewer needs: claims, evidence, confidence, traces, and safe revision suggestions."
          />
          <div className="marketing-feature-grid">
            {featureCards.map((feature) => (
              <FeatureCard key={feature.title} {...feature} />
            ))}
          </div>
        </section>

        <section id="trust" className="marketing-split-section">
          <div className="marketing-trust-copy marketing-reveal">
            <ShieldCheck aria-hidden="true" size={32} />
            <h2>Trust is a product feature, not a footer promise.</h2>
            <p>
              DraftLens separates metadata matches from true claim support,
              highlights uncertainty, treats external sources as untrusted data,
              and preserves the original MVP&apos;s temporary source-file deletion
              principle.
            </p>
            <div className="marketing-check-list">
              <span>Fails safely when evidence is weak.</span>
              <span>Labels rewrites as optional and non-authoritative.</span>
              <span>Records review stages for inspection and evals.</span>
            </div>
          </div>
          <div className="marketing-metrics-panel marketing-reveal">
            <div>
              <strong>5</strong>
              <span>rubric dimensions</span>
            </div>
            <div>
              <strong>3</strong>
              <span>review scenarios</span>
            </div>
            <div>
              <strong>0</strong>
              <span>fabricated-source tolerance</span>
            </div>
          </div>
        </section>

        <section id="process" className="marketing-section">
          <SectionHeader
            title="From upload to provenance in four clear stages."
            description="The roadmap keeps the product understandable: deterministic parsing first, model-assisted reasoning only where it adds review value."
          />
          <ol className="marketing-process">
            {processSteps.map((step, index) => (
              <li key={step} className="marketing-process-step marketing-reveal">
                <span>{String(index + 1).padStart(2, "0")}</span>
                <p>{step}</p>
              </li>
            ))}
          </ol>
        </section>

        <section className="marketing-demo-band">
          <div className="marketing-demo-copy">
            <Layers3 aria-hidden="true" size={28} />
            <h2>Accountable review infrastructure for serious drafts.</h2>
            <p>
              DraftLens makes the review process visible: ingestion, retrieval,
              verifier and critic passes, trace summaries, and a trust policy
              that separates evidence from uncertainty.
            </p>
          </div>
          <ReviewControlsCard />
        </section>

        <section className="marketing-final-cta">
          <ClipboardCheck aria-hidden="true" size={34} />
          <h2>Explore a sample trust report.</h2>
          <p>
            See unsupported statements, evidence links, citation confidence, and
            trace information in the same format a reviewer would inspect.
          </p>
          <div>
            <Link className="primary-button" href="/dashboard/submissions/demo-report">
              Open sample report
              <ArrowRight aria-hidden="true" size={18} />
            </Link>
          </div>
        </section>
      </main>
    </div>
  );
}
