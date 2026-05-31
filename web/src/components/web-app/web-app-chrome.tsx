"use client";

import { useMemo } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Bell,
  ExternalLink,
  Home,
  LayoutGrid,
  LogOut,
  Plus,
  Radio,
  Settings as SettingsIcon,
  User,
  type LucideIcon,
} from "lucide-react";

import { signOutUser } from "@/app/(marketing)/login/actions";
import type { WebAppNavKey, WebAppShellCopy } from "@/lib/marketing-copy/web-app";
import { cn } from "@/lib/utils";

/** Native Next.js routes for each nav entry. */
const NAV_ROUTE: Record<WebAppNavKey, string> = {
  feed: "/web-app/feed",
  circles: "/web-app/circles",
  live: "/web-app/live",
  myPulse: "/web-app/my-pulse",
  creatorHub: "/web-app/creator-hub",
  notifications: "/web-app/notifications",
  settings: "/web-app/settings",
};

const NAV_ICONS: Record<WebAppNavKey, LucideIcon> = {
  feed: Home,
  circles: LayoutGrid,
  live: Radio,
  myPulse: User,
  creatorHub: Plus,
  notifications: Bell,
  settings: SettingsIcon,
};

const NAV_ORDER: WebAppNavKey[] = [
  "feed",
  "circles",
  "live",
  "myPulse",
  "creatorHub",
  "notifications",
  "settings",
];

type Account = {
  displayName: string | null;
  username: string | null;
  avatarUrl: string | null;
};

export type WebAppRailCircle = {
  slug: string;
  name: string;
  icon: string | null;
};

export type WebAppRailCreator = {
  id: string;
  displayName: string;
  username: string | null;
  avatarUrl: string | null;
};

