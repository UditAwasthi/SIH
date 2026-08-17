import type { Metadata } from "next";
import { IBM_Plex_Mono, Manrope, Unbounded } from "next/font/google";
import { AuthProvider } from "@/components/auth-provider";
import { GlyphRail } from "@/components/ui/dot-matrix";
import { SiteHeader } from "@/components/site-header";
import { ThemeProvider } from "@/theme";
import "./globals.css";

const display = Unbounded({
  subsets: ["latin"],
  variable: "--font-display",
  weight: ["500", "700"],
});

const body = Manrope({
  subsets: ["latin"],
  variable: "--font-body",
  weight: ["400", "500", "600", "700"],
});

const mono = IBM_Plex_Mono({
  subsets: ["latin"],
  variable: "--font-mono",
  weight: ["400", "500"],
});

export const metadata: Metadata = {
  title: "PGRKAM — Find work in Punjab",
  description:
    "Official career guidance for Punjab: jobs, schemes, skill development, and the next step to take.",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" data-theme="dark" className="dark" suppressHydrationWarning>
      <body className={`${display.variable} ${body.variable} ${mono.variable}`}>
        <ThemeProvider defaultMode="dark">
          <AuthProvider>
            <GlyphRail />
            <SiteHeader />
            {children}
          </AuthProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
