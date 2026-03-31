import { notFound } from "next/navigation";

import { RewriteLab } from "@/components/dashboard/rewrite-lab";
import { requireUser } from "@/lib/auth";
import { getSubmissionForUser } from "@/lib/data";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import type { CitationVerificationResult, RubricScore } from "@/lib/types";
import { cn, formatDateTime } from "@/lib/utils";

export const dynamic = "force-dynamic";

function RubricCard({ score }: { score: RubricScore }) {
  return (
    <div className="metric-card">
      <p className="text-xs uppercase tracking-[0.18em] text-[var(--muted-soft)]">
        {score.label}
      </p>
      <div className="mt-3 flex items-end justify-between gap-3">
        <p className="font-display text-4xl text-[var(--foreground)]">{score.score}</p>
        <p className="text-xs text-[var(--muted-soft)]">/100</p>
      </div>
      <p className="mt-3 text-sm leading-7 text-[var(--muted)]">{score.summary}</p>
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

export default async function SubmissionDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const user = await requireUser();
  const supabase = await createSupabaseServerClient();
  const submission = await getSubmissionForUser(supabase, id, user.id);

  if (!submission) {
    notFound();
  }

  const report = submission.report_json;

  return (
    <div className="page-shell">
      <main className="mx-auto flex w-full max-w-6xl flex-1 flex-col gap-8 px-6 py-8 lg:px-10">
        <section className="glass-card rounded-[2.5rem] p-8">
          <p className="eyebrow">Analysis report</p>
          <div className="mt-4 flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <h1 className="font-display text-5xl text-[var(--foreground)]">
                {submission.title}
              </h1>
              <p className="mt-3 max-w-3xl text-sm leading-7 text-[var(--muted)]">
                {submission.report_excerpt ?? submission.file_name}
              </p>
            </div>

            <div className="rounded-[1.5rem] border border-[var(--border)] bg-black/10 px-5 py-4">
              <p className="text-xs uppercase tracking-[0.18em] text-[var(--muted-soft)]">
                Overall score
              </p>
              <p className="mt-2 font-display text-5xl text-[var(--foreground)]">
                {submission.overall_score ?? "—"}
              </p>
            </div>
          </div>

          <div className="mt-6 grid gap-4 text-sm text-[var(--muted)] md:grid-cols-4">
            <div className="metric-card">
              <p className="text-xs uppercase tracking-[0.18em] text-[var(--muted-soft)]">
                Status
              </p>
              <p className="mt-3 text-[var(--foreground)]">{submission.status}</p>
            </div>
            <div className="metric-card">
              <p className="text-xs uppercase tracking-[0.18em] text-[var(--muted-soft)]">
                Citation style
              </p>
              <p className="mt-3 text-[var(--foreground)]">
                {submission.citation_style.toUpperCase()}
              </p>
            </div>
            <div className="metric-card">
              <p className="text-xs uppercase tracking-[0.18em] text-[var(--muted-soft)]">
                Words
              </p>
              <p className="mt-3 text-[var(--foreground)]">{submission.word_count}</p>
            </div>
            <div className="metric-card">
              <p className="text-xs uppercase tracking-[0.18em] text-[var(--muted-soft)]">
                Completed
              </p>
              <p className="mt-3 text-[var(--foreground)]">
                {formatDateTime(submission.completed_at)}
              </p>
            </div>
          </div>
        </section>

        {report ? (
          <>
            <section className="grid gap-4 lg:grid-cols-5">
              {report.rubric.map((score) => (
                <RubricCard key={score.key} score={score} />
              ))}
            </section>

            <section className="grid gap-6 lg:grid-cols-3">
              <div className="glass-card rounded-[2rem] p-6 lg:col-span-3">
                <p className="eyebrow">Executive summary</p>
                <p className="mt-4 text-base leading-8 text-[var(--foreground)]">
                  {report.summary}
                </p>
              </div>

              <div className="glass-card rounded-[2rem] p-6">
                <p className="eyebrow">Strengths</p>
                <ul className="mt-4 space-y-3 text-sm leading-7 text-[var(--muted)]">
                  {report.strengths.map((strength) => (
                    <li key={strength}>{strength}</li>
                  ))}
                </ul>
              </div>

              <div className="glass-card rounded-[2rem] p-6 lg:col-span-2">
                <p className="eyebrow">Highest-priority fixes</p>
                <ul className="mt-4 space-y-3 text-sm leading-7 text-[var(--muted)]">
                  {report.highestPriorityFixes.map((fix) => (
                    <li key={fix}>{fix}</li>
                  ))}
                </ul>
              </div>
            </section>

            <section className="glass-card rounded-[2rem] p-6">
              <div className="space-y-2">
                <p className="eyebrow">Citation verification</p>
                <h2 className="font-display text-3xl text-[var(--foreground)]">
                  Source confidence table
                </h2>
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
                        <td className="text-sm text-[var(--foreground)]">{entry.confidence}</td>
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
