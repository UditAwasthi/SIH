const baseUrl = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3001";
const tokenKey = "pgrkam_guest_token";

export class ApiError extends Error {
  status: number;
  constructor(message: string, status: number) {
    super(message);
    this.status = status;
  }
}

export async function api<T>(path: string, init: RequestInit = {}): Promise<T> {
  const headers: HeadersInit = {
    "Content-Type": "application/json",
    ...init.headers,
  };
  if (typeof window !== "undefined") {
    const token = localStorage.getItem(tokenKey);
    if (token) {
      (headers as Record<string, string>).Authorization = `Bearer ${token}`;
    }
  }

  const response = await fetch(new URL(path, baseUrl), { ...init, headers });
  if (!response.ok) {
    const text = await response.text();
    throw new ApiError(text || "Request failed", response.status);
  }
  return response.json() as Promise<T>;
}

export async function ensureGuest(): Promise<string | null> {
  if (typeof window === "undefined") return null;
  const existing = localStorage.getItem(tokenKey);
  if (existing) return existing;
  const result = await api<{ accessToken: string }>("/auth/guest", { method: "POST" });
  localStorage.setItem(tokenKey, result.accessToken);
  return result.accessToken;
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
