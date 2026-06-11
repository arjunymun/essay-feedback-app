import { notFound } from "next/navigation";

import { RewriteLab } from "@/components/dashboard/rewrite-lab";
import { requireUser } from "@/lib/auth";
import { getSubmissionForUser } from "@/lib/data";
import { getDemoSubmissionById } from "@/lib/demo";
import { flags } from "@/lib/env";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import type { ClaimFinding, CitationVerificationResult, RubricScore } from "@/lib/types";
import { cn, formatDateTime } from "@/lib/utils";

export const dynamic = "force-dynamic";

function getScoreTone(score: number | null) {
  if (score === null) {
    return {
      label: "Pending",
      className: "bg-slate-400/15 text-slate-100",
    };
  }

  if (score >= 90) {
    return {
      label: "Excellent",
      className: "bg-emerald-400/15 text-emerald-100",
    };
  }

  if (score >= 80) {
    return {
      label: "Strong",
      className: "bg-sky-400/15 text-sky-100",
    };
  }

  if (score >= 70) {
    return {
      label: "Solid",
      className: "bg-amber-400/15 text-amber-100",
    };
  }

  return {
    label: "Needs work",
    className: "bg-rose-400/15 text-rose-100",
  };
}

function getConfidenceLabel(confidence: number) {
  if (confidence >= 85) {
    return "High confidence";
  }

  if (confidence >= 65) {
    return "Medium confidence";
  }

  return "Low confidence";
}

function RubricCard({ score }: { score: RubricScore }) {
  const tone = getScoreTone(score.score);

  return (
    <div className="metric-card report-metric-card">
      <div className="flex items-start justify-between gap-3">
        <p className="text-xs uppercase tracking-[0.18em] text-[var(--muted-soft)]">
          {score.label}
        </p>
        <span
          className={cn(
            "rounded-full px-3 py-1 text-[11px] uppercase tracking-[0.16em]",
            tone.className,
          )}
        >
          {tone.label}
        </span>
      </div>
      <div className="mt-4 flex items-end justify-between gap-3">
        <div>
          <p className="font-display text-4xl text-[var(--foreground)]">{score.score}</p>
          <p className="text-xs uppercase tracking-[0.16em] text-[var(--muted-soft)]">
            rubric score
          </p>
        </div>
        <div className="report-score-bar">
          <span style={{ width: `${score.score}%` }} />
        </div>
      </div>
      <p className="mt-4 text-sm leading-7 text-[var(--muted)]">{score.summary}</p>
    </div>
  );
}

function CitationStatusChip({
  status,
}: {
  status: CitationVerificationResult["status"];
}) {
  const tone = {
    matched: "bg-emerald-400/15 text-emerald-100",
    possible_match: "bg-amber-400/15 text-amber-100",
    not_found: "bg-rose-400/15 text-rose-100",
    malformed: "bg-slate-400/15 text-slate-100",
  }[status];

  return (
    <span className={cn("rounded-full px-3 py-1 text-xs uppercase tracking-[0.16em]", tone)}>
      {status.replace("_", " ")}
    </span>
  );
}

function ClaimVerdictChip({ verdict }: { verdict: ClaimFinding["verdict"] }) {
  const tone = {
    supported: "bg-emerald-400/15 text-emerald-100",
    partially_supported: "bg-amber-400/15 text-amber-100",
    unsupported: "bg-rose-400/15 text-rose-100",
    uncertain: "bg-sky-400/15 text-sky-100",
    not_applicable: "bg-slate-400/15 text-slate-100",
  }[verdict];

  return (
    <span className={cn("rounded-full px-3 py-1 text-xs uppercase tracking-[0.16em]", tone)}>
      {verdict.replaceAll("_", " ")}
    </span>
  );
}

function RiskPill({ risk }: { risk: ClaimFinding["riskLevel"] }) {
  const tone = {
    low: "border-emerald-300/20 text-emerald-100",
    medium: "border-amber-300/25 text-amber-100",
    high: "border-rose-300/25 text-rose-100",
  }[risk];

  return (
    <span
      className={cn(
        "rounded-full border px-3 py-1 text-xs uppercase tracking-[0.16em]",
        tone,
      )}
    >
      {risk} risk
    </span>
  );
}

