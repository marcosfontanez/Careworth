"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { ArrowRight, Menu } from "lucide-react";

import { signOutUser } from "@/app/(marketing)/login/actions";
import { getSupabaseBrowserClient } from "@/components/auth/supabase-browser-client";
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

/**
 * Resolves the signed-in marketing visitor **on the client, after paint**.
 *
 * The marketing shell is intentionally SSR-anonymous (no Supabase auth/DB work
 * in the server render → fast, cacheable TTFB). Logged-in chrome (the "me" link
 * + sign-out) hydrates in shortly after load via the browser Supabase client.
 * For the public homepage CWV traffic (overwhelmingly anonymous) this is a no-op
 * network-wise; for signed-in users it's a tiny, non-blocking post-paint fetch.
 */
function useMarketingAccount(): MarketingAccountChip {
  const [account, setAccount] = useState<MarketingAccountChip>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const supabase = getSupabaseBrowserClient();
        const {
          data: { user },
        } = await supabase.auth.getUser();
        if (cancelled || !user) return;
        const { data: profile } = await supabase
          .from("profiles")
          .select("display_name, username")
          .eq("id", user.id)
          .maybeSingle();
        if (cancelled) return;
        setAccount({
          userId: user.id,
          displayName: profile?.display_name ?? null,
          username: profile?.username ?? null,
        });
      } catch {
        /* Anonymous or unconfigured — keep the logged-out nav. */
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  return account;
}

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

export function MarketingNav({ locale }: { locale: Locale }) {
  const pathname = usePathname() ?? "";
  const account = useMarketingAccount();
  const centerLinks = getMarketingCenterLinks(locale);
  const strings = getMarketingNavStrings(locale);
  const meLabel =
    account?.displayName?.trim() ||
    (account?.username ? `@${account.username}` : null) ||
    strings.myPulse;

  /* Condense the bar after a little scroll — tighter height, deeper blur, a
     faint cyan hairline. A small premium "settle" cue on every page. */
  const [scrolled, setScrolled] = useState(false);
  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 8);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <header
      className={cn(
        "sticky top-0 z-50 border-b transition-[background-color,border-color,box-shadow,backdrop-filter] duration-300",
        scrolled
          ? "border-[rgba(0,210,255,0.16)] bg-[rgba(5,10,20,0.96)] shadow-[0_10px_40px_-20px_rgba(0,0,0,0.9)] backdrop-blur-2xl"
          : "border-[rgba(148,163,184,0.1)] bg-[rgba(5,10,20,0.85)] backdrop-blur-xl",
      )}
    >
      <div
        className={cn(
          "flex items-center gap-2 transition-[min-height,padding] duration-300 sm:gap-3 lg:gap-5",
          scrolled ? "min-h-14 py-1.5 sm:min-h-16" : "min-h-16 py-2 sm:min-h-20",
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
              prefetch={false}
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
              <Link href="/login" prefetch={false} className={marketingFocusRing}>
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
              <span>{strings.join}</span>
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
                        prefetch={false}
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
                      prefetch={false}
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
