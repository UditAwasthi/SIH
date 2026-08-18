"use client";

import { EXAMPLE_PROMPTS, type SupportedLanguage } from "@pgrkam-ai/shared";
import { FormEvent, useCallback, useEffect, useRef, useState } from "react";
import { JobCard } from "@/components/job-card";
import { DotLoader, Led } from "@/components/ui/dot-matrix";
import { ApiError, ChatResponse, api, ensureGuest, setStoredToken } from "@/lib/api";
import {
  type ChatThread,
  type StoredChatItem,
  ensureActiveThread,
  getThread,
  listThreads,
  saveActiveThread,
  startNewThread,
} from "@/lib/chat-history";
import { useTheme } from "@/theme";

type ChatItem = StoredChatItem;

const languageLabel: Record<SupportedLanguage, string> = {
  en: "English",
  hi: "हिन्दी",
  pa: "ਪੰਜਾਬੀ",
};

function formatThreadDate(ts: number) {
  return new Intl.DateTimeFormat(undefined, {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  }).format(new Date(ts));
}

function MessageBubble({
  item,
  t,
}: {
  item: ChatItem;
  t: ReturnType<typeof useTheme>["classes"];
}) {
  const isUser = item.role === "user";

  return (
    <article
      className={`flex gap-3 ${isUser ? "flex-row-reverse" : "flex-row"}`}
    >
      <div
        className={`mt-1 flex h-8 w-8 shrink-0 items-center justify-center border font-mono text-[10px] uppercase tracking-wider ${
          isUser
            ? "border-led/50 bg-led/10 text-led"
            : "border-line bg-raised text-mute"
        }`}
        aria-hidden
      >
        {isUser ? "You" : "AI"}
      </div>
      <div
        className={`min-w-0 max-w-[min(100%,42rem)] space-y-3 ${
          isUser
            ? "border border-led/30 bg-void px-4 py-3"
            : "border border-line bg-raised px-4 py-3"
        }`}
      >
        <p className="whitespace-pre-wrap text-[15px] leading-relaxed text-glyph">{item.content}</p>
        {item.intent && !isUser && (
          <p className="font-mono text-[10px] uppercase tracking-[0.12em] text-mute">
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
            className={t.buttonAccent}
          >
            {item.navigation.ctaLabel}
          </a>
        )}
        {item.sources && item.sources.length > 0 && (
          <div className="flex flex-wrap gap-2">
            {item.sources.map((source) => (
              <a
                key={source.sourceUrl}
                className="border border-line bg-void px-2.5 py-1 font-mono text-[10px] uppercase tracking-[0.12em] text-mute hover:text-glyph"
                href={source.sourceUrl}
                target="_blank"
                rel="noreferrer"
              >
                Source: PGRKAM
              </a>
            ))}
          </div>
        )}
      </div>
    </article>
  );
}

