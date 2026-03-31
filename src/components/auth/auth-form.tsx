"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";

import { createSupabaseBrowserClient } from "@/lib/supabase/browser";

type AuthFormProps = {
  mode: "sign-in" | "sign-up";
};

export function AuthForm({ mode }: AuthFormProps) {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const title = mode === "sign-in" ? "Welcome back" : "Create your account";
  const buttonLabel = mode === "sign-in" ? "Sign in" : "Create account";

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setMessage(null);

    startTransition(async () => {
      try {
        const supabase = createSupabaseBrowserClient();

        if (mode === "sign-in") {
          const { error: signInError } = await supabase.auth.signInWithPassword({
            email,
            password,
          });

          if (signInError) {
            setError(signInError.message);
            return;
          }

          router.push("/dashboard");
          router.refresh();
          return;
        }

        const { error: signUpError, data } = await supabase.auth.signUp({
          email,
          password,
          options: {
            emailRedirectTo: `${window.location.origin}/auth/callback?next=/dashboard`,
          },
        });

        if (signUpError) {
          setError(signUpError.message);
          return;
        }

        if (data.session) {
          router.push("/dashboard");
          router.refresh();
          return;
        }

        setMessage(
          "Check your email to confirm the account, then come back here to continue.",
        );
      } catch (unknownError) {
        setError(
          unknownError instanceof Error
            ? unknownError.message
            : "Something went wrong while signing you in.",
        );
      }
    });
  }

  return (
    <div className="glass-card w-full max-w-md rounded-[2rem] p-8">
      <div className="space-y-3">
        <p className="eyebrow">Student workspace</p>
        <h1 className="font-display text-4xl text-[var(--foreground)]">{title}</h1>
        <p className="text-sm leading-7 text-[var(--muted)]">
          Upload essays, get rubric-based feedback, and keep a private report history tied to your account.
        </p>
      </div>

      <form className="mt-8 space-y-5" onSubmit={handleSubmit}>
        <label className="block space-y-2">
          <span className="text-sm text-[var(--muted)]">Email</span>
          <input
            className="input-field"
            autoComplete="email"
            type="email"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            required
          />
        </label>

        <label className="block space-y-2">
          <span className="text-sm text-[var(--muted)]">Password</span>
          <input
            className="input-field"
            autoComplete={mode === "sign-in" ? "current-password" : "new-password"}
            type="password"
            minLength={8}
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            required
          />
        </label>

        {error ? <p className="text-sm text-rose-300">{error}</p> : null}
        {message ? <p className="text-sm text-emerald-200">{message}</p> : null}

        <button className="primary-button w-full" disabled={isPending} type="submit">
          {isPending ? "Working..." : buttonLabel}
        </button>
      </form>
    </div>
  );
}
