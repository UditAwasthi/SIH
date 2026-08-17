"use client";

import Link from "next/link";
import { useAuth } from "@/components/auth-provider";
import { Button } from "@/components/ui/button";
import { useTheme } from "@/theme";

const features = [
  {
    title: "Multilingual chat",
    body: "Ask in English, Hindi, or Punjabi. The copilot detects language and answers in the one you used.",
    href: "/chat",
    cta: "Open chat",
  },
  {
    title: "Structured job search",
    body: "Filter Punjab listings by location, sector, and qualification — then open a role for full details.",
    href: "/jobs",
    cta: "Browse jobs",
  },
  {
    title: "Ranked matches",
    body: "Save a profile once. Recommendations score skills, education, and location with a short “why”.",
    href: "/recommendations",
    cta: "See matches",
  },
  {
    title: "Cited, not guessed",
    body: "Scheme and guidance answers stay grounded in PGRKAM sources. Weak context is refused instead of invented.",
    href: "/chat",
    cta: "Ask a scheme question",
  },
];

const steps = [
  {
    n: "01",
    title: "Ask or browse",
    body: "Start in chat, or search seeded PGRKAM-style jobs without writing a prompt.",
  },
  {
    n: "02",
    title: "Save a profile",
    body: "Education, skills, location, and sectors power ranked recommendations.",
  },
  {
    n: "03",
    title: "Take the official next step",
    body: "Replies include verified navigation CTAs — never LLM-invented URLs.",
  },
];

const languages = [
  { code: "EN", label: "English" },
  { code: "HI", label: "हिन्दी" },
  { code: "PA", label: "ਪੰਜਾਬੀ" },
];

export default function Home() {
  const { classes: t } = useTheme();
  const { isAuthenticated, loading } = useAuth();

  return (
    <main className={`${t.page} pb-20 pt-10 md:pt-16`}>
      <section className="grid gap-10 md:grid-cols-[1.15fr_0.85fr] md:items-center">
        <div className="animate-rise">
          <p className={t.eyebrow}>Punjab employment copilot</p>
          <h1 className={`mt-3 ${t.titleHero}`}>Career guidance that stays on PGRKAM facts.</h1>
          <p className="mt-5 max-w-xl text-base leading-relaxed text-muted-foreground md:text-lg">
            Find jobs, check schemes, and reach the right official action — in English, Hindi, or
            Punjabi — with citations instead of guesses.
          </p>
          <div className="mt-7 flex flex-wrap items-center gap-3">
            <Button asChild size="lg">
              <Link href="/chat">Start chatting</Link>
            </Button>
            <Button asChild variant="outline" size="lg">
              <Link href="/jobs">Browse jobs</Link>
            </Button>
            {!loading && !isAuthenticated && (
              <Link href="/signup" className={t.link}>
                Create an account
              </Link>
            )}
          </div>
          <div className="mt-8 flex flex-wrap gap-2">
            {languages.map((lang) => (
              <span key={lang.code} className={t.chip}>
                {lang.code} · {lang.label}
              </span>
            ))}
          </div>
        </div>

        <aside
          className={`${t.surfacePad} animate-rise space-y-4`}
          style={{ animationDelay: "90ms" }}
        >
          <p className={t.eyebrow}>What you can ask</p>
          <ul className="space-y-3 text-sm leading-relaxed text-muted-foreground">
            <li className="rounded-xl border border-dashed border-line bg-brand-soft/40 px-4 py-3">
              “Find IT jobs in Punjab for a B.Tech CSE fresher.”
            </li>
            <li className="rounded-xl border border-dashed border-line bg-brand-soft/40 px-4 py-3">
              “Am I eligible for unemployment allowance?”
            </li>
            <li className="rounded-xl border border-dashed border-line bg-brand-soft/40 px-4 py-3">
              “Where do I register on PGRKAM?”
            </li>
          </ul>
          <Link href="/chat" className={`inline-block ${t.link}`}>
            Try these in chat
          </Link>
        </aside>
      </section>

      <section className="mt-16 md:mt-20">
        <p className={t.eyebrow}>Capabilities</p>
        <h2 className={`mt-2 ${t.title}`}>Built for Punjab jobseekers</h2>
        <p className={`max-w-2xl ${t.lead}`}>
          Chat, listings, and recommendations share one grounded knowledge base — jobs, schemes,
          and official next steps.
        </p>
        <div className="mt-8 grid gap-4 sm:grid-cols-2">
          {features.map((feature, index) => (
            <article
              key={feature.title}
              className={`${t.card} animate-rise`}
              style={{ animationDelay: `${index * 70}ms` }}
            >
              <h3 className={t.titleSection}>{feature.title}</h3>
              <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{feature.body}</p>
              <Link href={feature.href} className={`mt-4 inline-block ${t.link}`}>
                {feature.cta}
              </Link>
            </article>
          ))}
        </div>
      </section>

      <section className="mt-16 md:mt-20">
        <p className={t.eyebrow}>How it works</p>
        <h2 className={`mt-2 ${t.title}`}>Three steps to a verified next action</h2>
        <ol className="mt-8 grid gap-4 md:grid-cols-3">
          {steps.map((step) => (
            <li key={step.n} className={`${t.surfacePad}`}>
              <p className="font-display text-sm font-bold text-accent">{step.n}</p>
              <h3 className={`mt-2 ${t.titleSection}`}>{step.title}</h3>
              <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{step.body}</p>
            </li>
          ))}
        </ol>
      </section>

      <section className={`${t.surfacePad} mt-16 flex flex-col gap-4 md:mt-20 md:flex-row md:items-center md:justify-between`}>
        <div>
          <p className={t.eyebrow}>Ready when you are</p>
          <h2 className={`mt-2 ${t.title}`}>Ask the copilot, or jump straight to jobs.</h2>
          <p className={t.lead}>
            Guest chat works immediately. Sign up to save a profile and ranked matches.{" "}
            <Link href="/upcoming" className={t.link}>
              See what’s next
            </Link>
            .
          </p>
        </div>
        <div className="flex flex-wrap gap-3">
          <Button asChild>
            <Link href="/chat">Open chat</Link>
          </Button>
          {!loading && !isAuthenticated ? (
            <Button asChild variant="secondary">
              <Link href="/signup">Sign up</Link>
            </Button>
          ) : (
            <Button asChild variant="secondary">
              <Link href="/profile">Your profile</Link>
            </Button>
          )}
        </div>
      </section>
    </main>
  );
}
