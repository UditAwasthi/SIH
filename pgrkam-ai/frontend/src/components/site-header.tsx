"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { useAuth } from "@/components/auth-provider";
import { Button } from "@/components/ui/button";
import { Led } from "@/components/ui/dot-matrix";
import { useTheme } from "@/theme";

const links = [
  { href: "/", label: "Home" },
  { href: "/jobs", label: "Jobs" },
  { href: "/chat", label: "Assistant" },
  { href: "/recommendations", label: "For you" },
  { href: "/profile", label: "Profile" },
  { href: "/upcoming", label: "Upcoming" },
];

export function SiteHeader() {
  const pathname = usePathname();
  const { user, loading, isAuthenticated, signOut } = useAuth();
  const { mode, toggleMode } = useTheme();
  const [menuOpen, setMenuOpen] = useState(false);

  return (
    <header className="sticky top-0 z-40 border-b border-line bg-void/94">
      <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-4 py-3 pl-6 md:px-10 md:pl-rail">
        <Link href="/" className="flex items-center gap-2">
          <Led active />
          <span className="font-display text-lg font-medium tracking-tight text-glyph">PGRKAM</span>
        </Link>

        <nav className="hidden items-center gap-1 lg:flex">
          {links.map((link) => {
            const active = pathname === link.href;
            return (
              <Link
                key={link.href}
                href={link.href}
                className={`inline-flex items-center gap-2 px-2.5 py-1 text-sm ${
                  active ? "text-glyph" : "text-mute hover:text-glyph"
                }`}
              >
                <Led on={active} active={active} size={5} />
                {link.label}
              </Link>
            );
          })}
        </nav>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={toggleMode}
            className="hidden items-center gap-2 px-2 py-1 font-mono text-[10px] uppercase tracking-[0.14em] text-mute hover:text-glyph sm:inline-flex"
            aria-label={mode === "dark" ? "Switch to light" : "Switch to dark"}
          >
            <Led active={mode === "dark"} on={mode === "light"} size={5} />
            {mode === "dark" ? "Dark" : "Light"}
          </button>
          {!loading && (
            <div className="hidden items-center gap-2 sm:flex">
              {isAuthenticated ? (
                <>
                  <span className="hidden max-w-[10rem] truncate font-mono text-[10px] uppercase tracking-[0.08em] text-mute md:inline">
                    {user?.name || user?.email}
                  </span>
                  <Button type="button" variant="outline" size="sm" onClick={signOut}>
                    Sign out
                  </Button>
                </>
              ) : (
                <>
                  <Button asChild variant="ghost" size="sm">
                    <Link href="/signup">Sign up</Link>
                  </Button>
                  <Button asChild size="sm">
                    <Link href="/signin">Sign in</Link>
                  </Button>
                </>
              )}
            </div>
          )}
          <button
            className="px-2 py-1 font-mono text-[10px] uppercase tracking-[0.14em] text-glyph lg:hidden"
            onClick={() => setMenuOpen((open) => !open)}
            aria-label="Toggle menu"
            type="button"
          >
            {menuOpen ? "Close" : "Menu"}
          </button>
        </div>
      </div>

      {menuOpen && (
        <div className="border-t border-line bg-void px-4 py-4 lg:hidden">
          <ul className="flex flex-col">
            {links.map((link) => {
              const active = pathname === link.href;
              return (
                <li key={link.href}>
                  <Link
                    href={link.href}
                    className="flex items-center gap-3 px-1 py-3 text-base text-glyph"
                    onClick={() => setMenuOpen(false)}
                  >
                    <Led on={active} active={active} />
                    {link.label}
                  </Link>
                </li>
              );
            })}
            <li className="mt-2 flex flex-wrap gap-2">
              <Button type="button" variant="ghost" onClick={toggleMode}>
                {mode === "dark" ? "Light" : "Dark"}
              </Button>
              {isAuthenticated ? (
                <Button type="button" variant="outline" onClick={signOut}>
                  Sign out
                </Button>
              ) : (
                <Button asChild>
                  <Link href="/signin">Sign in</Link>
                </Button>
              )}
            </li>
          </ul>
        </div>
      )}
    </header>
  );
}
