"use client";

import Link from "next/link";
import { Button } from "@/components/ui/button";
import { useTheme } from "@/theme";

const nextUp = [
  {
    title: "Voice chat",
    horizon: "Next",
    body: "Speak in English, Hindi, or Punjabi. Speech-to-text in, text-to-speech out — built for users who prefer talking over typing.",
  },
  {
    title: "Resume upload",
    horizon: "Next",
    body: "Drop a CV and we extract education, skills, and experience into the profile form for you to confirm before anything is saved.",
  },
  {
    title: "Conversation memory",
    horizon: "Next",
    body: "Follow-ups like “the second one” or “only in Ludhiana” will use the same thread instead of treating every message as a new search.",
  },
  {
    title: "Live PGRKAM data",
    horizon: "Next",
    body: "Jobs, schemes, and knowledge chunks will refresh from the official portal instead of the current hand-seeded demo set.",
  },
];

const later = [
  {
    title: "Skill-gap + courses",
    horizon: "Later",
    body: "On each job, see which skills you already match, what’s missing, and a short list of relevant training options.",
  },
  {
    title: "Scheme eligibility scoring",
    horizon: "Later",
    body: "A structured check against unemployment allowance and self-employment schemes — not just a text summary of the scheme page.",
  },
  {
    title: "Saved jobs & email alerts",
    horizon: "Later",
    body: "Bookmark listings and get notified when a matching vacancy is added. Outbound mail is already wired via Resend.",
  },
  {
    title: "Answer feedback",
    horizon: "Later",
    body: "Thumbs up/down on replies, with an optional reason, so unanswered or weak queries can be reviewed and improved.",
  },
  {
    title: "Screen explainer",
    horizon: "Later",
    body: "Point the assistant at a PGRKAM page (or a screenshot) and get a plain-language walkthrough of what to tap next.",
  },
  {
    title: "Admin analytics",
    horizon: "Later",
    body: "Query volume, fallback rate, top intents, and which recommendation CTAs people actually use.",
  },
  {
    title: "Overseas & counselling",
    horizon: "Later",
    body: "Guidance for overseas employment/study, plus discovery of counselling and job-fair events listed on PGRKAM.",
  },
  {
    title: "Streaming replies",
    horizon: "Later",
    body: "Tokens appear as they generate, with a clear “thinking” state — same answers, faster perceived response.",
  },
];

export default function UpcomingPage() {
  const { classes: t } = useTheme();

  return (
    <main className={`${t.page} pb-20 pt-10 md:pt-14`}>
      <section className="max-w-3xl animate-rise">
        <p className={t.eyebrow}>Roadmap</p>
        <h1 className={`mt-2 ${t.titleHero}`}>Upcoming features</h1>
        <p className="mt-4 max-w-2xl text-base leading-relaxed text-muted-foreground md:text-lg">
          The live product is the SIH MVP: multilingual chat, grounded RAG, job search, and
          explainable recommendations. These items are designed and scoped for later — they are
          not available yet.
        </p>
        <p className={`mt-4 ${t.muted}`}>
          Already shipping:{" "}
          <Link href="/chat" className={t.link}>
            chat
          </Link>
          ,{" "}
          <Link href="/jobs" className={t.link}>
            jobs
          </Link>
          , and{" "}
          <Link href="/recommendations" className={t.link}>
            ranked matches
          </Link>
          .
        </p>
      </section>

      <section className="mt-12 md:mt-16">
        <p className={t.eyebrow}>Priority</p>
        <h2 className={`mt-2 ${t.title}`}>Next up</h2>
        <p className={`max-w-2xl ${t.lead}`}>
          Highest impact after the current demo is stable: voice, resume, multi-turn chat, and live
          portal data.
        </p>
        <ul className="mt-8 border-t border-line">
          {nextUp.map((item) => (
            <li key={item.title} className="grid gap-2 border-b border-line py-6 md:grid-cols-[7rem_1fr]">
              <span className={t.chip}>{item.horizon}</span>
              <div>
                <h3 className={t.titleSection}>{item.title}</h3>
                <p className="mt-2 max-w-2xl text-sm leading-6 text-mute">{item.body}</p>
              </div>
            </li>
          ))}
        </ul>
      </section>

      <section className="mt-14 md:mt-20">
        <p className={t.eyebrow}>Stretch</p>
        <h2 className={`mt-2 ${t.title}`}>Later</h2>
        <p className={`max-w-2xl ${t.lead}`}>
          Differentiator and stretch work from the product plan. We will pick these up one at a
          time after the core demo stays reliable.
        </p>
        <ul className="mt-8 border-t border-line">
          {later.map((item) => (
            <li key={item.title} className="grid gap-2 border-b border-line py-6 md:grid-cols-[7rem_1fr]">
              <span className={t.chip}>{item.horizon}</span>
              <div>
                <h3 className={t.titleSection}>{item.title}</h3>
                <p className="mt-2 max-w-2xl text-sm leading-6 text-mute">{item.body}</p>
              </div>
            </li>
          ))}
        </ul>
      </section>

      <section
        className={`${t.surfacePad} mt-16 flex flex-col gap-4 md:flex-row md:items-center md:justify-between`}
      >
        <div>
          <p className={t.eyebrow}>Use what’s live</p>
          <h2 className={`mt-2 ${t.title}`}>Try the copilot now</h2>
          <p className={t.lead}>Ask about jobs, schemes, or registration — with citations, not guesses.</p>
        </div>
        <div className="flex flex-wrap gap-3">
          <Button asChild>
            <Link href="/chat">Open chat</Link>
          </Button>
          <Button asChild variant="outline">
            <Link href="/">Back home</Link>
          </Button>
        </div>
      </section>
    </main>
  );
}
