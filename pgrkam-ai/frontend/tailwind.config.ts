import type { Config } from "tailwindcss";

const config: Config = {
  darkMode: ["class"],
  content: ["./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        void: "var(--void)",
        raised: "var(--raised)",
        struct: "var(--struct)",
        mute: "var(--mute)",
        glyph: "var(--glyph)",
        led: "var(--led)",
        "led-dim": "var(--led-dim)",
        "dot-off": "var(--dot-off)",
        background: "hsl(var(--background))",
        foreground: "hsl(var(--foreground))",
        muted: {
          DEFAULT: "hsl(var(--muted))",
          foreground: "hsl(var(--muted-foreground))",
        },
        brand: {
          DEFAULT: "hsl(var(--brand))",
          soft: "hsl(var(--brand-soft))",
        },
        accent: {
          DEFAULT: "hsl(var(--accent))",
          foreground: "hsl(var(--accent-foreground))",
        },
        surface: "hsl(var(--surface))",
        line: "hsl(var(--line))",
        danger: "hsl(var(--danger))",
        primary: {
          DEFAULT: "hsl(var(--brand))",
          foreground: "hsl(var(--primary-foreground))",
          container: "hsl(var(--primary-container))",
        },
        secondary: {
          DEFAULT: "hsl(var(--secondary))",
          foreground: "hsl(var(--secondary-foreground))",
          container: "hsl(var(--secondary-container))",
        },
        tertiary: {
          DEFAULT: "hsl(var(--tertiary))",
          foreground: "hsl(var(--tertiary-foreground))",
          container: "hsl(var(--tertiary-container))",
        },
        teal: "hsl(var(--teal))",
        terracotta: "hsl(var(--terracotta))",
        sunset: "hsl(var(--sunset))",
      },
      fontFamily: {
        display: ["var(--font-display)", "system-ui", "sans-serif"],
        body: ["var(--font-body)", "system-ui", "sans-serif"],
        mono: ["var(--font-mono)", "ui-monospace", "monospace"],
      },
      borderRadius: {
        DEFAULT: "2px",
        sm: "0px",
        md: "2px",
        lg: "2px",
        xl: "4px",
      },
      boxShadow: {
        card: "none",
        "card-hover": "none",
      },
      spacing: {
        gutter: "24px",
        section: "96px",
        rail: "36px",
      },
      keyframes: {
        rise: {
          from: { opacity: "0", transform: "translateY(8px)" },
          to: { opacity: "1", transform: "translateY(0)" },
        },
        pulseSoft: {
          "0%, 100%": { opacity: "0.35" },
          "50%": { opacity: "1" },
        },
      },
      animation: {
        rise: "rise 0.45s ease-out both",
        "pulse-soft": "pulseSoft 1.2s linear infinite",
      },
    },
  },
  plugins: [],
};

export default config;
