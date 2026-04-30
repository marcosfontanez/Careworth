"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { ArrowRight, Menu } from "lucide-react";
import { MarketingDestinationLink } from "@/components/marketing/marketing-destination-link";
import { MarketingLogo } from "@/components/marketing/marketing-logo";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import type { Locale } from "@/lib/i18n";
import { getMarketingCenterLinks, getMarketingNavStrings } from "@/lib/marketing-copy/nav";
import { marketingGutterX, shadowPrimaryCta } from "@/lib/ui-classes";
import { cn } from "@/lib/utils";

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

export function MarketingNav({ locale }: { locale: Locale }) {
  const pathname = usePathname() ?? "";
  const centerLinks = getMarketingCenterLinks(locale);
  const strings = getMarketingNavStrings(locale);

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
            <Link href="/admin/login">{strings.logIn}</Link>
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
            <MarketingDestinationLink href="/download" analyticsSource="nav_desktop_join" className="inline-flex items-center gap-2">
                  {strings.join}
                  <ArrowRight className="h-4 w-4" aria-hidden />
                </MarketingDestinationLink>
          </Button>
          <div className="lg:hidden">
            <Sheet>
              <SheetTrigger
                className="inline-flex size-9 items-center justify-center rounded-lg border border-border bg-secondary/50 text-foreground outline-none hover:bg-secondary"
              >
                <Menu className="h-5 w-5" />
                <span className="sr-only">{strings.menuLabel}</span>
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
                  <Link
                    href="/admin/login"
                    className="rounded-lg px-3 py-2.5 text-base font-medium text-muted-foreground hover:bg-secondary hover:text-foreground"
                  >
                    {strings.logIn}
                  </Link>
                  <Button className="mt-4 w-full rounded-full bg-primary font-semibold" asChild>
                    <MarketingDestinationLink href="/download" analyticsSource="nav_mobile_join">
                      {strings.join}
                    </MarketingDestinationLink>
                  </Button>
                </div>
              </SheetContent>
            </Sheet>
          </div>
        </div>
      </div>
    </header>
  );
}
