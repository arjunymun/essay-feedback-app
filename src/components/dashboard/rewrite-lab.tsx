"use client";

import { useState, useTransition } from "react";

import type { RewriteSuggestion } from "@/lib/types";

type RewriteLabProps = {
  submissionId: string;
  initialSuggestions: RewriteSuggestion[];
};

export function RewriteLab({
  submissionId,
  initialSuggestions,
}: RewriteLabProps) {
  const [excerpt, setExcerpt] = useState(
    initialSuggestions[0]?.originalExcerpt ?? "",
  );
  const [rewrite, setRewrite] = useState<string | null>(
    initialSuggestions[0]?.improvedVersion ?? null,
  );
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  return (
    <div className="glass-card rounded-[2rem] p-6">
      <div className="space-y-2">
        <p className="eyebrow">Natural voice rewrite</p>
        <h3 className="font-display text-3xl text-[var(--foreground)]">
          Refresh one passage
        </h3>
        <p className="text-sm leading-7 text-[var(--muted)]">
          Paste a paragraph from the essay and DraftLens will produce a cleaner version that keeps the same meaning.
        </p>
      </div>

      <div className="mt-6 grid gap-5 lg:grid-cols-2">
        <label className="space-y-2">
          <span className="text-sm text-[var(--muted)]">Original excerpt</span>
          <textarea
            className="input-field min-h-52 resize-y"
            value={excerpt}
            onChange={(event) => setExcerpt(event.target.value)}
          />
        </label>

        <div className="space-y-2">
          <span className="text-sm text-[var(--muted)]">Rewritten excerpt</span>
          <div className="min-h-52 rounded-[1.25rem] border border-[var(--border)] bg-black/10 p-4 text-sm leading-7 text-[var(--foreground)]">
            {rewrite ?? "Run a rewrite to generate a fresh revision."}
          </div>
        </div>
      </div>

      {error ? <p className="mt-4 text-sm text-rose-300">{error}</p> : null}

      <button
        className="primary-button mt-5"
        disabled={isPending}
        onClick={() => {
          setError(null);
          startTransition(async () => {
            try {
              const response = await fetch(`/api/submissions/${submissionId}/rewrite`, {
                method: "POST",
                headers: {
                  "Content-Type": "application/json",
                },
                body: JSON.stringify({ excerpt }),
              });
              const payload = (await response.json()) as {
                error?: string;
                rewrite?: string;
              };

              if (!response.ok || !payload.rewrite) {
                setError(payload.error ?? "Rewrite generation failed.");
                return;
              }

              setRewrite(payload.rewrite);
            } catch (unknownError) {
              setError(
                unknownError instanceof Error
                  ? unknownError.message
                  : "Rewrite generation failed.",
              );
            }
          });
        }}
        type="button"
      >
        {isPending ? "Rewriting..." : "Generate revision"}
      </button>
    </div>
  );
}
