import { notFound } from "next/navigation";

import { RewriteLab } from "@/components/dashboard/rewrite-lab";
import { requireUser } from "@/lib/auth";
import { getSubmissionForUser } from "@/lib/data";
import { getDemoSubmissionById } from "@/lib/demo";
import { flags } from "@/lib/env";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import type { CitationVerificationResult, RubricScore } from "@/lib/types";
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
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
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

            <section className="grid gap-4 lg:grid-cols-5">
              {report.rubric.map((score) => (
                <RubricCard key={score.key} score={score} />
              ))}
            </section>

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
          </>
        ) : (
          <section className="glass-card rounded-[2rem] p-6 text-sm text-rose-300">
            {submission.error_message ?? "This submission has not finished processing yet."}
          </section>
        )}
      </main>
    </div>
  );
}
