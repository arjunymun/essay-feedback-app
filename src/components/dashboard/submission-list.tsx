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
      <div className="glass-card rounded-[2rem] p-8 text-sm leading-7 text-[var(--muted)]">
        Your report history will appear here after the first upload.
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
              <span className="text-[var(--foreground)]">{submission.word_count || "—"}</span>
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
        </Link>
      ))}
    </div>
  );
}
