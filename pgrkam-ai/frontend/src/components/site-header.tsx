"use client";

import Link from "next/link";
import { useAuth } from "@/components/auth-provider";
import { Button } from "@/components/ui/button";
import { useTheme } from "@/theme";

const links = [
  { href: "/", label: "Home" },
  { href: "/chat", label: "Chat" },
  { href: "/jobs", label: "Jobs" },
  { href: "/recommendations", label: "For you" },
  { href: "/profile", label: "Profile" },
  { href: "/upcoming", label: "Upcoming" },
];

export function SiteHeader() {
  const { user, loading, isAuthenticated, signOut } = useAuth();
  const { classes, mode, toggleMode } = useTheme();

  return (
    <header className={classes.header}>
      <div className={classes.headerInner}>
        <Link href="/" className="group min-w-0">
          <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-brand/70">SIH1305</p>
          <p className="font-display text-lg font-extrabold leading-tight text-brand transition group-hover:opacity-80 md:text-xl">
            PGRKAM AI
          </p>
        </Link>
        <div className="flex flex-wrap items-center justify-end gap-2">
          <nav className="flex flex-wrap items-center justify-end gap-1 text-sm font-medium md:gap-2">
            {links.map((link) => (
              <Link key={link.href} href={link.href} className={classes.navLink}>
                {link.label}
              </Link>
            ))}
          </nav>
          {!loading && (
            <div className="flex items-center gap-2 border-l border-line/80 pl-2 md:pl-3">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={toggleMode}
                aria-label={mode === "light" ? "Switch to dark theme" : "Switch to light theme"}
              >
                {mode === "light" ? "Dark" : "Light"}
              </Button>
              {isAuthenticated ? (
                <>
                  <span className="hidden max-w-[10rem] truncate text-xs text-muted-foreground sm:inline">
                    {user?.name || user?.email}
                  </span>
                  <Button type="button" variant="outline" size="sm" onClick={signOut}>
                    Sign out
                  </Button>
                </>
              ) : (
                <>
                  <Button asChild variant="outline" size="sm">
                    <Link href="/signin">Sign in</Link>
                  </Button>
                  <Button asChild size="sm">
                    <Link href="/signup">Sign up</Link>
                  </Button>
                </>
              )}
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
