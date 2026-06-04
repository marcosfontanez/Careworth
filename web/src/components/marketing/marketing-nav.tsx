"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { ArrowRight, Menu } from "lucide-react";

import { signOutUser } from "@/app/(marketing)/login/actions";
import { MarketingDestinationLink } from "@/components/marketing/marketing-destination-link";
import { MarketingLogo } from "@/components/marketing/marketing-logo";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import type { Locale } from "@/lib/i18n";
import { getMarketingCenterLinks, getMarketingNavStrings } from "@/lib/marketing-copy/nav";
import { marketingCtaPrimaryClasses, marketingFocusRing, marketingGutterX } from "@/lib/ui-classes";
import { cn } from "@/lib/utils";

export type MarketingAccountChip = {
  userId: string;
  displayName: string | null;
  username: string | null;
} | null;

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
        "relative shrink-0 whitespace-nowrap px-1.5 py-2 text-sm font-medium transition-colors",
        marketingFocusRing,
        active ? "text-foreground" : "text-muted-foreground hover:text-foreground",
      )}
    >
      {label}
      <span
        className={cn(
          "absolute inset-x-0 -bottom-px h-0.5 rounded-full bg-accent shadow-[0_0_12px_rgba(0,210,255,0.45)] transition-opacity",
          active ? "opacity-100" : "opacity-0 hover:opacity-40",
        )}
        aria-hidden
      />
    </Link>
  );
}

export function MarketingNav({ locale, account }: { locale: Locale; account: MarketingAccountChip }) {
  const pathname = usePathname() ?? "";
  const centerLinks = getMarketingCenterLinks(locale);
  const strings = getMarketingNavStrings(locale);
  const meLabel =
    account?.displayName?.trim() ||
    (account?.username ? `@${account.username}` : null) ||
    strings.myPulse;

  return (
    <header className="sticky top-0 z-50 border-b border-[rgba(148,163,184,0.1)] bg-[rgba(5,10,20,0.92)] backdrop-blur-xl">
      <div
        className={cn(
          "flex min-h-16 items-center gap-2 py-2 sm:min-h-20 sm:gap-3 lg:gap-5",
          marketingGutterX,
        )}
      >
        <MarketingLogo className="shrink-0" />
        <nav
          className="hidden min-h-0 min-w-0 flex-1 basis-0 items-center overflow-x-auto [-ms-overflow-style:none] [scrollbar-width:none] lg:flex [&::-webkit-scrollbar]:hidden"
          aria-label="Primary"
        >
          <div className="flex w-max items-center justify-start gap-x-2 px-1 sm:gap-x-3 xl:gap-x-5 2xl:gap-x-6">
            {centerLinks.map((item) => {
              const active = item.match(pathname);
              return <NavLink key={item.href} href={item.href} label={item.label} active={active} />;
            })}
          </div>
        </nav>
        <div className="ml-auto flex min-w-0 shrink-0 items-center gap-2 border-l border-white/8 pl-3 sm:gap-3 sm:pl-4 lg:ml-0">
          {account ? (
            <Link
              href="/me"
              className={cn(
                "hidden max-w-26 truncate text-sm font-semibold text-foreground hover:text-primary md:inline md:max-w-36 xl:max-w-44",
                marketingFocusRing,
                "rounded-sm",
              )}
              title={meLabel}
            >
              {meLabel}
            </Link>
          ) : null}
          {account ? (
            <form action={signOutUser} className="hidden shrink-0 sm:block">
              <Button type="submit" variant="ghost" size="sm" className="px-2 text-muted-foreground hover:text-foreground">
                {strings.signOut}
              </Button>
            </form>
          ) : (
            <Button variant="ghost" size="sm" className="hidden shrink-0 px-2 text-muted-foreground md:inline-flex" asChild>
              <Link href="/login" className={marketingFocusRing}>
                {strings.logIn}
              </Link>
            </Button>
          )}
          <Button
            size="sm"
            className={cn("shrink-0", marketingCtaPrimaryClasses, "h-10 px-4 sm:h-11 sm:px-5")}
            asChild
          >
            <MarketingDestinationLink href="/download" analyticsSource="nav_desktop_join" className="inline-flex items-center gap-1.5">
              <span className="hidden sm:inline">{strings.join}</span>
              <span className="sm:hidden">Beta</span>
              <ArrowRight className="h-4 w-4" aria-hidden />
            </MarketingDestinationLink>
          </Button>
          <div className="lg:hidden">
            <Sheet>
              <SheetTrigger
                className={cn(
                  "inline-flex size-9 items-center justify-center rounded-lg border border-border bg-secondary/50 text-foreground hover:bg-secondary",
                  marketingFocusRing,
                )}
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
                      className={cn(
                        "rounded-lg px-3 py-2.5 text-base font-medium text-foreground hover:bg-secondary",
                        marketingFocusRing,
                      )}
                    >
                      {item.label}
                    </Link>
                  ))}
                  {account ? (
                    <>
                      <Link
                        href="/me"
                        className={cn(
                          "rounded-lg px-3 py-2.5 text-base font-medium text-foreground hover:bg-secondary",
                          marketingFocusRing,
                        )}
                      >
                        {strings.myPulse}
                      </Link>
                      <form action={signOutUser}>
                        <button
                          type="submit"
                          className={cn(
                            "w-full rounded-lg px-3 py-2.5 text-left text-base font-medium text-muted-foreground hover:bg-secondary hover:text-foreground",
                            marketingFocusRing,
                          )}
                        >
                          {strings.signOut}
                        </button>
                      </form>
                    </>
                  ) : (
                    <Link
                      href="/login"
                      className={cn(
                        "rounded-lg px-3 py-2.5 text-base font-medium text-muted-foreground hover:bg-secondary hover:text-foreground",
                        marketingFocusRing,
                      )}
                    >
                      {strings.logIn}
                    </Link>
                  )}
                  <Button className={cn("mt-2 w-full", marketingCtaPrimaryClasses)} asChild>
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
