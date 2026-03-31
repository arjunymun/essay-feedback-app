"use client";

import { useState, useTransition } from "react";

type BuyCreditsButtonProps = {
  packKey: string;
  className?: string;
  children: React.ReactNode;
};

export function BuyCreditsButton({
  packKey,
  className,
  children,
}: BuyCreditsButtonProps) {
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  return (
    <div className="space-y-3">
      <button
        className={className}
        disabled={isPending}
        onClick={() => {
          setError(null);

          startTransition(async () => {
            try {
              const response = await fetch("/api/billing/checkout", {
                method: "POST",
                headers: {
                  "Content-Type": "application/json",
                },
                body: JSON.stringify({ packKey }),
              });

              const payload = (await response.json()) as {
                error?: string;
                checkoutUrl?: string;
              };

              if (!response.ok || !payload.checkoutUrl) {
                setError(payload.error ?? "Checkout could not be started.");
                return;
              }

              window.location.assign(payload.checkoutUrl);
            } catch (unknownError) {
              setError(
                unknownError instanceof Error
                  ? unknownError.message
                  : "Checkout could not be started.",
              );
            }
          });
        }}
        type="button"
      >
        {isPending ? "Opening checkout..." : children}
      </button>

      {error ? <p className="text-sm text-rose-300">{error}</p> : null}
    </div>
  );
}