export function WebAppChrome({
  account,
  copy,
  externalAppBase,
  trendingCircles = [],
  suggestedCreators = [],
  guidelinesHref = "/community-guidelines",
  getAppHref = "/download",
  children,
}: {
  account: Account;
  copy: WebAppShellCopy;
  /** Usable external Expo export origin, or null when not configured. */
  externalAppBase: string | null;
  /** Safe, public circles for the right rail (empty hides the card). */
  trendingCircles?: WebAppRailCircle[];
  /** Safe, public creator suggestions for the right rail (empty hides the card). */
  suggestedCreators?: WebAppRailCreator[];
  guidelinesHref?: string;
  getAppHref?: string;
  children: React.ReactNode;
}) {
  const pathname = usePathname() ?? "/web-app/feed";

  const activeKey = useMemo<WebAppNavKey>(() => {
    const match = NAV_ORDER.find(
      (key) => pathname === NAV_ROUTE[key] || pathname.startsWith(`${NAV_ROUTE[key]}/`),
    );
    return match ?? "feed";
  }, [pathname]);

  const openAppHref = externalAppBase ?? getAppHref;
  const isExternalApp = Boolean(externalAppBase);

  const initials = useMemo(() => {
    const n = account.displayName?.trim() || account.username?.trim() || "";
    return n ? n.slice(0, 1).toUpperCase() : "P";
  }, [account]);

  return (
    <div className="flex h-dvh w-full flex-col overflow-hidden bg-[#020617] text-foreground">
      {/* ── Top bar ─────────────────────────────────────────────── */}
      <header className="relative z-20 flex h-14 shrink-0 items-center gap-3 border-b border-white/8 bg-[rgba(8,14,28,0.85)] px-3 backdrop-blur-xl sm:px-4">
        <Link href="/" className="flex shrink-0 items-center gap-2">
          <span className="grid size-8 place-items-center rounded-xl bg-gradient-to-br from-primary to-accent text-sm font-black text-white shadow-[0_0_18px_-4px_rgba(45,127,249,0.7)]">
            P
          </span>
          <span className="hidden font-heading text-sm font-bold tracking-tight sm:inline">
            {copy.wordmark}
          </span>
        </Link>

        <div className="ml-auto flex items-center gap-2">
          <Link
            href={NAV_ROUTE.creatorHub}
            className="hidden items-center gap-1.5 rounded-full bg-gradient-to-r from-primary to-accent px-4 py-2 text-sm font-semibold text-white shadow-[0_0_24px_-6px_rgba(45,127,249,0.8)] transition hover:brightness-110 sm:inline-flex"
          >
            <Plus className="size-4" aria-hidden />
            {copy.createLabel}
          </Link>

          <a
            href={openAppHref}
            {...(isExternalApp ? { target: "_blank", rel: "noreferrer" } : {})}
            title={copy.openNewTab}
            aria-label={copy.openNewTab}
            className="grid size-9 place-items-center rounded-full border border-white/10 bg-white/5 text-muted-foreground transition hover:border-white/20 hover:text-foreground"
          >
            <ExternalLink className="size-4" aria-hidden />
          </a>

          <div className="group relative">
            <button
              type="button"
              className="flex items-center gap-2 rounded-full border border-white/10 bg-white/5 py-1 pl-1 pr-2.5 transition hover:border-white/20"
              aria-label={account.displayName ?? account.username ?? "Account"}
            >
              <span className="grid size-7 place-items-center overflow-hidden rounded-full bg-secondary/60 text-xs font-bold">
                {account.avatarUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={account.avatarUrl} alt="" className="size-full object-cover" />
                ) : (
                  initials
                )}
              </span>
              <span className="hidden max-w-[8rem] truncate text-sm font-medium lg:inline">
                {account.displayName ?? `@${account.username ?? ""}`}
              </span>
            </button>
            <div className="pointer-events-none absolute right-0 top-[calc(100%+8px)] z-30 w-48 overflow-hidden rounded-xl border border-white/10 bg-[rgba(12,21,36,0.97)] opacity-0 shadow-2xl backdrop-blur-xl transition group-focus-within:pointer-events-auto group-focus-within:opacity-100 group-hover:pointer-events-auto group-hover:opacity-100">
              <Link
                href={NAV_ROUTE.myPulse}
                className="flex w-full items-center gap-2 px-4 py-2.5 text-left text-sm text-foreground/90 transition hover:bg-white/5"
              >
                <User className="size-4" aria-hidden />
                {copy.accountProfile}
              </Link>
              <form action={signOutUser} className="border-t border-white/8">
                <button
                  type="submit"
                  className="flex w-full items-center gap-2 px-4 py-2.5 text-left text-sm text-foreground/90 transition hover:bg-white/5"
                >
                  <LogOut className="size-4" aria-hidden />
                  {copy.signOut}
                </button>
              </form>
            </div>
          </div>
        </div>
      </header>

      {/* ── Mobile nav strip ────────────────────────────────────── */}
      <nav className="flex shrink-0 items-center gap-1.5 overflow-x-auto border-b border-white/8 bg-[rgba(8,14,28,0.6)] px-3 py-2 md:hidden [scrollbar-width:none]">
        {NAV_ORDER.map((key) => {
          const Icon = NAV_ICONS[key];
          const isActive = key === activeKey;
          return (
            <Link
              key={key}
              href={NAV_ROUTE[key]}
              className={cn(
                "flex shrink-0 items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-semibold transition",
                isActive
                  ? "bg-primary/15 text-primary"
                  : "text-muted-foreground hover:bg-white/5 hover:text-foreground",
              )}
            >
              <Icon className="size-3.5" aria-hidden />
              {copy.nav[key]}
            </Link>
          );
        })}
      </nav>

      {/* ── Body: left rail | center content | right rail ───────── */}
      <div className="flex min-h-0 flex-1">
        {/* Left nav rail */}
        <aside className="hidden shrink-0 flex-col gap-1 border-r border-white/8 bg-[rgba(8,14,28,0.45)] p-2 md:flex md:w-[68px] xl:w-60 xl:p-3">
          {NAV_ORDER.map((key) => {
            const Icon = NAV_ICONS[key];
            const isActive = key === activeKey;
            return (
              <Link
                key={key}
                href={NAV_ROUTE[key]}
                title={copy.nav[key]}
                className={cn(
                  "group flex items-center gap-3 rounded-xl px-2.5 py-2.5 text-sm font-semibold transition xl:px-3",
                  "justify-center xl:justify-start",
                  isActive
                    ? "bg-gradient-to-r from-primary/20 to-accent/10 text-foreground ring-1 ring-primary/30"
                    : "text-muted-foreground hover:bg-white/5 hover:text-foreground",
                )}
              >
                <Icon className={cn("size-5 shrink-0", isActive && "text-primary")} aria-hidden />
                <span className="hidden xl:inline">{copy.nav[key]}</span>
              </Link>
            );
          })}
        </aside>

        {/* Center content surface */}
        <main className="relative min-w-0 flex-1 overflow-y-auto">
          <div
            aria-hidden
            className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_60%_50%_at_50%_-10%,rgba(20,184,166,0.08),transparent_55%),radial-gradient(ellipse_50%_40%_at_85%_30%,rgba(45,127,249,0.07),transparent_50%)]"
          />
          <div className="relative flex min-h-full flex-col">{children}</div>
        </main>

        {/* Right contextual rail (static, safe) */}
        <aside className="hidden w-80 shrink-0 flex-col gap-3 overflow-y-auto border-l border-white/8 bg-[rgba(8,14,28,0.4)] p-4 xl:flex">
          {trendingCircles.length > 0 ? (
            <section className="rounded-2xl border border-white/10 bg-[rgba(12,21,36,0.6)] p-4 backdrop-blur-sm">
              <h2 className="text-xs font-bold uppercase tracking-[0.16em] text-[var(--accent)]">
                {copy.railCirclesTitle}
              </h2>
              <ul className="mt-3 space-y-1">
                {trendingCircles.map((circle) => (
                  <li key={circle.slug}>
                    <Link
                      href={`/web-app/circles/${encodeURIComponent(circle.slug)}`}
                      className="flex items-center gap-2.5 rounded-xl px-2 py-2 text-sm text-foreground/90 transition hover:bg-white/5"
                    >
                      <span className="grid size-7 shrink-0 place-items-center rounded-lg border border-white/10 bg-white/5 text-base">
                        {circle.icon ?? "💬"}
                      </span>
                      <span className="truncate font-medium">{circle.name}</span>
                    </Link>
                  </li>
                ))}
              </ul>
            </section>
          ) : null}

          {suggestedCreators.length > 0 ? (
            <section className="rounded-2xl border border-white/10 bg-[rgba(12,21,36,0.6)] p-4 backdrop-blur-sm">
              <h2 className="text-xs font-bold uppercase tracking-[0.16em] text-[var(--accent)]">
                {copy.railCreatorsTitle}
              </h2>
              <ul className="mt-3 space-y-1">
                {suggestedCreators.map((creator) => (
                  <li key={creator.id}>
                    <Link
                      href={`/web-app/user/${creator.id}`}
                      className="flex items-center gap-2.5 rounded-xl px-2 py-2 transition hover:bg-white/5"
                    >
                      <span className="grid size-8 shrink-0 place-items-center overflow-hidden rounded-full bg-secondary/60 text-xs font-bold text-foreground/80">
                        {creator.avatarUrl ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img src={creator.avatarUrl} alt="" className="size-full object-cover" />
                        ) : (
                          <User className="size-4 text-muted-foreground" aria-hidden />
                        )}
                      </span>
                      <span className="min-w-0">
                        <span className="block truncate text-sm font-medium text-foreground">
                          {creator.displayName}
                        </span>
                        {creator.username ? (
                          <span className="block truncate text-xs text-muted-foreground">
                            @{creator.username}
                          </span>
                        ) : null}
                      </span>
                    </Link>
                  </li>
                ))}
              </ul>
            </section>
          ) : null}

          <section className="rounded-2xl border border-white/10 bg-[rgba(12,21,36,0.6)] p-4 backdrop-blur-sm">
            <h2 className="text-xs font-bold uppercase tracking-[0.16em] text-[var(--accent)]">
              {copy.railTitle}
            </h2>
            <ul className="mt-3 space-y-2.5">
              {copy.railTips.map((tip) => (
                <li key={tip} className="flex gap-2 text-sm leading-relaxed text-muted-foreground">
                  <span className="mt-1.5 size-1.5 shrink-0 rounded-full bg-primary/70" aria-hidden />
                  {tip}
                </li>
              ))}
            </ul>
          </section>

          <section className="rounded-2xl border border-white/10 bg-[rgba(12,21,36,0.6)] p-4 backdrop-blur-sm">
            <h3 className="text-sm font-semibold text-foreground">{copy.railSafetyTitle}</h3>
            <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{copy.railSafetyBody}</p>
            <Link
              href={guidelinesHref}
              className="mt-3 inline-block text-sm font-medium text-sky-300 underline decoration-sky-300/60 underline-offset-2 hover:text-sky-200"
            >
              {copy.railSafetyLink}
            </Link>
          </section>

          <section className="rounded-2xl border border-white/10 bg-[rgba(12,21,36,0.6)] p-4 backdrop-blur-sm">
            <h3 className="text-sm font-semibold text-foreground">{copy.railGetAppTitle}</h3>
            <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{copy.railGetAppBody}</p>
            <Link
              href={getAppHref}
              className="mt-3 inline-block text-sm font-medium text-sky-300 underline decoration-sky-300/60 underline-offset-2 hover:text-sky-200"
            >
              {copy.railGetAppLink}
            </Link>
          </section>
        </aside>
      </div>
    </div>
  );
}