function InfoPill({
  label,
  value,
}: {
  label: string;
  value: string;
}) {
  return (
    <div className="metric-card">
      <p className="text-xs uppercase tracking-[0.18em] text-[var(--muted-soft)]">{label}</p>
      <p className="mt-3 text-[var(--foreground)]">{value}</p>
    </div>
  );
}

export default async function SubmissionDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams?: Promise<{ fresh?: string }>;
}) {
  const { id } = await params;
  const resolvedSearchParams = searchParams ? await searchParams : undefined;
  const isFreshReport = resolvedSearchParams?.fresh === "1";
  const submission = flags.hasSupabasePublic
    ? await (async () => {
        const user = await requireUser();
        const supabase = await createSupabaseServerClient();
        return getSubmissionForUser(supabase, id, user.id);
      })()
    : getDemoSubmissionById(id);

  if (!submission) {
    notFound();
  }

  const report = submission.report_json;
  const overallTone = getScoreTone(submission.overall_score);

  return (
    <div className="page-shell">
      <main className="mx-auto flex w-full max-w-6xl flex-1 flex-col gap-8 px-6 py-8 lg:px-10">
        <section className="glass-card rounded-[2.5rem] p-8">
          {isFreshReport && submission.report_json ? (
            <div className="mb-6 rounded-[1.5rem] border border-emerald-300/25 bg-emerald-300/10 px-5 py-4 text-sm leading-7 text-emerald-100">
              <p className="font-medium">Report ready</p>
              <p className="mt-2 text-emerald-100/85">
                Your draft has been scored, the citation checks are ready to review, and the
                original upload has already been removed from storage after processing.
              </p>
            </div>
          ) : null}

          <div className="grid gap-6 lg:grid-cols-[1.1fr_0.9fr]">
            <div>
              <p className="eyebrow">Analysis report</p>
              <h1 className="mt-4 font-display text-5xl text-[var(--foreground)]">
                {submission.title}
              </h1>
              <p className="mt-4 max-w-3xl text-sm leading-7 text-[var(--muted)]">
                {submission.report_excerpt ?? submission.file_name}
              </p>

              <div className="mt-6 flex flex-wrap gap-3">
                <span
                  className={cn(
                    "rounded-full px-3 py-1 text-xs uppercase tracking-[0.16em]",
                    overallTone.className,
                  )}
                >
                  {overallTone.label}
                </span>
                <span className="rounded-full border border-[var(--border)] px-3 py-1 text-xs uppercase tracking-[0.16em] text-[var(--muted)]">
                  {submission.status}
                </span>
                <span className="rounded-full border border-[var(--border)] px-3 py-1 text-xs uppercase tracking-[0.16em] text-[var(--muted)]">
                  {submission.citation_style.toUpperCase()} citations
                </span>
                <span className="rounded-full border border-[var(--border)] px-3 py-1 text-xs uppercase tracking-[0.16em] text-[var(--muted)]">
                  {flags.hasOpenAI ? "AI-assisted mode" : "Fallback mode"}
                </span>
              </div>
            </div>

            <div className="report-hero-score">
              <p className="text-xs uppercase tracking-[0.18em] text-[var(--muted-soft)]">
                Overall score
              </p>
              <div className="mt-4 flex items-end justify-between gap-4">
                <div>
                  <p className="font-display text-7xl leading-none text-[var(--foreground)]">
                    {submission.overall_score ?? "-"}
                  </p>
                  <p className="mt-2 text-xs uppercase tracking-[0.18em] text-[var(--muted-soft)]">
                    out of 100
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-sm text-[var(--muted)]">
                    A quick-read signal for overall quality, evidence use, and citation reliability.
                  </p>
                </div>
              </div>

              <div className="mt-5 report-score-bar">
                <span style={{ width: `${submission.overall_score ?? 0}%` }} />
              </div>
            </div>
          </div>

          {flags.isDemoMode ? (
            <div className="mt-6 rounded-[1.5rem] border border-sky-400/30 bg-sky-400/10 px-5 py-4 text-sm leading-7 text-sky-100">
              Demo mode is active. This report is sample data so you can review the
              scoring, citation table, and rewrite flow before connecting Supabase and
              OpenAI.
            </div>
          ) : null}
        </section>

        {report ? (
          <>
            <section className="grid gap-4 md:grid-cols-4">
              <InfoPill label="Completed" value={formatDateTime(submission.completed_at)} />
              <InfoPill label="Word count" value={String(submission.word_count)} />
              <InfoPill label="Source checks" value={String(report.citationVerification.length)} />
              <InfoPill
                label="Rewrite suggestions"
                value={String(report.rewriteSuggestions.length)}
              />
            </section>

            {report.trustSummary ? (
              <section className="grid gap-6 lg:grid-cols-[0.9fr_1.1fr]">
                <div className="glass-card rounded-[2rem] p-6">
                  <p className="eyebrow">Trust layer</p>
                  <div className="mt-5 flex items-end justify-between gap-5">
                    <div>
                      <p className="font-display text-6xl leading-none text-[var(--foreground)]">
                        {report.trustSummary.overallTrustScore}
                      </p>
                      <p className="mt-2 text-xs uppercase tracking-[0.18em] text-[var(--muted-soft)]">
                        trust score
                      </p>
                    </div>
                    <p className="max-w-xs text-right text-sm leading-7 text-[var(--muted)]">
                      Confidence reflects available evidence, not guaranteed truth.
                    </p>
                  </div>
                  <div className="mt-5 report-score-bar">
                    <span style={{ width: `${report.trustSummary.overallTrustScore}%` }} />
                  </div>

                  <div className="mt-5 grid gap-3 sm:grid-cols-2">
                    <InfoPill
                      label="Supported"
                      value={String(report.trustSummary.supportedClaims)}
                    />
                    <InfoPill
                      label="Partial"
                      value={String(report.trustSummary.partiallySupportedClaims)}
                    />
                    <InfoPill
                      label="Unsupported"
                      value={String(report.trustSummary.unsupportedClaims)}
                    />
                    <InfoPill
                      label="Uncertain"
                      value={String(report.trustSummary.uncertainClaims)}
                    />
                  </div>
                </div>

                <div className="glass-card rounded-[2rem] p-6">
                  <p className="eyebrow">Safe-failure policy</p>
                  <p className="mt-4 text-base leading-8 text-[var(--foreground)]">
                    {report.trustSummary.uncertaintyPolicy}
                  </p>
                  <div className="mt-5 space-y-3">
                    {report.trustSummary.safeFailureNotes.map((note) => (
                      <div
                        key={note}
                        className="rounded-[1.2rem] border border-amber-300/20 bg-amber-300/8 px-4 py-3 text-sm leading-7 text-amber-100"
                      >
                        {note}
                      </div>
                    ))}
                  </div>
                </div>
              </section>
            ) : null}

            <section className="grid gap-4 lg:grid-cols-5">
              {report.rubric.map((score) => (
                <RubricCard key={score.key} score={score} />
              ))}
            </section>

            {report.claimFindings?.length ? (
              <section className="glass-card rounded-[2rem] p-6">
                <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
                  <div className="space-y-2">
                    <p className="eyebrow">Claim-level review</p>
                    <h2 className="font-display text-3xl text-[var(--foreground)]">
                      Evidence and uncertainty findings
                    </h2>
                  </div>
                  <p className="max-w-xl text-sm leading-7 text-[var(--muted)]">
                    DraftLens separates source existence from claim support. Unsupported
                    statements are prompts for revision, not verdicts about the author.
                  </p>
                </div>

                <div className="mt-6 space-y-4">
                  {report.claimFindings.map((finding) => (
                    <article key={finding.id} className="trust-claim-card">
                      <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
                        <div className="space-y-3">
                          <div className="flex flex-wrap gap-2">
                            <ClaimVerdictChip verdict={finding.verdict} />
                            <RiskPill risk={finding.riskLevel} />
                            {finding.needsEvidence ? (
                              <span className="rounded-full border border-sky-300/20 px-3 py-1 text-xs uppercase tracking-[0.16em] text-sky-100">
                                evidence required
                              </span>
                            ) : null}
                          </div>
                          <p className="text-base leading-8 text-[var(--foreground)]">
                            {finding.claim}
                          </p>
                        </div>
                        <div className="min-w-28 text-left lg:text-right">
                          <p className="font-display text-3xl text-[var(--foreground)]">
                            {finding.confidence}
                          </p>
                          <p className="text-xs uppercase tracking-[0.16em] text-[var(--muted-soft)]">
                            confidence
                          </p>
                        </div>
                      </div>

                      <div className="mt-4 grid gap-4 lg:grid-cols-[0.9fr_1.1fr]">
                        <div className="rounded-[1.2rem] border border-[var(--border)] p-4">
                          <p className="text-xs uppercase tracking-[0.16em] text-[var(--muted-soft)]">
                            Uncertainty
                          </p>
                          <p className="mt-2 text-sm leading-7 text-[var(--muted)]">
                            {finding.uncertainty}
                          </p>
                          <p className="mt-3 text-xs uppercase tracking-[0.16em] text-[var(--muted-soft)]">
                            Page {finding.sourceSpan.page ?? "-"} / Paragraph{" "}
                            {finding.sourceSpan.paragraph ?? "-"}
                          </p>
                        </div>

                        <div className="space-y-3">
                          {finding.evidence.length ? (
                            finding.evidence.map((evidence) => (
                              <div
                                key={`${finding.id}-${evidence.title}-${evidence.notes}`}
                                className="rounded-[1.2rem] border border-[var(--border)] p-4"
                              >
                                <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                                  <p className="text-sm font-medium text-[var(--foreground)]">
                                    {evidence.title}
                                  </p>
                                  <span className="rounded-full bg-white/6 px-3 py-1 text-xs uppercase tracking-[0.16em] text-[var(--muted)]">
                                    {evidence.sourceType.replaceAll("_", " ")}
                                  </span>
                                </div>
                                {evidence.quote ? (
                                  <p className="mt-3 text-sm leading-7 text-[var(--muted)]">
                                    &ldquo;{evidence.quote}&rdquo;
                                  </p>
                                ) : null}
                                <p className="mt-3 text-sm leading-7 text-[var(--muted)]">
                                  {evidence.notes}
                                  {evidence.url ? (
                                    <>
                                      {" "}
                                      <a
                                        className="text-[var(--accent-strong)]"
                                        href={evidence.url}
                                        rel="noreferrer"
                                        target="_blank"
                                      >
                                        View source
                                      </a>
                                    </>
                                  ) : null}
                                </p>
                              </div>
                            ))
                          ) : (
                            <div className="rounded-[1.2rem] border border-rose-300/20 bg-rose-300/8 p-4 text-sm leading-7 text-rose-100">
                              No evidence candidate was strong enough to attach.
                            </div>
                          )}
                        </div>
                      </div>

                      <div className="mt-4 rounded-[1.2rem] border border-[var(--border)] bg-black/10 px-4 py-3 text-sm leading-7 text-[var(--foreground)]">
                        {finding.recommendation}
                      </div>
                    </article>
                  ))}
                </div>
              </section>
            ) : null}

            <section className="grid gap-6 lg:grid-cols-[1.1fr_0.9fr]">
              <div className="space-y-6">
                <div className="glass-card rounded-[2rem] p-6">
                  <p className="eyebrow">Executive summary</p>
                  <p className="mt-4 text-base leading-8 text-[var(--foreground)]">
                    {report.summary}
                  </p>
                </div>

                <div className="grid gap-6 lg:grid-cols-[0.95fr_1.05fr]">
                  <div className="glass-card rounded-[2rem] p-6">
                    <p className="eyebrow">Strengths</p>
                    <ul className="mt-4 space-y-4 text-sm leading-7 text-[var(--muted)]">
                      {report.strengths.map((strength, index) => (
                        <li key={strength} className="report-list-item">
                          <span className="report-list-index">{index + 1}</span>
                          <span>{strength}</span>
                        </li>
                      ))}
                    </ul>
                  </div>

                  <div className="glass-card rounded-[2rem] p-6">
                    <p className="eyebrow">Highest-priority fixes</p>
                    <ul className="mt-4 space-y-4 text-sm leading-7 text-[var(--muted)]">
                      {report.highestPriorityFixes.map((fix, index) => (
                        <li key={fix} className="report-list-item">
                          <span className="report-list-index report-list-index-danger">
                            {index + 1}
                          </span>
                          <span>{fix}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>
              </div>

              <div className="glass-card rounded-[2rem] p-6 lg:sticky lg:top-8 lg:self-start">
                <p className="eyebrow">How to read this</p>
                <div className="mt-4 space-y-4 text-sm leading-7 text-[var(--muted)]">
                  <p>
                    The overall score gives a fast snapshot. The rubric cards show where the
                    draft is strongest and where revision will create the biggest improvement.
                  </p>
                  <p>
                    Citation statuses tell you how confident the metadata lookup is that a
                    source exists and matches the reference entry.
                  </p>
                  <p>
                    {flags.hasOpenAI
                      ? "This environment is using AI-assisted analysis, so summaries and rewrites can be more nuanced."
                      : "This environment is using fallback analysis, so the report still works but the language generation is intentionally simpler."}
                  </p>
                </div>

                <div className="mt-6 space-y-3">
                  <div className="flex items-center justify-between gap-3 rounded-[1.2rem] border border-[var(--border)] px-4 py-3">
                    <span className="text-sm text-[var(--foreground)]">Matched</span>
                    <span className="text-xs uppercase tracking-[0.16em] text-emerald-100">
                      strong source match
                    </span>
                  </div>
                  <div className="flex items-center justify-between gap-3 rounded-[1.2rem] border border-[var(--border)] px-4 py-3">
                    <span className="text-sm text-[var(--foreground)]">Possible match</span>
                    <span className="text-xs uppercase tracking-[0.16em] text-amber-100">
                      review manually
                    </span>
                  </div>
                  <div className="flex items-center justify-between gap-3 rounded-[1.2rem] border border-[var(--border)] px-4 py-3">
                    <span className="text-sm text-[var(--foreground)]">Not found</span>
                    <span className="text-xs uppercase tracking-[0.16em] text-rose-100">
                      weak metadata trail
                    </span>
                  </div>
                  <div className="flex items-center justify-between gap-3 rounded-[1.2rem] border border-[var(--border)] px-4 py-3">
                    <span className="text-sm text-[var(--foreground)]">Malformed</span>
                    <span className="text-xs uppercase tracking-[0.16em] text-slate-100">
                      citation format issue
                    </span>
                  </div>
                </div>
              </div>
            </section>

            <section className="glass-card rounded-[2rem] p-6">
              <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
                <div className="space-y-2">
                  <p className="eyebrow">Citation verification</p>
                  <h2 className="font-display text-3xl text-[var(--foreground)]">
                    Source confidence table
                  </h2>
                </div>
                <p className="max-w-xl text-sm leading-7 text-[var(--muted)]">
                  Use this section to spot missing metadata, references worth manually
                  checking, and the strongest source matches in the bibliography.
                </p>
              </div>

              <div className="table-shell mt-6">
                <table>
                  <thead>
                    <tr className="text-xs uppercase tracking-[0.18em] text-[var(--muted-soft)]">
                      <th>Reference</th>
                      <th>Status</th>
                      <th>Confidence</th>
                      <th>Notes</th>
                    </tr>
                  </thead>
                  <tbody>
                    {report.citationVerification.map((entry) => (
                      <tr key={`${entry.entry}-${entry.notes}`}>
                        <td className="text-sm leading-7 text-[var(--foreground)]">{entry.entry}</td>
                        <td>
                          <CitationStatusChip status={entry.status} />
                        </td>
                        <td className="text-sm text-[var(--foreground)]">
                          <div className="space-y-2">
                            <div className="flex items-center gap-3">
                              <span>{entry.confidence}</span>
                              <div className="report-confidence-bar">
                                <span style={{ width: `${entry.confidence}%` }} />
                              </div>
                            </div>
                            <p className="text-xs uppercase tracking-[0.16em] text-[var(--muted-soft)]">
                              {getConfidenceLabel(entry.confidence)}
                            </p>
                          </div>
                        </td>
                        <td className="text-sm leading-7 text-[var(--muted)]">
                          {entry.notes}
                          {entry.url ? (
                            <>
                              {" "}
                              <a
                                className="text-[var(--accent-strong)]"
                                href={entry.url}
                                rel="noreferrer"
                                target="_blank"
                              >
                                View source
                              </a>
                            </>
                          ) : null}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </section>

            <RewriteLab
              initialSuggestions={report.rewriteSuggestions}
              submissionId={submission.id}
            />

            {report.reviewTrace ? (
              <section className="glass-card rounded-[2rem] p-6">
                <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
                  <div>
                    <p className="eyebrow">Review trace</p>
                    <h2 className="mt-2 font-display text-3xl text-[var(--foreground)]">
                      What happened during this review
                    </h2>
                  </div>
                  <div className="flex flex-wrap gap-3 text-xs uppercase tracking-[0.16em] text-[var(--muted)]">
                    <span className="rounded-full border border-[var(--border)] px-3 py-1">
                      {report.reviewTrace.status}
                    </span>
                    <span className="rounded-full border border-[var(--border)] px-3 py-1">
                      {report.reviewTrace.totalLatencyMs ?? 0} ms
                    </span>
                    <span className="rounded-full border border-[var(--border)] px-3 py-1">
                      ${report.reviewTrace.estimatedCostUsd?.toFixed(2) ?? "0.00"}
                    </span>
                  </div>
                </div>

                <div className="mt-5 flex flex-wrap gap-2">
                  {report.reviewTrace.passes.map((pass) => (
                    <span
                      key={pass}
                      className="rounded-full bg-white/6 px-3 py-1 text-xs uppercase tracking-[0.16em] text-[var(--muted)]"
                    >
                      {pass.replaceAll("_", " ")}
                    </span>
                  ))}
                </div>

                <div className="mt-5 grid gap-3 lg:grid-cols-2">
                  {report.reviewTrace.steps.map((step) => (
                    <div
                      key={`${step.name}-${step.status}`}
                      className="rounded-[1.2rem] border border-[var(--border)] p-4"
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <p className="text-sm font-medium text-[var(--foreground)]">
                            {step.name.replaceAll("_", " ")}
                          </p>
                          <p className="mt-1 text-xs uppercase tracking-[0.16em] text-[var(--muted-soft)]">
                            {step.model ?? "deterministic"}
                          </p>
                        </div>
                        <span className="rounded-full bg-white/6 px-3 py-1 text-xs uppercase tracking-[0.16em] text-[var(--muted)]">
                          {step.status}
                        </span>
                      </div>
                      {step.notes ? (
                        <p className="mt-3 text-sm leading-7 text-[var(--muted)]">
                          {step.notes}
                        </p>
                      ) : null}
                    </div>
                  ))}
                </div>
              </section>
            ) : null}
          </>
        ) : (
          <section className="glass-card rounded-[2rem] p-6">
            <p className="eyebrow">Analysis status</p>
            <div className="mt-4 space-y-4 text-sm leading-7">
              <p className="text-rose-300">
                {submission.error_message ?? "This submission has not finished processing yet."}
              </p>
              <p className="text-[var(--muted)]">
                If this run failed, your reserved credit should be released automatically so you
                can upload a corrected file and try again.
              </p>
              <p className="text-[var(--muted)]">
                Best results come from text-based PDFs or DOCX files with a clear references
                section and standard paragraph structure.
              </p>
            </div>
          </section>
        )}
      </main>
    </div>
  );
}
