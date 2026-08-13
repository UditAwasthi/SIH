import { Chat } from "@/components/chat";

export default function Home() {
  return (
    <main className="mx-auto max-w-6xl px-4 pb-16 pt-8 md:px-6 md:pt-12">
      <section className="mb-8 max-w-3xl animate-rise">
        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-brand/70">
          Punjab employment copilot
        </p>
        <h1 className="mt-2 font-display text-4xl font-extrabold leading-[1.05] text-brand md:text-6xl">
          PGRKAM AI
        </h1>
        <p className="mt-4 max-w-xl text-base text-muted-foreground md:text-lg">
          Find jobs, verify schemes, and reach the right PGRKAM action — in English, Hindi, or
          Punjabi — with cited answers instead of guesses.
        </p>
      </section>
      <Chat />
    </main>
  );
}
