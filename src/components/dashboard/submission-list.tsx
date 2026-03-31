import Link from "next/link";

import type { SubmissionRecord } from "@/lib/types";
import { cn, formatDateTime } from "@/lib/utils";

const statusTone: Record<SubmissionRecord["status"], string> = {
  completed: "bg-emerald-400/15 text-emerald-100",
  processing: "bg-sky-400/15 text-sky-100",
  failed: "bg-rose-400/15 text-rose-100",
};

type SubmissionListProps = {
  submissions: SubmissionRecord[];
};

export function SubmissionList({ submissions }: SubmissionListProps) {
  if (!submissions.length) {
    return (
      <div className="glass-card rounded-[2rem] p-8">
        <p className="eyebrow">No reports yet</p>
        <h3 className="mt-3 font-display text-3xl text-[var(--foreground)]">
          Your history will build from the first upload
        </h3>
        <p className="mt-4 max-w-2xl text-sm leading-7 text-[var(--muted)]">
          Once you analyze a draft, DraftLens keeps the score, citation review, and
          rewrite suggestions here so you can come back to them later.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {submissions.map((submission) => (
        <Link
          key={submission.id}
          href={`/dashboard/submissions/${submission.id}`}
          className="glass-card flex flex-col gap-4 rounded-[2rem] p-6 transition hover:-translate-y-0.5"
        >
          <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
            <div>
              <p className="font-display text-2xl text-[var(--foreground)]">
                {submission.title}
              </p>
              <p className="mt-2 max-w-2xl text-sm leading-7 text-[var(--muted)]">
                {submission.report_excerpt ?? submission.file_name}
              </p>
            </div>
            <div
              className={cn(
                "inline-flex w-fit rounded-full px-3 py-1 text-xs uppercase tracking-[0.18em]",
                statusTone[submission.status],
              )}
            >
              {submission.status}
            </div>
          </div>

          <div className="grid gap-3 text-sm text-[var(--muted)] md:grid-cols-4">
            <div>
              <span className="block text-xs uppercase tracking-[0.18em] text-[var(--muted-soft)]">
                Score
              </span>
              <span className="text-[var(--foreground)]">
                {submission.overall_score ? `${submission.overall_score}/100` : "Pending"}
              </span>
            </div>
            <div>
              <span className="block text-xs uppercase tracking-[0.18em] text-[var(--muted-soft)]">
                Style
              </span>
              <span className="text-[var(--foreground)]">
                {submission.citation_style.toUpperCase()}
              </span>
            </div>
            <div>
              <span className="block text-xs uppercase tracking-[0.18em] text-[var(--muted-soft)]">
                Words
              </span>
              <span className="text-[var(--foreground)]">{submission.word_count || "-"}</span>
            </div>
            <div>
              <span className="block text-xs uppercase tracking-[0.18em] text-[var(--muted-soft)]">
                Updated
              </span>
              <span className="text-[var(--foreground)]">
                {formatDateTime(submission.completed_at ?? submission.updated_at)}
              </span>
            </div>
          </div>

          {submission.status === "processing" ? (
            <div className="rounded-[1.2rem] border border-sky-300/20 bg-sky-300/8 px-4 py-3 text-sm leading-7 text-sky-100">
              Analysis is still running. Open this item in a moment to see the full score
              breakdown and citation table.
            </div>
          ) : null}

          {submission.status === "failed" && submission.error_message ? (
            <div className="rounded-[1.2rem] border border-rose-300/20 bg-rose-300/8 px-4 py-3 text-sm leading-7 text-rose-100">
              {submission.error_message}
            </div>
          ) : null}
        </Link>
      ))}
    </div>
  );
}
