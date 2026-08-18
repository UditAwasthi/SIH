import type { SupportedLanguage } from "@pgrkam-ai/shared";
import type { Job, NavigationCta, Recommendation } from "@/lib/api";

export type StoredChatItem = {
  role: "user" | "assistant";
  content: string;
  language?: SupportedLanguage;
  intent?: string;
  sources?: Array<{ sourceUrl: string }>;
  jobs?: Job[];
  recommendations?: Recommendation[];
  navigation?: NavigationCta | null;
};

export type ChatThread = {
  id: string;
  title: string;
  createdAt: number;
  updatedAt: number;
  conversationId?: string;
  preferredLang: SupportedLanguage;
  items: StoredChatItem[];
  /** Frozen threads are read-only archives — never resumed or edited. */
  frozen: boolean;
};

type ChatStore = {
  threads: ChatThread[];
};

const STORE_KEY = "pgrkam_chat_threads";
const ACTIVE_KEY = "pgrkam_chat_active_id";

function loadStore(): ChatStore {
  if (typeof window === "undefined") return { threads: [] };
  try {
    const raw = localStorage.getItem(STORE_KEY);
    if (!raw) return { threads: [] };
    const parsed = JSON.parse(raw) as ChatStore;
    return { threads: Array.isArray(parsed.threads) ? parsed.threads : [] };
  } catch {
    return { threads: [] };
  }
}

function saveStore(store: ChatStore) {
  if (typeof window === "undefined") return;
  localStorage.setItem(STORE_KEY, JSON.stringify(store));
}

export function getActiveThreadId(): string | null {
  if (typeof window === "undefined") return null;
  return localStorage.getItem(ACTIVE_KEY);
}

function setActiveThreadId(id: string) {
  if (typeof window === "undefined") return;
  localStorage.setItem(ACTIVE_KEY, id);
}

export function listThreads(): ChatThread[] {
  return loadStore().threads.sort((a, b) => b.updatedAt - a.updatedAt);
}

export function getThread(id: string): ChatThread | undefined {
  return loadStore().threads.find((t) => t.id === id);
}

function threadTitle(items: StoredChatItem[]): string {
  const first = items.find((i) => i.role === "user");
  if (!first) return "New conversation";
  const trimmed = first.content.trim();
  return trimmed.length > 48 ? `${trimmed.slice(0, 48)}…` : trimmed;
}

function newId(): string {
  return `thread_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
}

export function createThread(preferredLang: SupportedLanguage = "en"): ChatThread {
  const thread: ChatThread = {
    id: newId(),
    title: "New conversation",
    createdAt: Date.now(),
    updatedAt: Date.now(),
    preferredLang,
    items: [],
    frozen: false,
  };
  const store = loadStore();
  store.threads.unshift(thread);
  saveStore(store);
  setActiveThreadId(thread.id);
  return thread;
}

/** Mark a thread as archived — immutable and not resumable. */
export function freezeThread(id: string) {
  const store = loadStore();
  const idx = store.threads.findIndex((t) => t.id === id);
  if (idx === -1) return;
  const thread = store.threads[idx];
  if (thread.items.length > 0) {
    store.threads[idx] = {
      ...thread,
      frozen: true,
      title: threadTitle(thread.items),
      updatedAt: Date.now(),
    };
  } else {
    store.threads.splice(idx, 1);
  }
  saveStore(store);
}

/** Persist the active (writable) thread. Throws if thread is frozen. */
export function saveActiveThread(
  id: string,
  patch: Partial<Pick<ChatThread, "items" | "conversationId" | "preferredLang">>,
): ChatThread | null {
  const store = loadStore();
  const idx = store.threads.findIndex((t) => t.id === id);
  if (idx === -1) return null;
  const thread = store.threads[idx];
  if (thread.frozen) return thread;

  const items = patch.items ?? thread.items;
  const updated: ChatThread = {
    ...thread,
    ...patch,
    items,
    title: items.length > 0 ? threadTitle(items) : thread.title,
    updatedAt: Date.now(),
  };
  store.threads[idx] = updated;
  saveStore(store);
  return updated;
}

export function ensureActiveThread(preferredLang: SupportedLanguage = "en"): ChatThread {
  const activeId = getActiveThreadId();
  if (activeId) {
    const existing = getThread(activeId);
    if (existing && !existing.frozen) return existing;
  }
  return createThread(preferredLang);
}

/** Start a fresh writable thread; archive the current one if it has messages. */
export function startNewThread(preferredLang: SupportedLanguage = "en"): ChatThread {
  const activeId = getActiveThreadId();
  if (activeId) freezeThread(activeId);
  return createThread(preferredLang);
}
