"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { FormEvent, Suspense, useEffect, useState } from "react";
import { useAuth } from "@/components/auth-provider";
import { ApiError } from "@/lib/api";
import { useTheme } from "@/theme";

function SignInForm() {
  const { classes: t } = useTheme();
  const { signIn, isAuthenticated, loading } = useAuth();
  const router = useRouter();
  const searchParams = useSearchParams();
  const next = searchParams.get("next") || "/profile";
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  useEffect(() => {
    if (!loading && isAuthenticated) {
      router.replace(next.startsWith("/") ? next : "/profile");
    }
  }, [loading, isAuthenticated, next, router]);

  async function onSubmit(event: FormEvent) {
    event.preventDefault();
    setError(null);
    setPending(true);
    try {
      const user = await signIn(email, password);
      if (!user.hasProfile) router.push("/profile?onboarding=1");
      else router.push(next.startsWith("/") ? next : "/profile");
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Could not sign in.");
    } finally {
      setPending(false);
    }
  }

  return (
    <main className={t.pageAuth}>
      <p className={t.eyebrow}>Welcome back</p>
      <h1 className={`mt-2 ${t.title}`}>Sign in</h1>
      <p className={t.lead}>Access your saved profile and personalized recommendations.</p>

      <form className={`mt-6 space-y-4 ${t.surfacePad}`} onSubmit={onSubmit}>
        <label className={t.label}>
          Email
          <input
            className={t.input}
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="you@example.com"
            required
            autoComplete="email"
          />
        </label>
        <label className={t.label}>
          Password
          <input
            className={t.input}
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="Your password"
            required
            minLength={8}
            autoComplete="current-password"
          />
        </label>
        {error && <p className={t.error}>{error}</p>}
        <button className={t.buttonPrimaryBlock} disabled={pending}>
          {pending ? "Signing in…" : "Sign in"}
        </button>
      </form>

      <p className={`mt-4 text-center ${t.muted}`}>
        New here?{" "}
        <Link href={`/signup?next=${encodeURIComponent(next)}`} className={t.link}>
          Create an account
        </Link>
      </p>
    </main>
  );
}

export default function SignInPage() {
  return (
    <Suspense fallback={<main className="px-4 py-16 text-center text-sm text-muted-foreground">Loading…</main>}>
      <SignInForm />
    </Suspense>
  );
}
