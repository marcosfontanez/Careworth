"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { ArrowRight, Menu } from "lucide-react";
import { MarketingLogo } from "@/components/marketing/marketing-logo";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { marketingGutterX, shadowPrimaryCta } from "@/lib/ui-classes";
import { cn } from "@/lib/utils";

/** Matches primary marketing mocks: hub + pillar landings (no Feed / My Pulse in top rail). */
const centerLinks: { href: string; label: string; match: (path: string) => boolean }[] = [
  {
    href: "/features",
    label: "Features",
    match: (p) =>
      p === "/features" ||
      (p.startsWith("/features") &&
        !p.startsWith("/features/feed") &&
        !p.startsWith("/features/circles") &&
        !p.startsWith("/features/live") &&
        !p.startsWith("/features/pulse-page") &&
        !p.startsWith("/features/my-pulse")),
  },
  { href: "/features/circles", label: "Circles", match: (p) => p.startsWith("/features/circles") },
  { href: "/features/live", label: "Live", match: (p) => p.startsWith("/features/live") },
  { href: "/features/pulse-page", label: "Pulse Page", match: (p) => p.startsWith("/features/pulse-page") },
  { href: "/support", label: "Support", match: (p) => p.startsWith("/support") },
  { href: "/advertisers", label: "Advertisers", match: (p) => p.startsWith("/advertisers") },
];

function NavLink({
  href,
  label,
  active,
}: {
  href: string;
  label: string;
  active: boolean;
}) {
  return (
    <Link
      href={href}
      className={cn(
        "relative px-1 py-2 text-sm font-medium transition-colors",
        active ? "text-foreground" : "text-muted-foreground hover:text-foreground",
      )}
    >
      {label}
      <span
        className={cn(
          "absolute inset-x-0 -bottom-px h-0.5 rounded-full bg-[var(--accent)] shadow-[0_0_12px_rgba(0,210,255,0.45)] transition-opacity",
          active ? "opacity-100" : "opacity-0 hover:opacity-40",
        )}
        aria-hidden
      />
    </Link>
  );
}

export function MarketingNav() {
  const pathname = usePathname() ?? "";

  return (
    <header className="sticky top-0 z-50 border-b border-[rgba(148,163,184,0.1)] bg-[rgba(5,10,20,0.85)] backdrop-blur-xl">
      <div className={cn("relative flex min-h-[5.5rem] items-center justify-between gap-4 py-2 sm:min-h-[6rem] sm:gap-6", marketingGutterX)}>
        <MarketingLogo className="shrink-0" />
        <nav
          className="absolute left-1/2 top-1/2 hidden -translate-x-1/2 -translate-y-1/2 items-center gap-7 lg:flex"
          aria-label="Primary"
        >
          {centerLinks.map((item) => {
            const active = item.match(pathname);
            return <NavLink key={item.href} href={item.href} label={item.label} active={active} />;
          })}
        </nav>
        <div className="ml-auto flex shrink-0 items-center gap-3">
          <Button variant="ghost" size="sm" className="hidden text-muted-foreground sm:inline-flex" asChild>
            <Link href="/admin/login">Log in</Link>
          </Button>
          <Button
            size="sm"
            className={cn(
              "hidden rounded-full px-5 font-semibold sm:inline-flex",
              "bg-primary text-primary-foreground hover:bg-primary/90",
              shadowPrimaryCta,
            )}
            asChild
          >
            <Link href="/download" className="inline-flex items-center gap-2">
                  Join PulseVerse
                  <ArrowRight className="h-4 w-4" aria-hidden />
                </Link>
          </Button>
          <div className="lg:hidden">
            <Sheet>
              <SheetTrigger
                className="inline-flex size-9 items-center justify-center rounded-lg border border-border bg-secondary/50 text-foreground outline-none hover:bg-secondary"
              >
                <Menu className="h-5 w-5" />
                <span className="sr-only">Menu</span>
              </SheetTrigger>
              <SheetContent side="right" className="border-border bg-card">
                <div className="mt-8 flex flex-col gap-1">
                  {centerLinks.map((item) => (
                    <Link
                      key={item.href}
                      href={item.href}
                      className="rounded-lg px-3 py-2.5 text-base font-medium text-foreground hover:bg-secondary"
                    >
                      {item.label}
                    </Link>
                  ))}
                  <Link href="/download" className="mt-4">
                    <Button className="w-full rounded-full bg-primary font-semibold">Join PulseVerse</Button>
                  </Link>
                </div>
              </SheetContent>
            </Sheet>
          </div>
        </div>
      </div>
    </header>
  );
}
