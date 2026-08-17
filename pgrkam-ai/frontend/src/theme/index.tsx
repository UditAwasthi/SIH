"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";

export type ThemeMode = "light" | "dark";

/** HSL channel values without `hsl()` — match CSS vars in globals.css */
export type ThemeTokens = {
  background: string;
  foreground: string;
  muted: string;
  mutedForeground: string;
  brand: string;
  brandSoft: string;
  accent: string;
  accentForeground: string;
  surface: string;
  line: string;
  danger: string;
  bodyWash: string;
};

export const themeTokens: Record<ThemeMode, ThemeTokens> = {
  light: {
    background: "45 28% 96%",
    foreground: "160 45% 14%",
    muted: "150 14% 90%",
    mutedForeground: "150 10% 38%",
    brand: "158 52% 22%",
    brandSoft: "155 30% 90%",
    accent: "38 85% 48%",
    accentForeground: "30 50% 12%",
    surface: "45 25% 99%",
    line: "150 12% 82%",
    danger: "5 58% 46%",
    bodyWash:
        "radial-gradient(1200px 600px at 8% -8%, hsl(155 35% 88% / 0.85), transparent 55%), radial-gradient(900px 500px at 95% 5%, hsl(38 70% 86% / 0.4), transparent 50%), radial-gradient(800px 400px at 50% 100%, hsl(45 30% 92% / 0.5), transparent 45%), linear-gradient(180deg, hsl(45 28% 96%), hsl(45 22% 93%))",
  },
  dark: {
    background: "160 24% 7%",
    foreground: "45 18% 92%",
    muted: "160 16% 14%",
    mutedForeground: "150 10% 62%",
    brand: "155 38% 68%",
    brandSoft: "160 20% 16%",
    accent: "38 78% 54%",
    accentForeground: "30 45% 10%",
    surface: "160 18% 11%",
    line: "160 10% 20%",
    danger: "5 50% 58%",
    bodyWash:
        "radial-gradient(1000px 520px at 8% -8%, hsl(155 25% 16% / 0.65), transparent 55%), radial-gradient(800px 420px at 100% 0%, hsl(38 35% 18% / 0.3), transparent 50%), radial-gradient(700px 350px at 50% 100%, hsl(160 20% 10% / 0.4), transparent 45%), linear-gradient(180deg, hsl(160 24% 7%), hsl(160 20% 5%))",
  },
};

const themeCssVarMap: Record<keyof Omit<ThemeTokens, "bodyWash">, string> = {
  background: "--background",
  foreground: "--foreground",
  muted: "--muted",
  mutedForeground: "--muted-foreground",
  brand: "--brand",
  brandSoft: "--brand-soft",
  accent: "--accent",
  accentForeground: "--accent-foreground",
  surface: "--surface",
  line: "--line",
  danger: "--danger",
};