export function Chat({ initialPrompt }: { initialPrompt?: string }) {
  const { classes: t } = useTheme();
  const [threadId, setThreadId] = useState<string | null>(null);
  const [threads, setThreads] = useState<ChatThread[]>([]);
  const [items, setItems] = useState<ChatItem[]>([]);
  const [value, setValue] = useState(initialPrompt ?? "");
  const [conversationId, setConversationId] = useState<string>();
  const [preferredLang, setPreferredLang] = useState<SupportedLanguage>("en");
  const [detectedLang, setDetectedLang] = useState<SupportedLanguage | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [ready, setReady] = useState(false);
  const [pending, setPending] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [hydrated, setHydrated] = useState(false);
  const scroller = useRef<HTMLDivElement>(null);
  const initialSent = useRef(false);

  const activeThread = threadId ? getThread(threadId) : undefined;
  const isReadOnly = !activeThread || activeThread.frozen;

  const refreshThreads = useCallback(() => {
    setThreads(listThreads());
  }, []);

  const loadThread = useCallback(
    (id: string) => {
      const thread = getThread(id);
      if (!thread) return;
      setThreadId(id);
      setItems(thread.items);
      setConversationId(thread.frozen ? undefined : thread.conversationId);
      setPreferredLang(thread.preferredLang);
      setDetectedLang(null);
      setError(null);
      setSidebarOpen(false);
    },
    [],
  );

  useEffect(() => {
    const thread = ensureActiveThread("en");
    setThreadId(thread.id);
    setItems(thread.items);
    setConversationId(thread.conversationId);
    setPreferredLang(thread.preferredLang);
    setThreads(listThreads());
    setHydrated(true);
  }, []);

  useEffect(() => {
    void ensureGuest()
      .then(() => setReady(true))
      .catch(() => setError("Could not start a guest session. Is the API running?"));
  }, []);

  useEffect(() => {
    scroller.current?.scrollTo({ top: scroller.current.scrollHeight, behavior: "smooth" });
  }, [items, pending]);

  useEffect(() => {
    if (!hydrated || !threadId || isReadOnly) return;
    saveActiveThread(threadId, { items, conversationId, preferredLang });
    refreshThreads();
  }, [items, conversationId, preferredLang, threadId, isReadOnly, hydrated, refreshThreads]);

  const sendMessage = useCallback(async (content: string) => {
    if (!content.trim() || pending || !ready || isReadOnly || !threadId) return;
    setError(null);
    setValue("");
    setItems((old) => [...old, { role: "user", content }]);
    setPending(true);

    try {
      await ensureGuest();
      const post = (threadConversationId?: string) =>
        api<ChatResponse>("/chat/message", {
          method: "POST",
          body: JSON.stringify({ content, conversationId: threadConversationId }),
        });

      let response: ChatResponse;
      try {
        response = await post(conversationId);
      } catch (err) {
        if (err instanceof ApiError && (err.status === 401 || err.status === 403)) {
          setStoredToken(null);
          await ensureGuest();
          setConversationId(undefined);
          response = await post(undefined);
        } else if (err instanceof ApiError && err.status === 404) {
          setConversationId(undefined);
          response = await post(undefined);
        } else {
          throw err;
        }
      }

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
          : err instanceof ApiError
            ? err.message
            : "I'm having trouble connecting. Please try again.";
      setError(message);
      setItems((old) => [...old, { role: "assistant", content: message }]);
    } finally {
      setPending(false);
    }
  }, [conversationId, isReadOnly, pending, ready, threadId]);

  useEffect(() => {
    if (!hydrated || !ready || !initialPrompt?.trim() || initialSent.current || isReadOnly) return;
    initialSent.current = true;
    void sendMessage(initialPrompt);
  }, [hydrated, ready, initialPrompt, isReadOnly, sendMessage]);

  function onSubmit(event: FormEvent) {
    event.preventDefault();
    void sendMessage(value);
  }

  function handleNewChat() {
    const thread = startNewThread(preferredLang);
    setThreadId(thread.id);
    setItems([]);
    setConversationId(undefined);
    setDetectedLang(null);
    setError(null);
    setValue("");
    refreshThreads();
    setSidebarOpen(false);
  }

  function handleSelectThread(id: string) {
    loadThread(id);
    refreshThreads();
  }

  const prompts = EXAMPLE_PROMPTS[preferredLang];
  const activeId = getThread(threadId ?? "")?.frozen ? null : threadId;

  return (
    <div className="flex h-[calc(100dvh-3.25rem)] min-h-0 overflow-hidden border-t border-line bg-void">
      {/* Sidebar — thread history (read-only archives + current) */}
      <aside
        className={`${
          sidebarOpen ? "translate-x-0" : "-translate-x-full"
        } fixed inset-y-0 left-0 z-50 flex w-[min(100%,18rem)] flex-col border-r border-line bg-void transition-transform duration-200 md:static md:z-auto md:translate-x-0`}
        style={{ top: "3.25rem" }}
      >
        <div className="flex items-center justify-between border-b border-line px-4 py-3">
          <p className="font-mono text-[10px] uppercase tracking-[0.14em] text-mute">History</p>
          <button
            type="button"
            className="font-mono text-[10px] uppercase tracking-[0.12em] text-mute hover:text-glyph md:hidden"
            onClick={() => setSidebarOpen(false)}
          >
            Close
          </button>
        </div>

        <div className="p-3">
          <button
            type="button"
            onClick={handleNewChat}
            className={`${t.buttonPrimary} w-full`}
          >
            New chat
          </button>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto px-2 pb-4">
          {threads.length === 0 && (
            <p className="px-2 py-4 font-mono text-[11px] text-mute">No past conversations yet.</p>
          )}
          <ul className="space-y-1">
            {threads.map((thread) => {
              const selected = thread.id === threadId;
              const archived = thread.frozen;
              return (
                <li key={thread.id}>
                  <button
                    type="button"
                    onClick={() => handleSelectThread(thread.id)}
                    className={`w-full border px-3 py-2.5 text-left transition ${
                      selected
                        ? "border-led/50 bg-led/5"
                        : "border-transparent hover:border-line hover:bg-raised/60"
                    }`}
                  >
                    <span className="block truncate text-sm text-glyph">{thread.title}</span>
                    <span className="mt-1 flex items-center gap-2 font-mono text-[10px] uppercase tracking-[0.1em] text-mute">
                      {formatThreadDate(thread.updatedAt)}
                      {archived && <span className="text-led/80">· Archived</span>}
                      {!archived && thread.id === activeId && (
                        <span className="text-glyph">· Active</span>
                      )}
                    </span>
                  </button>
                </li>
              );
            })}
          </ul>
        </div>

        <div className="border-t border-line px-4 py-3">
          <p className="font-mono text-[10px] leading-relaxed text-mute">
            Past chats are saved locally and cannot be edited or resumed.
          </p>
        </div>
      </aside>

      {sidebarOpen && (
        <button
          type="button"
          className="fixed inset-0 z-40 bg-black/50 md:hidden"
          style={{ top: "3.25rem" }}
          aria-label="Close sidebar"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Main chat panel */}
      <section className="flex min-w-0 flex-1 flex-col">
        <header className="flex shrink-0 flex-wrap items-center justify-between gap-3 border-b border-line px-4 py-3 md:px-6">
          <div className="flex min-w-0 items-center gap-3">
            <button
              type="button"
              className="font-mono text-[10px] uppercase tracking-[0.12em] text-mute hover:text-glyph md:hidden"
              onClick={() => setSidebarOpen(true)}
            >
              History
            </button>
            <div className="min-w-0">
              <h2 className={`${t.titleSection} flex items-center gap-2 truncate`}>
                <Led active={ready} busy={pending} />
                {activeThread?.title ?? "Career assistant"}
              </h2>
              <p className="mt-0.5 font-mono text-[10px] uppercase tracking-[0.12em] text-mute">
                {isReadOnly
                  ? "Archived · read only"
                  : "Grounded answers · sign in to save your profile"}
              </p>
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-2 text-xs">
            {!isReadOnly && (
              <label className="flex items-center gap-2 border border-line px-3 py-1.5">
                <span className="text-mute">Reply in</span>
                <select
                  className="bg-transparent font-mono text-xs text-glyph outline-none"
                  value={preferredLang}
                  onChange={(event) =>
                    setPreferredLang(event.target.value as SupportedLanguage)
                  }
                >
                  <option value="en">English</option>
                  <option value="hi">हिन्दी</option>
                  <option value="pa">ਪੰਜਾਬੀ</option>
                </select>
              </label>
            )}
            {detectedLang && !isReadOnly && (
              <span className="hidden border border-line px-3 py-1.5 font-mono text-[10px] uppercase tracking-[0.12em] text-mute sm:inline">
                Detected: <strong className="text-glyph">{languageLabel[detectedLang]}</strong>
              </span>
            )}
          </div>
        </header>

        <div ref={scroller} className="min-h-0 flex-1 overflow-y-auto px-4 py-6 md:px-8">
          <div className="mx-auto max-w-3xl space-y-6">
            {isReadOnly && (
              <div className="border border-line bg-raised/50 px-4 py-3 font-mono text-[11px] text-mute">
                This conversation is archived. Start a{" "}
                <button type="button" className="text-glyph underline" onClick={handleNewChat}>
                  new chat
                </button>{" "}
                to continue asking questions.
              </div>
            )}

            {items.length === 0 && !isReadOnly && (
              <div className="flex min-h-[40vh] flex-col items-center justify-center space-y-6 text-center">
                <div>
                  <p className="font-display text-2xl font-medium text-glyph md:text-3xl">
                    How can I help?
                  </p>
                  <p className={`mt-2 ${t.muted}`}>
                    Jobs, schemes, skills, and PGRKAM next steps — in English, Hindi, or Punjabi.
                  </p>
                </div>
                <div className="grid w-full max-w-xl gap-2 sm:grid-cols-2">
                  {prompts.map((prompt) => (
                    <button
                      key={prompt}
                      type="button"
                      className={t.promptChip}
                      onClick={() => void sendMessage(prompt)}
                      disabled={!ready || pending}
                    >
                      {prompt}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {items.map((item, index) => (
              <MessageBubble key={`${item.role}-${index}-${item.content.slice(0, 24)}`} item={item} t={t} />
            ))}

            {pending && (
              <p className={t.loading}>
                <DotLoader label="Retrieving PGRKAM context" />
              </p>
            )}
          </div>
        </div>

        {error && !isReadOnly && (
          <p className={`shrink-0 border-t border-line px-4 py-2 md:px-6 ${t.error}`}>{error}</p>
        )}

        {isReadOnly ? (
          <div className="shrink-0 border-t border-line bg-raised/30 px-4 py-4 md:px-6">
            <button type="button" className={t.buttonPrimary} onClick={handleNewChat}>
              Start new chat
            </button>
          </div>
        ) : (
          <form
            className="shrink-0 border-t border-line bg-void px-4 py-4 md:px-6"
            onSubmit={onSubmit}
          >
            <div className="mx-auto flex max-w-3xl items-end gap-3">
              <div className="min-w-0 flex-1 border border-line bg-raised px-4 py-2 focus-within:border-led/60">
                <textarea
                  className="block max-h-40 min-h-[2.75rem] w-full resize-none bg-transparent text-[15px] text-glyph outline-none placeholder:text-mute"
                  value={value}
                  onChange={(event) => setValue(event.target.value)}
                  onKeyDown={(event) => {
                    if (event.key === "Enter" && !event.shiftKey) {
                      event.preventDefault();
                      void sendMessage(value);
                    }
                  }}
                  placeholder="Ask in English, Hindi, or Punjabi…"
                  disabled={!ready || pending}
                  rows={1}
                />
              </div>
              <button
                className={`${t.buttonPrimary} shrink-0 px-6`}
                disabled={!ready || pending || !value.trim()}
              >
                Send
              </button>
            </div>
            <p className="mx-auto mt-2 max-w-3xl font-mono text-[10px] text-mute">
              Enter to send · Shift+Enter for new line
            </p>
          </form>
        )}
      </section>
    </div>
  );
}
