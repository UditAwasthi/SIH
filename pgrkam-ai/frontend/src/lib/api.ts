const baseUrl = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3001";
export const tokenKey = "pgrkam_auth_token";

export class ApiError extends Error {
  status: number;
  constructor(message: string, status: number) {
    super(message);
    this.status = status;
  }
}

export type AuthUser = {
  id: string;
  name: string | null;
  email: string | null;
  preferredLang: string;
  isGuest: boolean;
  hasProfile: boolean;
};

export type AuthResponse = {
  accessToken: string;
  user: AuthUser;
};

export function getStoredToken(): string | null {
  if (typeof window === "undefined") return null;
  const current = localStorage.getItem(tokenKey);
  if (current) return current;
  const legacy = localStorage.getItem("pgrkam_guest_token");
  if (legacy) {
    localStorage.setItem(tokenKey, legacy);
    localStorage.removeItem("pgrkam_guest_token");
    return legacy;
  }
  return null;
}

export function setStoredToken(token: string | null) {
  if (typeof window === "undefined") return;
  if (token) localStorage.setItem(tokenKey, token);
  else localStorage.removeItem(tokenKey);
}

export async function api<T>(path: string, init: RequestInit = {}): Promise<T> {
  const headers: HeadersInit = {
    "Content-Type": "application/json",
    ...init.headers,
  };
  if (typeof window !== "undefined") {
    const token = getStoredToken();
    if (token) {
      (headers as Record<string, string>).Authorization = `Bearer ${token}`;
    }
  }

  const url = `${baseUrl.replace(/\/$/, "")}${path.startsWith("/") ? path : `/${path}`}`;
  let response: Response;
  try {
    response = await fetch(url, { ...init, headers });
  } catch {
    throw new ApiError("Could not reach the API. Is the backend running?", 0);
  }
  if (!response.ok) {
    const text = await response.text();
    let message = text || "Request failed";
    try {
      const parsed = JSON.parse(text) as { message?: string | string[] };
      if (Array.isArray(parsed.message)) message = parsed.message.join(", ");
      else if (parsed.message) message = parsed.message;
    } catch {
      /* keep raw text */
    }
    throw new ApiError(message, response.status);
  }
  return response.json() as Promise<T>;
}

/** Ensure any session exists (guest if needed) for chat / public API use. */
export async function ensureGuest(): Promise<string | null> {
  if (typeof window === "undefined") return null;
  const existing = getStoredToken();
  if (existing) return existing;
  const result = await api<AuthResponse>("/auth/guest", { method: "POST" });
  setStoredToken(result.accessToken);
  return result.accessToken;
}

export async function registerAccount(input: {
  name: string;
  email: string;
  password: string;
  preferredLang?: "en" | "hi" | "pa";
}): Promise<AuthResponse> {
  const result = await api<AuthResponse>("/auth/register", {
    method: "POST",
    body: JSON.stringify(input),
  });
  setStoredToken(result.accessToken);
  return result;
}

export async function loginAccount(input: {
  email: string;
  password: string;
}): Promise<AuthResponse> {
  const result = await api<AuthResponse>("/auth/login", {
    method: "POST",
    body: JSON.stringify(input),
  });
  setStoredToken(result.accessToken);
  return result;
}

export async function fetchMe(): Promise<AuthUser> {
  return api<AuthUser>("/auth/me");
}

export type Job = {
  id: string;
  title: string;
  employer: string;
  location: string;
  sector: string;
  qualification?: string | null;
  minExperience?: number | null;
  salaryMin?: number | null;
  salaryMax?: number | null;
  requiredSkills: string[];
  deadline?: string | null;
  sourceUrl: string;
};

export type NavigationCta = {
  intent: string;
  ctaLabel: string;
  targetUrl: string;
  description: string;
};

export type Recommendation = {
  job: Job;
  score: number;
  why: {
    matchedSkills: string[];
    educationMatch: boolean;
    locationMatch: boolean;
    sectorMatch: boolean;
  };
};

export type ChatResponse = {
  conversationId: string;
  message: {
    id: string;
    role: "user" | "assistant";
    content: string;
    detectedLanguage?: string | null;
    intent?: string | null;
    sources?: Array<{ sourceUrl: string; lastCrawledAt?: string }> | null;
  };
  intent: {
    intent: string;
    language: "en" | "hi" | "pa";
    confidence: number;
  };
  jobs: Job[];
  recommendations?: Recommendation[];
  navigation: NavigationCta | null;
  sources: Array<{ sourceUrl: string; lastCrawledAt?: string }>;
};

export async function subscribeToAlerts(email: string): Promise<{ ok: boolean; message: string }> {
  return api<{ ok: boolean; message: string }>("/subscribe", {
    method: "POST",
    body: JSON.stringify({ email }),
  });
}

export type Profile = {
  id: string;
  education?: unknown;
  skills: string[];
  experienceYears?: number | null;
  location?: string | null;
  preferredSectors: string[];
  salaryMin?: number | null;
  salaryMax?: number | null;
};
