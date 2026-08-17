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
  dark: {
    background: "0 0% 4%",
    foreground: "0 0% 96%",
    muted: "0 0% 14%",
    mutedForeground: "0 0% 66%",
    brand: "0 100% 50%",
    brandSoft: "0 40% 10%",
    accent: "0 100% 50%",
    accentForeground: "0 0% 96%",
    surface: "0 0% 8%",
    line: "0 0% 18%",
    danger: "0 100% 50%",
    bodyWash: "#0b0b0b",
  },
  light: {
    background: "0 0% 96%",
    foreground: "0 0% 4%",
    muted: "0 0% 90%",
    mutedForeground: "0 0% 36%",
    brand: "0 100% 50%",
    brandSoft: "0 40% 94%",
    accent: "0 100% 50%",
    accentForeground: "0 0% 4%",
    surface: "0 0% 100%",
    line: "0 0% 82%",
    danger: "0 100% 42%",
    bodyWash: "#f5f5f5",
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

export const themeClasses = {
  page: "mx-auto max-w-6xl px-4 py-8 pl-6 md:px-10 md:py-12 md:pl-rail",
  pageNarrow: "mx-auto max-w-2xl px-4 py-10 pl-6 md:px-10 md:pl-rail",
  pageMedium: "mx-auto max-w-3xl px-4 py-10 pl-6 md:px-10 md:pl-rail",
  pageAuth: "mx-auto flex min-h-[70vh] max-w-md flex-col justify-center px-4 py-10 pl-6 md:pl-8",

  eyebrow: "meta",
  title: "font-display text-[28px] font-medium leading-none tracking-tight text-glyph md:text-[40px]",
  titleHero: "font-display text-[40px] font-medium leading-[0.92] tracking-tight text-glyph md:text-7xl",
  titleSection: "font-display text-xl font-medium tracking-tight text-glyph",
  lead: "mt-3 max-w-xl text-[15px] leading-6 text-mute",
  muted: "text-sm text-mute",
  link: "font-medium text-glyph underline decoration-struct underline-offset-4 hover:text-led hover:decoration-led",

  surface: "surface",
  surfacePad: "surface p-5",
  surfaceEmpty: "surface px-4 py-8 font-mono text-xs text-mute",

  label: "meta mb-2 block",
  fieldError: "mt-1 block font-mono text-[11px] normal-case tracking-normal text-led",
  error: "font-mono text-xs text-led",
  errorBanner: "border border-led px-4 py-3 font-mono text-xs text-led",
  success: "font-mono text-xs text-glyph",
  loading: "font-mono text-xs text-mute",

  input:
    "mt-1 w-full border-0 border-b border-line bg-transparent px-0 py-2.5 text-sm text-glyph outline-none transition placeholder:text-mute focus:border-led",
  inputCompact:
    "mt-1 w-full border-0 border-b border-line bg-transparent px-0 py-2 text-sm text-glyph outline-none transition focus:border-led",

  buttonPrimary:
    "inline-flex items-center justify-center gap-2 rounded-[2px] bg-led px-5 py-2.5 text-sm font-semibold text-glyph transition hover:bg-led-dim disabled:opacity-40",
  buttonPrimaryBlock:
    "inline-flex w-full items-center justify-center gap-2 rounded-[2px] bg-led px-5 py-2.5 text-sm font-semibold text-glyph transition hover:bg-led-dim disabled:opacity-40",
  buttonAccent:
    "inline-flex items-center justify-center gap-2 rounded-[2px] border border-line bg-raised px-5 py-2.5 text-sm font-semibold text-glyph transition hover:border-glyph",
  buttonGhost: "rounded-[2px] px-3 py-2 text-sm font-medium text-mute transition hover:text-glyph",

  header: "sticky top-0 z-40 border-b border-line bg-void/92 backdrop-blur-sm",
  headerInner: "mx-auto flex max-w-6xl items-center justify-between gap-4 px-4 py-3 pl-6 md:px-10 md:pl-rail",
  navLink: "inline-flex items-center gap-2 px-2 py-1 text-sm text-mute transition hover:text-glyph",

  chip: "font-mono text-[10px] font-medium uppercase tracking-[0.14em] text-led",
  promptChip:
    "border border-line bg-void px-3 py-2 text-left text-sm text-glyph transition hover:border-glyph",
  card: "border border-line bg-raised p-4 transition hover:border-glyph/40",

  chatUser: "ml-8 border border-led/40 bg-void px-4 py-3 text-sm text-glyph md:ml-16",
  chatAssistant: "mr-4 space-y-3 border border-line bg-raised px-4 py-3 text-sm md:mr-12",
  chatInput:
    "min-w-0 flex-1 border-0 border-b border-line bg-transparent px-0 py-2.5 text-sm outline-none transition focus:border-led",
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
  const hex =
    mode === "dark"
      ? {
          "--void": "#0b0b0b",
          "--raised": "#151515",
          "--struct": "#242424",
          "--line-hex": "#2e2e2e",
          "--mute": "#a8a8a8",
          "--glyph": "#f5f5f5",
          "--led": "#ff0000",
          "--led-dim": "#7a0000",
          "--dot-off": "#2a2a2a",
        }
      : {
          "--void": "#f5f5f5",
          "--raised": "#ffffff",
          "--struct": "#e6e6e6",
          "--line-hex": "#d0d0d0",
          "--mute": "#5c5c5c",
          "--glyph": "#0b0b0b",
          "--led": "#ff0000",
          "--led-dim": "#c40000",
          "--dot-off": "#cfcfcf",
        };

  root.dataset.theme = mode;
  root.classList.toggle("dark", mode === "dark");

  for (const [key, cssVar] of Object.entries(themeCssVarMap)) {
    root.style.setProperty(cssVar, tokens[key as keyof typeof themeCssVarMap]);
  }
  for (const [name, value] of Object.entries(hex)) {
    root.style.setProperty(name, value);
  }
  root.style.setProperty("--body-wash", tokens.bodyWash);
}

function readStoredMode(): ThemeMode {
  if (typeof window === "undefined") return "dark";
  const stored = window.localStorage.getItem(STORAGE_KEY);
  return stored === "dark" || stored === "light" ? stored : "dark";
}

export function ThemeProvider({
  children,
  defaultMode = "dark",
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
