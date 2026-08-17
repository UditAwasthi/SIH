"use client";

import Link from "next/link";
import { Chat } from "@/components/chat";
import { useTheme } from "@/theme";

export default function ChatPage() {
  const { classes: t } = useTheme();

  return (
    <main className={`${t.page} pb-16 pt-8 md:pt-12`}>
      <section className="mb-8 max-w-3xl animate-rise">
        <p className={t.eyebrow}>Punjab employment copilot</p>
        <h1 className={`mt-2 ${t.titleHero}`}>Ask PGRKAM AI</h1>
        <p className="mt-4 max-w-xl text-[15px] leading-6 text-mute md:text-base">
          Find jobs, verify schemes, and reach the right PGRKAM action — in English, Hindi, or
          Punjabi — with cited answers instead of guesses.
        </p>
        <p className={`mt-4 ${t.muted}`}>
          <Link href="/signup" className={t.link}>
            Create an account
          </Link>{" "}
          to save your profile and unlock personalized recommendations.
        </p>
      </section>
      <Chat />
    </main>
  );
}
