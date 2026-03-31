import Link from "next/link";

import { APP_NAME } from "@/lib/constants";

type SiteHeaderProps = {
  signedIn?: boolean;
};

export function SiteHeader({ signedIn = false }: SiteHeaderProps) {
  return (
    <header className="mx-auto flex w-full max-w-6xl items-center justify-between px-6 py-6 lg:px-10">
      <Link href="/" className="flex items-center gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-[var(--accent)] text-sm font-semibold text-[var(--surface)]">
          DL
        </div>
        <div>
          <div className="font-display text-lg text-[var(--foreground)]">{APP_NAME}</div>
          <div className="text-xs uppercase tracking-[0.24em] text-[var(--muted)]">
            Writing feedback studio
          </div>
        </div>
      </Link>

      <nav className="flex items-center gap-3 text-sm">
        <Link href="/pricing" className="rounded-full px-4 py-2 text-[var(--muted)] transition hover:text-[var(--foreground)]">
          Pricing
        </Link>
        <Link
          href={signedIn ? "/dashboard" : "/sign-in"}
          className="rounded-full border border-[var(--border-strong)] px-4 py-2 text-[var(--foreground)] transition hover:-translate-y-0.5"
        >
          {signedIn ? "Dashboard" : "Sign in"}
        </Link>
      </nav>
    </header>
  );
}
