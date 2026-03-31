"use client";

import { useEffect, useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";

import { BuyCreditsButton } from "@/components/billing/buy-credits-button";
import { STARTER_PACK_KEY } from "@/lib/constants";

type UploadFormProps = {
  creditsRemaining: number;
  demoMode?: boolean;
};

export function UploadForm({
  creditsRemaining,
  demoMode = false,
}: UploadFormProps) {
  const progressLabels = [
    "Uploading your document",
    "Extracting essay text and citations",
    "Scoring the draft against the rubric",
    "Preparing your report",
  ];
  const router = useRouter();
  const [title, setTitle] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [progressIndex, setProgressIndex] = useState(0);
  const [isPending, startTransition] = useTransition();

  useEffect(() => {
    if (!isPending) {
      return;
    }

    const interval = window.setInterval(() => {
      setProgressIndex((current) =>
        current < progressLabels.length - 1 ? current + 1 : current,
      );
    }, 1800);

    return () => window.clearInterval(interval);
  }, [isPending, progressLabels.length]);

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);

    if (!file) {
      setError("Choose a DOCX or text-based PDF file first.");
      return;
    }

    setProgressIndex(0);

    startTransition(async () => {
      try {
        const formData = new FormData();
        formData.append("file", file);
        if (title.trim()) {
          formData.append("title", title.trim());
        }

        const response = await fetch("/api/submissions", {
          method: "POST",
          body: formData,
        });

        const payload = (await response.json()) as {
          error?: string;
          code?: string;
          submission?: { id: string };
        };

        if (!response.ok || !payload.submission) {
          setProgressIndex(0);
          setError(payload.error ?? "The upload could not be analyzed.");
          return;
        }

        router.push(`/dashboard/submissions/${payload.submission.id}?fresh=1`);
        router.refresh();
      } catch (unknownError) {
        setProgressIndex(0);
        setError(
          unknownError instanceof Error
            ? unknownError.message
            : "The upload could not be analyzed.",
        );
      }
    });
  }

  return (
    <div className="glass-card rounded-[2rem] p-6">
      <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
        <div>
          <p className="eyebrow">New analysis</p>
          <h2 className="font-display text-3xl text-[var(--foreground)]">
            Upload an essay for scoring
          </h2>
          <p className="mt-2 max-w-2xl text-sm leading-7 text-[var(--muted)]">
            v1 supports DOCX and text-based PDF files up to 10 MB and roughly 8,000 words.
          </p>
        </div>
        <div className="rounded-full border border-[var(--border)] px-4 py-2 text-sm text-[var(--muted)]">
          {creditsRemaining} credits remaining
        </div>
      </div>

      {demoMode ? (
        <div className="mt-6 rounded-[1.5rem] border border-sky-300/20 bg-sky-300/8 p-5 text-sm leading-7 text-sky-100">
          <p className="font-medium">Demo mode is active</p>
          <p className="mt-2 text-sky-100/80">
            The full upload pipeline needs Supabase and OpenAI keys. You can still explore the product from the seeded sample report.
          </p>
          <Link
            className="mt-4 inline-flex rounded-full border border-sky-200/30 px-4 py-2 text-sm"
            href="/dashboard/submissions/demo-report"
          >
            Open demo report
          </Link>
        </div>
      ) : null}

      <form className="mt-6 grid gap-5 md:grid-cols-[1.2fr_1fr_auto]" onSubmit={handleSubmit}>
        <label className="space-y-2">
          <span className="text-sm text-[var(--muted)]">Essay title</span>
          <input
            className="input-field"
            placeholder="Optional. We will infer a title if you leave this blank."
            value={title}
            onChange={(event) => setTitle(event.target.value)}
          />
        </label>

        <label className="space-y-2">
          <span className="text-sm text-[var(--muted)]">Document</span>
          <input
            accept=".docx,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
            className="input-file"
            onChange={(event) => setFile(event.target.files?.[0] ?? null)}
            type="file"
          />
        </label>

        <button
          className="primary-button h-[52px] self-end"
          disabled={demoMode || isPending || creditsRemaining <= 0}
          type="submit"
        >
          {demoMode ? "Backend setup required" : isPending ? "Analyzing..." : "Analyze essay"}
        </button>
      </form>

      {file ? (
        <div className="mt-5 grid gap-4 lg:grid-cols-[1.05fr_0.95fr]">
          <div className="metric-card">
            <p className="text-xs uppercase tracking-[0.18em] text-[var(--muted-soft)]">
              Selected file
            </p>
            <div className="mt-3 flex flex-wrap items-center gap-3">
              <span className="rounded-full bg-white/6 px-3 py-1 text-sm text-[var(--foreground)]">
                {file.name}
              </span>
              <span className="text-sm text-[var(--muted)]">
                {(file.size / (1024 * 1024)).toFixed(2)} MB
              </span>
            </div>
            <p className="mt-3 text-sm leading-7 text-[var(--muted)]">
              DraftLens stores the source file briefly for processing, then deletes it after
              the analysis completes.
            </p>
          </div>

          <div className="metric-card">
            <p className="text-xs uppercase tracking-[0.18em] text-[var(--muted-soft)]">
              Before you upload
            </p>
            <ul className="mt-3 space-y-2 text-sm leading-7 text-[var(--muted)]">
              <li>Use a text-based PDF or DOCX file.</li>
              <li>Keep the essay under roughly 8,000 words.</li>
              <li>Include a references section if you want citation checks.</li>
            </ul>
          </div>
        </div>
      ) : null}

      {isPending ? (
        <div className="mt-5 rounded-[1.6rem] border border-sky-300/20 bg-sky-300/8 p-5">
          <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
            <div>
              <p className="eyebrow">Analysis in progress</p>
              <h3 className="mt-2 font-display text-2xl text-[var(--foreground)]">
                Building your feedback report
              </h3>
            </div>
            <p className="text-sm text-sky-100/80">This usually takes a few seconds.</p>
          </div>

          <div className="mt-5 upload-progress-bar">
            <span
              style={{
                width: `${((progressIndex + 1) / progressLabels.length) * 100}%`,
              }}
            />
          </div>

          <div className="mt-5 grid gap-3 md:grid-cols-2">
            {progressLabels.map((label, index) => {
              const state =
                index < progressIndex ? "done" : index === progressIndex ? "active" : "idle";

              return (
                <div
                  key={label}
                  className={`upload-progress-step upload-progress-step-${state}`}
                >
                  <span className="upload-progress-index">{index + 1}</span>
                  <span>{label}</span>
                </div>
              );
            })}
          </div>
        </div>
      ) : null}

      {error ? <p className="mt-4 text-sm text-rose-300">{error}</p> : null}
      {error?.includes("available credits") ? (
        <div className="mt-4 rounded-[1.4rem] border border-amber-300/20 bg-amber-300/8 p-4 text-sm leading-7 text-amber-100">
          <p className="font-medium">You are out of credits.</p>
          <p className="mt-2 text-amber-100/85">
            Buy the starter pack to unlock 10 more analyses and keep using the full workflow.
          </p>
          <div className="mt-4 flex flex-wrap gap-3">
            <BuyCreditsButton className="primary-button" packKey={STARTER_PACK_KEY}>
              Buy 10 more analyses
            </BuyCreditsButton>
            <Link className="secondary-button" href="/pricing">
              View pricing
            </Link>
          </div>
        </div>
      ) : null}
    </div>
  );
}
