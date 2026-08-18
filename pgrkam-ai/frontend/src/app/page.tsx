"use client";

import Image from "next/image";
import Link from "next/link";
import { FormEvent, useEffect, useState } from "react";
import { useAuth } from "@/components/auth-provider";
import { DotMatrix, Led } from "@/components/ui/dot-matrix";
import { ApiError, subscribeToAlerts } from "@/lib/api";

const paths = [
  {
    id: "private-jobs",
    index: "A1",
    title: "Private jobs",
    note: "IT, manufacturing, retail — listed for Punjab.",
    href: "/jobs",
    action: "See private jobs",
  },
  {
    id: "govt-jobs",
    index: "A2",
    title: "Government jobs",
    note: "State and central vacancies, with exam dates when they exist.",
    href: "/jobs",
    action: "See government jobs",
  },
  {
    id: "foreign-study",
    index: "B1",
    title: "Study and work abroad",
    note: "Counseling that points to verified partners, not ads.",
    href: "/upcoming",
    action: "Read what’s coming",
  },
  {
    id: "self-employment",
    index: "B2",
    title: "Start on your own",
    note: "Schemes, funding notes, and the form you actually file.",
    href: "/chat",
    action: "Ask about schemes",
  },
  {
    id: "skill-development",
    index: "C1",
    title: "Learn a skill",
    note: "Training that matches the jobs on this portal.",
    href: "/chat",
    action: "Find a course",
  },
] as const;