/** Shared Tailwind class recipes — use via `useTheme().classes` or `themeClasses`. */
export const themeClasses = {
  page: "mx-auto max-w-6xl px-4 py-8 md:px-6 md:py-10",
  pageNarrow: "mx-auto max-w-2xl px-4 py-10 md:px-6",
  pageMedium: "mx-auto max-w-3xl px-4 py-10 md:px-6",
  pageAuth: "mx-auto flex min-h-[70vh] max-w-md flex-col justify-center px-4 py-10 md:px-6",

  eyebrow: "text-[11px] font-semibold uppercase tracking-[0.22em] text-brand/80",
  title: "font-sans text-3xl font-extrabold tracking-tight text-brand",
  titleHero: "font-sans text-4xl font-extrabold leading-[1.08] tracking-tight text-brand md:text-6xl",
  titleSection: "font-sans text-lg font-bold tracking-tight text-brand",
  lead: "mt-2 text-[15px] leading-relaxed text-muted-foreground",
  muted: "text-sm text-muted-foreground",
  link: "font-medium text-brand underline underline-offset-4 decoration-brand/30 hover:decoration-brand/70 transition",

  surface: "surface",
  surfacePad: "surface p-5",
  surfaceEmpty: "surface px-4 py-8 text-center text-sm text-muted-foreground",

  label: "block text-[11px] font-semibold uppercase tracking-wider text-muted-foreground",
  fieldError: "mt-1 block normal-case tracking-normal text-danger",
  error: "text-sm text-danger",
  errorBanner: "rounded-xl border border-danger/25 bg-surface px-4 py-3 text-sm text-danger",
  success: "text-sm text-brand",
  loading: "animate-pulse-soft text-sm text-muted-foreground",

  input:
      "mt-1 w-full rounded-lg border border-line bg-surface px-3.5 py-2.5 text-sm text-foreground outline-none ring-brand/25 placeholder:text-muted-foreground/70 focus:border-brand/40 focus:ring-[3px] transition",
  inputCompact:
      "mt-1 w-full rounded-lg border border-line bg-surface px-3 py-2 text-sm text-foreground outline-none ring-brand/25 focus:border-brand/40 focus:ring-[3px] transition",

  buttonPrimary:
      "rounded-lg bg-brand px-5 py-2.5 text-sm font-semibold text-white shadow-sm shadow-brand/20 transition hover:shadow-md hover:shadow-brand/25 hover:-translate-y-[1px] active:translate-y-0 disabled:opacity-50 disabled:hover:translate-y-0",
  buttonPrimaryBlock:
      "w-full rounded-lg bg-brand px-5 py-2.5 text-sm font-semibold text-white shadow-sm shadow-brand/20 transition hover:shadow-md hover:shadow-brand/25 hover:-translate-y-[1px] active:translate-y-0 disabled:opacity-50 disabled:hover:translate-y-0",
  buttonAccent:
      "inline-flex rounded-lg bg-accent px-5 py-2.5 text-sm font-semibold text-accent-foreground shadow-sm shadow-accent/20 transition hover:shadow-md hover:shadow-accent/25 hover:-translate-y-[1px] active:translate-y-0",
  buttonGhost:
      "rounded-lg px-3.5 py-2 text-muted-foreground transition hover:bg-brand-soft hover:text-brand",

  header:
      "sticky top-0 z-40 border-b border-line/60 bg-[hsl(var(--background)/0.78)] backdrop-blur-xl",
  headerInner: "mx-auto flex max-w-6xl items-center justify-between gap-4 px-4 py-3 md:px-6",
  navLink:
      "rounded-lg px-3 py-1.5 text-sm text-muted-foreground transition hover:bg-brand-soft hover:text-brand",

  chip: "rounded-md bg-brand-soft px-2.5 py-1 text-xs font-semibold text-brand",
  promptChip:
      "rounded-lg border border-dashed border-line bg-brand-soft/40 px-3 py-2 text-left text-sm transition hover:border-brand/30 hover:bg-brand-soft",
  card: "rounded-xl border border-line bg-surface/95 p-4 transition hover:border-brand/30 hover:shadow-sm",

  chatUser: "ml-6 rounded-2xl rounded-br-md bg-brand px-4 py-3 text-white md:ml-16",
  chatAssistant: "mr-4 space-y-3 rounded-2xl rounded-bl-md bg-muted/80 px-4 py-3 md:mr-12",
  chatInput:
      "min-w-0 flex-1 rounded-full border border-line bg-surface px-4 py-2.5 text-sm outline-none ring-brand/25 focus:border-brand/40 focus:ring-[3px] transition",
} as const;

export type ThemeClasses = typeof themeClasses;

const STORAGE_KEY = "pgrkam_theme";

type ThemeContextValue = {
  mode: ThemeMode;
  setMode: (mode: ThemeMode) => void;
  toggleMode: () => void;
  tokens: ThemeTokens;
  classes: ThemeClasses;
};

const ThemeContext = createContext<ThemeContextValue | null>(null);

function applyThemeToDocument(mode: ThemeMode) {
  if (typeof document === "undefined") return;
  const root = document.documentElement;
  const tokens = themeTokens[mode];

  root.dataset.theme = mode;
  root.classList.toggle("dark", mode === "dark");

  for (const [key, cssVar] of Object.entries(themeCssVarMap)) {
    root.style.setProperty(cssVar, tokens[key as keyof typeof themeCssVarMap]);
  }
  root.style.setProperty("--body-wash", tokens.bodyWash);
}

function readStoredMode(): ThemeMode {
  if (typeof window === "undefined") return "light";
  const stored = window.localStorage.getItem(STORAGE_KEY);
  return stored === "dark" || stored === "light" ? stored : "light";
}

export function ThemeProvider({
                                children,
                                defaultMode = "light",
                              }: {
  children: ReactNode;
  defaultMode?: ThemeMode;
}) {
  const [mode, setModeState] = useState<ThemeMode>(defaultMode);

  useEffect(() => {
    const initial = readStoredMode();
    setModeState(initial);
    applyThemeToDocument(initial);
  }, []);

  const setMode = useCallback((next: ThemeMode) => {
    setModeState(next);
    window.localStorage.setItem(STORAGE_KEY, next);
    applyThemeToDocument(next);
  }, []);

  const toggleMode = useCallback(() => {
    setMode(mode === "light" ? "dark" : "light");
  }, [mode, setMode]);

  const value = useMemo<ThemeContextValue>(
      () => ({
        mode,
        setMode,
        toggleMode,
        tokens: themeTokens[mode],
        classes: themeClasses,
      }),
      [mode, setMode, toggleMode],
  );

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useTheme() {
  const ctx = useContext(ThemeContext);
  if (!ctx) {
    throw new Error("useTheme must be used within ThemeProvider");
  }
  return ctx;
}