import Link from "next/link";

const links = [
  { href: "/", label: "Chat" },
  { href: "/jobs", label: "Jobs" },
  { href: "/recommendations", label: "For you" },
  { href: "/profile", label: "Profile" },
];

export function SiteHeader() {
  return (
    <header className="sticky top-0 z-40 border-b border-line/70 bg-[hsl(150_25%_97%/0.82)] backdrop-blur-md">
      <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-4 py-3 md:px-6">
        <Link href="/" className="group min-w-0">
          <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-brand/70">SIH1305</p>
          <p className="font-display text-lg font-extrabold leading-tight text-brand transition group-hover:opacity-80 md:text-xl">
            PGRKAM AI
          </p>
        </Link>
        <nav className="flex flex-wrap items-center justify-end gap-1 text-sm font-medium md:gap-2">
          {links.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className="rounded-full px-3 py-1.5 text-muted-foreground transition hover:bg-brand-soft hover:text-brand"
            >
              {link.label}
            </Link>
          ))}
        </nav>
      </div>
    </header>
  );
}
