"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { FormEvent, Suspense, useEffect, useState } from "react";
import { useAuth } from "@/components/auth-provider";
import { ApiError } from "@/lib/api";
import { useTheme } from "@/theme";

function SignUpForm() {
  const { classes: t } = useTheme();
  const { signUp, isAuthenticated, loading } = useAuth();
  const router = useRouter();
  const searchParams = useSearchParams();
  const next = searchParams.get("next") || "/profile?onboarding=1";
  const [name, setName] = useState("");
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
      const user = await signUp({ name, email, password });
      router.push(user.hasProfile ? "/profile" : "/profile?onboarding=1");
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Could not create account.");
    } finally {
      setPending(false);
    }
  }

  return (
    <main className={t.pageAuth}>
      <p className={t.eyebrow}>Create account</p>
      <h1 className={`mt-2 ${t.title}`}>Join PGRKAM AI</h1>
      <p className={t.lead}>Sign up to save your profile and get personalized job recommendations.</p>

      <form className={`mt-6 space-y-4 ${t.surfacePad}`} onSubmit={onSubmit}>
        <label className={t.label}>
          Full name
          <input
            className={t.input}
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Aman Singh"
            required
            minLength={2}
            autoComplete="name"
          />
        </label>
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
            placeholder="At least 8 characters"
            required
            minLength={8}
            autoComplete="new-password"
          />
        </label>
        {error && <p className={t.error}>{error}</p>}
        <button className={t.buttonPrimaryBlock} disabled={pending}>
          {pending ? "Creating account…" : "Create account"}
        </button>
      </form>

      <p className={`mt-4 text-center ${t.muted}`}>
        Already have an account?{" "}
        <Link href={`/signin?next=${encodeURIComponent(next)}`} className={t.link}>
          Sign in
        </Link>
      </p>
    </main>
  );
}

export default function SignUpPage() {
  return (
    <Suspense fallback={<main className="px-4 py-16 text-center text-sm text-muted-foreground">Loading…</main>}>
      <SignUpForm />
    </Suspense>
  );
}