export default function HomePage() {
  const { isAuthenticated, loading } = useAuth();
  const [clock, setClock] = useState("00:00:00");
  const [subscribeEmail, setSubscribeEmail] = useState("");
  const [subscribeStatus, setSubscribeStatus] = useState<"idle" | "pending" | "success" | "error">("idle");
  const [subscribeMessage, setSubscribeMessage] = useState<string | null>(null);

  useEffect(() => {
    const tick = () => setClock(new Date().toLocaleTimeString("en-GB", { hour12: false }));
    tick();
    const id = window.setInterval(tick, 1000);
    return () => window.clearInterval(id);
  }, []);

  async function onSubscribe(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const email = subscribeEmail.trim();
    if (!email) return;

    setSubscribeStatus("pending");
    setSubscribeMessage(null);

    try {
      const result = await subscribeToAlerts(email);
      setSubscribeStatus("success");
      setSubscribeMessage(result.message);
      setSubscribeEmail("");
    } catch (err) {
      setSubscribeStatus("error");
      setSubscribeMessage(
        err instanceof ApiError
          ? err.message
          : "Could not subscribe right now. Please try again.",
      );
    }
  }

  return (
    <div className="bg-void text-glyph">
      <header className="relative overflow-hidden border-b border-line">
        <div className="mx-auto grid max-w-6xl gap-10 px-4 py-12 pl-6 md:grid-cols-12 md:px-10 md:py-16 md:pl-rail">
          <div className="md:col-span-7">
            <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
              <DotMatrix cols={6} rows={1} activeIndex={0} />
              <p className="meta">Punjab / En Hi Pa</p>
              <p className="meta">{clock}</p>
            </div>
            <p className="mb-16 mt-16 font-display text-[clamp(3.5rem,11vw,8rem)] font-medium leading-[0.6] text-glyph">
              PGRKAM
            </p>
            <h1 className="mt-6 max-w-md text-[clamp(1.4rem,2.6vw,2rem)] font-medium leading-snug text-glyph">
              Find work in Punjab.
            </h1>
            <p className="mt-4 max-w-sm text-[15px] leading-6 text-mute">
              Ask in Punjabi, Hindi, or English. Get the listing, the scheme, and the official next
              step — not a guess.
            </p>
            <div className="mt-8 flex flex-wrap items-center gap-3">
              <Link href="/chat" className="hw-btn hw-btn-primary">
                <Led on size={6} className="!bg-glyph" />
                Talk to assistant
              </Link>
              <Link href="/jobs" className="hw-btn">
                See jobs
              </Link>
              {!loading && !isAuthenticated && (
                <Link href="/signup" className="px-2 py-3 text-sm text-mute hover:text-glyph">
                  Create an account
                </Link>
              )}
            </div>
          </div>

        {/*  <div className="relative md:col-span-5 md:col-start-8">*/}
        {/*    <div className="relative aspect-[4/5] overflow-hidden border border-line bg-raised md:mt-10">*/}
        {/*      <Image*/}
        {/*        src="/images/hero-illustration.jpeg"*/}
        {/*        alt="People across Punjab at work and in training, gathered under the PGRKAM mission"*/}
        {/*        fill*/}
        {/*        priority*/}
        {/*        className="object-cover object-center grayscale contrast-110"*/}
        {/*        sizes="(min-width: 768px) 30vw, 100vw"*/}
        {/*      />*/}
        {/*      <div className="absolute inset-0 bg-void/25" />*/}
        {/*      <div className="absolute left-3 top-3 flex items-center gap-2">*/}
        {/*        <Led active />*/}
        {/*        <span className="meta !text-glyph">Glyph / 01</span>*/}
        {/*      </div>*/}
        {/*      <div className="absolute bottom-3 left-3 right-3 flex justify-between">*/}
        {/*        <span className="meta">31.147 n</span>*/}
        {/*        <span className="meta">75.341 e</span>*/}
        {/*      </div>*/}
        {/*    </div>*/}
        {/*  </div>*/}
        </div>
      </header>

      <nav className="border-b border-line">
        <div className="mx-auto flex max-w-6xl flex-wrap gap-x-8 gap-y-3 px-4 py-4 pl-6 md:px-10 md:pl-rail">
          {[
            { href: "#paths", label: "Paths" },
            { href: "#assistant", label: "Assistant" },
            { href: "#alerts", label: "Alerts" },
          ].map((item, index) => (
            <a key={item.href} href={item.href} className="inline-flex items-center gap-2 text-sm text-mute hover:text-glyph">
              <Led on={index === 0} size={5} />
              {item.label}
            </a>
          ))}
        </div>
      </nav>

      <section id="paths" className="px-4 py-section pl-6 md:px-10 md:pl-rail">
        <div className="mx-auto grid max-w-6xl gap-12 md:grid-cols-12">
          <div className="md:col-span-4">
            <p className="meta">Index / paths</p>
            <h2 className="mt-3 font-display text-[clamp(1.8rem,3vw,2.6rem)] font-medium leading-none text-glyph">
              Paths you can take
            </h2>
            <p className="mt-4 max-w-xs text-[15px] leading-6 text-mute">
              Five doors on the same portal. Pick one and go through it.
            </p>
            <DotMatrix className="mt-8" rows={3} cols={5} activeIndex={0} />
          </div>
          <ul className="border-t border-line md:col-span-8">
            {paths.map((path) => (
              <li key={path.id} id={path.id} className="border-b border-line">
                <Link
                  href={path.href}
                  className="group grid grid-cols-[3rem_1fr_auto] items-baseline gap-4 py-6"
                >
                  <span className="font-mono text-[11px] text-mute">{path.index}</span>
                  <span>
                    <h3 className="font-display text-xl font-medium text-glyph group-hover:text-led md:text-2xl">
                      {path.title}
                    </h3>
                    <p className="mt-2 max-w-md text-sm leading-6 text-mute">{path.note}</p>
                  </span>
                  <span className="hidden items-center gap-2 font-mono text-[11px] uppercase tracking-[0.12em] text-mute group-hover:text-glyph sm:inline-flex">
                    {path.action}
                    <Led size={5} />
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        </div>
      </section>

      <section id="assistant" className="border-t border-line px-4 py-section pl-6 md:px-10 md:pl-rail">
        <div className="mx-auto grid max-w-6xl items-end gap-12 md:grid-cols-12">
          <div className="md:col-span-5">
            <p className="meta">Channel / 24.7</p>
            <h2 className="mt-3 font-display text-[clamp(1.8rem,3vw,2.6rem)] font-medium leading-none text-glyph">
              Ask the way you speak
            </h2>
            <p className="mt-4 max-w-sm text-[15px] leading-6 text-mute">
              The assistant answers from PGRKAM listings and schemes. If it does not know, it says
              so — then points you to the official page.
            </p>
            <Link href="/chat" className="hw-btn hw-btn-primary mt-8">
              Open the assistant
            </Link>
          </div>
          <div className="border border-line bg-raised p-5 md:col-span-6 md:col-start-7">
            <div className="flex items-center justify-between">
              <span className="meta">Live thread</span>
              <span className="inline-flex items-center gap-2 font-mono text-[10px] uppercase tracking-[0.14em] text-mute">
                <Led active busy />
                Online
              </span>
            </div>
            <p className="mt-6 ml-8 border border-led/50 px-4 py-3 text-sm text-glyph">
              Ludhiana vich government clerk di job hai?
            </p>
            <div className="mt-3 mr-4 border border-line px-4 py-3 text-sm leading-6 text-mute">
              Haan. Municipal Corporation te Revenue Department vich clerk ate data-entry openings
              listed han.{" "}
              <Link href="/jobs" className="text-glyph underline decoration-struct underline-offset-4 hover:text-led">
                Open the jobs list
              </Link>
            </div>
          </div>
        </div>
      </section>

      <section id="alerts" className="border-t border-line bg-raised px-4 py-section pl-6 md:px-10 md:pl-rail">
        <div className="mx-auto grid max-w-6xl gap-10 md:grid-cols-12">
          <div className="md:col-span-5">
            <p className="meta">Signal / mail</p>
            <h2 className="mt-3 font-display text-[clamp(1.8rem,3vw,2.6rem)] font-medium leading-none">
              Get new listings
            </h2>
            <p className="mt-4 text-[15px] leading-6 text-mute">
              Jobs, training camps, and career fairs in Punjab — sent when they go up, not as a
              daily dump.
            </p>
          </div>
          <form onSubmit={onSubscribe} className="flex flex-col gap-4 md:col-span-6 md:col-start-7 md:flex-row md:items-end">
            <label className="flex-1">
              <span className="meta">Email</span>
              <input
                id="subscribe-email"
                required
                type="email"
                value={subscribeEmail}
                onChange={(event) => setSubscribeEmail(event.target.value)}
                placeholder="you@punjab.gov.in"
                className="panel-input mt-2"
                disabled={subscribeStatus === "pending"}
              />
            </label>
            <button
              type="submit"
              className="hw-btn hw-btn-primary"
              disabled={subscribeStatus === "pending" || !subscribeEmail.trim()}
            >
              {subscribeStatus === "pending" ? "Subscribing…" : "Subscribe"}
            </button>
            {subscribeMessage && (
              <p
                className={`md:col-span-2 font-mono text-xs ${
                  subscribeStatus === "error" ? "text-led" : "text-mute"
                }`}
                role="status"
              >
                {subscribeMessage}
              </p>
            )}
          </form>
        </div>
      </section>

      <footer className="border-t border-line px-4 py-10 pl-6 md:px-10 md:pl-rail">
        <div className="mx-auto flex max-w-6xl flex-col gap-4 md:flex-row md:items-end md:justify-between">
          <p className="flex items-center gap-2 font-display text-xl font-medium">
            <Led active />
            PGRKAM
          </p>
          <p className="font-mono text-[11px] uppercase tracking-[0.12em] text-mute">
            © {new Date().getFullYear()} Punjab Ghar Ghar Rozgar and Karobar Mission
          </p>
        </div>
      </footer>
    </div>
  );
}