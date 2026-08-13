"use client";

import { EXAMPLE_PROMPTS, type SupportedLanguage } from "@pgrkam-ai/shared";
import { FormEvent, useEffect, useRef, useState } from "react";
import { JobCard } from "@/components/job-card";
import { ApiError, ChatResponse, Job, NavigationCta, Recommendation, api, ensureGuest } from "@/lib/api";

type ChatItem = {
  role: "user" | "assistant";
  content: string;
  language?: SupportedLanguage;
  intent?: string;
  sources?: Array<{ sourceUrl: string }>;
  jobs?: Job[];
  recommendations?: Recommendation[];
  navigation?: NavigationCta | null;
};

const languageLabel: Record<SupportedLanguage, string> = {
  en: "English",
  hi: "हिन्दी",
  pa: "ਪੰਜਾਬੀ",
};

export function Chat({ initialPrompt }: { initialPrompt?: string }) {
  const [items, setItems] = useState<ChatItem[]>([]);
  const [value, setValue] = useState(initialPrompt ?? "");
  const [conversationId, setConversationId] = useState<string>();
  const [preferredLang, setPreferredLang] = useState<SupportedLanguage>("en");
  const [detectedLang, setDetectedLang] = useState<SupportedLanguage | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [ready, setReady] = useState(false);
  const [pending, setPending] = useState(false);
  const scroller = useRef<HTMLDivElement>(null);

  useEffect(() => {
    void ensureGuest()
      .then(() => setReady(true))
      .catch(() => setError("Could not start a guest session. Is the API running?"));
  }, []);

  useEffect(() => {
    scroller.current?.scrollTo({ top: scroller.current.scrollHeight, behavior: "smooth" });
  }, [items, pending]);

  async function sendMessage(content: string) {
    if (!content.trim() || pending || !ready) return;
    setError(null);
    setValue("");
    setItems((old) => [...old, { role: "user", content }]);
    setPending(true);

    try {
      const response = await api<ChatResponse>("/chat/message", {
        method: "POST",
        body: JSON.stringify({ content, conversationId }),
      });
      setConversationId(response.conversationId);
      setDetectedLang(response.intent.language);
      setItems((old) => [
        ...old,
        {
          role: "assistant",
          content: response.message.content,
          language: response.intent.language,
          intent: response.intent.intent,
          sources: response.sources?.length ? response.sources : response.message.sources ?? [],
          jobs: response.jobs,
          recommendations: response.recommendations,
          navigation: response.navigation,
        },
      ]);
    } catch (err) {
      const message =
        err instanceof ApiError && err.status === 429
          ? "You're sending messages too quickly. Please wait a moment."
          : "I'm having trouble connecting. Please try again.";
      setError(message);
      setItems((old) => [...old, { role: "assistant", content: message }]);
    } finally {
      setPending(false);
    }
  }

  function onSubmit(event: FormEvent) {
    event.preventDefault();
    void sendMessage(value);
  }

  const prompts = EXAMPLE_PROMPTS[preferredLang];

  return (
    <section className="surface animate-rise overflow-hidden">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-line px-4 py-3">
        <div>
          <h2 className="font-display text-lg font-bold text-brand">Career chat</h2>
          <p className="text-xs text-muted-foreground">
            Grounded answers with citations · guest session
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2 text-xs">
          <label className="flex items-center gap-2 rounded-full bg-muted px-3 py-1.5">
            <span className="text-muted-foreground">Reply preference</span>
            <select
              className="bg-transparent font-semibold text-brand outline-none"
              value={preferredLang}
              onChange={(event) => setPreferredLang(event.target.value as SupportedLanguage)}
            >
              <option value="en">English</option>
              <option value="hi">हिन्दी</option>
              <option value="pa">ਪੰਜਾਬੀ</option>
            </select>
          </label>
          {detectedLang && (
            <span className="rounded-full border border-line px-3 py-1.5 text-muted-foreground">
              Detected: <strong className="text-brand">{languageLabel[detectedLang]}</strong>
            </span>
          )}
        </div>
      </div>

      <div ref={scroller} className="h-[26rem] space-y-3 overflow-y-auto px-4 py-4 md:h-[30rem]">
        {items.length === 0 && (
          <div className="space-y-3">
            <p className="text-sm text-muted-foreground">
              Try an example in {languageLabel[preferredLang]}:
            </p>
            <div className="grid gap-2">
              {prompts.map((prompt) => (
                <button
                  key={prompt}
                  type="button"
                  className="rounded-xl border border-dashed border-line bg-brand-soft/40 px-3 py-2 text-left text-sm transition hover:border-brand/40 hover:bg-brand-soft"
                  onClick={() => void sendMessage(prompt)}
                >
                  {prompt}
                </button>
              ))}
            </div>
          </div>
        )}

        {items.map((item, index) => (
          <article
            key={`${item.role}-${index}`}
            className={
              item.role === "user"
                ? "ml-6 rounded-2xl bg-brand px-4 py-3 text-white md:ml-16"
                : "mr-4 space-y-3 rounded-2xl bg-muted/70 px-4 py-3 md:mr-12"
            }
          >
            <p className="whitespace-pre-wrap text-sm leading-relaxed">{item.content}</p>
            {item.intent && item.role === "assistant" && (
              <p className="text-[11px] uppercase tracking-wide text-muted-foreground">
                Intent: {item.intent}
                {item.language ? ` · ${languageLabel[item.language]}` : ""}
              </p>
            )}
            {item.jobs && item.jobs.length > 0 && (
              <div className="grid gap-2">
                {item.jobs.slice(0, 5).map((job) => {
                  const match = item.recommendations?.find((rec) => rec.job.id === job.id);
                  const why = match
                    ? [
                        ...(match.why.matchedSkills.length
                          ? [`Skills: ${match.why.matchedSkills.join(", ")}`]
                          : []),
                        ...(match.why.educationMatch ? ["Education match"] : []),
                        ...(match.why.locationMatch ? ["Location match"] : []),
                        ...(match.why.sectorMatch ? ["Sector preference"] : []),
                      ]
                    : undefined;
                  return <JobCard key={job.id} job={job} score={match?.score} why={why} />;
                })}
              </div>
            )}
            {item.navigation && (
              <a
                href={item.navigation.targetUrl}
                target="_blank"
                rel="noreferrer"
                className="inline-flex rounded-full bg-accent px-4 py-2 text-sm font-semibold text-accent-foreground transition hover:brightness-95"
              >
                {item.navigation.ctaLabel}
              </a>
            )}
            {item.sources && item.sources.length > 0 && (
              <div className="flex flex-wrap gap-2">
                {item.sources.map((source) => (
                  <a
                    key={source.sourceUrl}
                    className="rounded-full border border-line bg-white px-2.5 py-1 text-[11px] text-brand underline-offset-2 hover:underline"
                    href={source.sourceUrl}
                    target="_blank"
                    rel="noreferrer"
                  >
                    Source: PGRKAM
                  </a>
                ))}
              </div>
            )}
          </article>
        ))}

        {pending && (
          <p className="animate-pulse-soft text-sm text-muted-foreground">Thinking… retrieving PGRKAM context</p>
        )}
      </div>

      {error && <p className="border-t border-line px-4 py-2 text-sm text-danger">{error}</p>}

      <form className="flex gap-2 border-t border-line p-3" onSubmit={onSubmit}>
        <input
          className="min-w-0 flex-1 rounded-full border border-line bg-white px-4 py-2.5 text-sm outline-none ring-brand/30 focus:ring-2"
          value={value}
          onChange={(event) => setValue(event.target.value)}
          placeholder="Ask in English, Hindi, or Punjabi…"
          disabled={!ready || pending}
        />
        <button
          className="rounded-full bg-brand px-5 py-2.5 text-sm font-semibold text-white disabled:opacity-50"
          disabled={!ready || pending || !value.trim()}
        >
          Send
        </button>
      </form>
    </section>
  );
}
