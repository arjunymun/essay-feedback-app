"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";

type UploadFormProps = {
  creditsRemaining: number;
};

export function UploadForm({ creditsRemaining }: UploadFormProps) {
  const router = useRouter();
  const [title, setTitle] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);

    if (!file) {
      setError("Choose a DOCX or text-based PDF file first.");
      return;
    }

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
          submission?: { id: string };
        };

        if (!response.ok || !payload.submission) {
          setError(payload.error ?? "The upload could not be analyzed.");
          return;
        }

        router.push(`/dashboard/submissions/${payload.submission.id}`);
        router.refresh();
      } catch (unknownError) {
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
          {creditsRemaining} free analyses remaining
        </div>
      </div>

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
          disabled={isPending || creditsRemaining <= 0}
          type="submit"
        >
          {isPending ? "Analyzing..." : "Analyze essay"}
        </button>
      </form>

      {error ? <p className="mt-4 text-sm text-rose-300">{error}</p> : null}
    </div>
  );
}
