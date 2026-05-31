"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import {
  Bell,
  ExternalLink,
  Home,
  LayoutGrid,
  LogOut,
  Plus,
  Radio,
  Search,
  Settings as SettingsIcon,
  User,
  type LucideIcon,
} from "lucide-react";

import { signOutUser } from "@/app/(marketing)/login/actions";
import type { WebAppNavKey, WebAppShellCopy } from "@/lib/marketing-copy/web-app";
import { cn } from "@/lib/utils";

/** Deep-link paths into the embedded PulseVerse web export (expo-router). */
const NAV_PATHS: Record<WebAppNavKey, string> = {
  feed: "/feed",
  circles: "/circles",
  live: "/live",
  myPulse: "/my-pulse",
  creatorHub: "/create",
  notifications: "/notifications",
  settings: "/settings",
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

type LoadState = "loading" | "ready" | "error";

const LOAD_TIMEOUT_MS = 22_000;

export function WebAppShell({
  appUrl,
  account,
  copy,
  guidelinesHref = "/community-guidelines",
  getAppHref = "/download",
}: {
  appUrl: string | null;
  account: Account | null;
  copy: WebAppShellCopy;
  guidelinesHref?: string;
  getAppHref?: string;
}) {
  const [active, setActive] = useState<WebAppNavKey>("feed");
  const [status, setStatus] = useState<LoadState>("loading");
  /** Bumped to force a fresh iframe load on retry. */
  const [reloadKey, setReloadKey] = useState(0);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const base = appUrl?.replace(/\/$/, "") ?? "";
  const src = base ? `${base}${NAV_PATHS[active]}` : "";

  const armTimeout = useCallback(() => {
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    timeoutRef.current = setTimeout(() => setStatus("error"), LOAD_TIMEOUT_MS);
  }, []);

  useEffect(() => {
    if (!base) return;
    setStatus("loading");
    armTimeout();
    return () => {
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
    };
  }, [active, reloadKey, base, armTimeout]);

  const onIframeLoad = useCallback(() => {
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    setStatus("ready");
  }, []);

  const go = useCallback(
    (key: WebAppNavKey) => {
      setSearchActive(false);
      setActive((prev) => {
        if (prev === key) {
          // Re-tap on the active item reloads that surface.
          setReloadKey((k) => k + 1);
          return prev;
        }
        return key;
      });
    },
    [],
  );

  const retry = useCallback(() => setReloadKey((k) => k + 1), []);

  // Search is a lightweight affordance: navigate the embedded app to its
  // /search surface without leaving the shell.
  const [searchActive, setSearchActive] = useState(false);
  const onSearchSubmit = useCallback(
    (e: React.FormEvent) => {
      e.preventDefault();
      if (!base) return;
      setSearchActive(true);
      setStatus("loading");
      armTimeout();
    },
    [base, armTimeout],
  );

  const resolvedSrc = searchActive && base ? `${base}/search` : src;

  const initials = useMemo(() => {
    const n = account?.displayName?.trim() || account?.username?.trim() || "";
    return n ? n.slice(0, 1).toUpperCase() : "P";
  }, [account]);

  return (
    <div className="flex h-dvh w-full flex-col overflow-hidden bg-[#020617] text-foreground">
      {/* ── Top bar ─────────────────────────────────────────────── */}
      <header className="relative z-20 flex h-14 shrink-0 items-center gap-3 border-b border-white/8 bg-[rgba(8,14,28,0.85)] px-3 backdrop-blur-xl sm:px-4">
        <Link href="/" className="flex items-center gap-2 shrink-0">
          <span className="grid size-8 place-items-center rounded-xl bg-gradient-to-br from-primary to-accent text-sm font-black text-white shadow-[0_0_18px_-4px_rgba(45,127,249,0.7)]">
            P
          </span>
          <span className="hidden font-heading text-sm font-bold tracking-tight sm:inline">
            {copy.wordmark}
          </span>
        </Link>

        <form onSubmit={onSearchSubmit} className="mx-auto hidden w-full max-w-md items-center md:flex">
          <div className="flex w-full items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3.5 py-2 text-sm text-muted-foreground transition focus-within:border-primary/45 focus-within:bg-white/7">
            <Search className="size-4 shrink-0" aria-hidden />
            <input
              type="search"
              placeholder={copy.searchPlaceholder}
              className="w-full bg-transparent text-foreground outline-none placeholder:text-muted-foreground/70"
              aria-label={copy.searchPlaceholder}
            />
          </div>
        </form>

        <div className="ml-auto flex items-center gap-2">
          <button
            type="button"
            onClick={() => go("creatorHub")}
            className={cn(
              "hidden items-center gap-1.5 rounded-full bg-gradient-to-r from-primary to-accent px-4 py-2 text-sm font-semibold text-white shadow-[0_0_24px_-6px_rgba(45,127,249,0.8)] transition hover:brightness-110 sm:inline-flex",
            )}
          >
            <Plus className="size-4" aria-hidden />
            {copy.createLabel}
          </button>

          {base ? (
            <a
              href={resolvedSrc}
              target="_blank"
              rel="noreferrer"
              title={copy.openNewTab}
              aria-label={copy.openNewTab}
              className="grid size-9 place-items-center rounded-full border border-white/10 bg-white/5 text-muted-foreground transition hover:border-white/20 hover:text-foreground"
            >
              <ExternalLink className="size-4" aria-hidden />
            </a>
          ) : null}

          {account ? (
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
                <button
                  type="button"
                  onClick={() => go("myPulse")}
                  className="flex w-full items-center gap-2 px-4 py-2.5 text-left text-sm text-foreground/90 transition hover:bg-white/5"
                >
                  <User className="size-4" aria-hidden />
                  {copy.accountProfile}
                </button>
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
          ) : (
            <Link
              href="/login?next=/web-app"
              className="rounded-full border border-white/10 bg-white/5 px-4 py-2 text-sm font-medium transition hover:border-white/20"
            >
              {copy.accountProfile}
            </Link>
          )}
        </div>
      </header>

      {/* ── Mobile nav strip ────────────────────────────────────── */}
      <nav className="flex shrink-0 items-center gap-1.5 overflow-x-auto border-b border-white/8 bg-[rgba(8,14,28,0.6)] px-3 py-2 md:hidden [scrollbar-width:none]">
        {NAV_ORDER.map((key) => {
          const Icon = NAV_ICONS[key];
          const isActive = !searchActive && key === active;
          return (
            <button
              key={key}
              type="button"
              onClick={() => {
                setSearchActive(false);
                go(key);
              }}
              className={cn(
                "flex shrink-0 items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-semibold transition",
                isActive
                  ? "bg-primary/15 text-primary"
                  : "text-muted-foreground hover:bg-white/5 hover:text-foreground",
              )}
            >
              <Icon className="size-3.5" aria-hidden />
              {copy.nav[key]}
            </button>
          );
        })}
      </nav>

      {/* ── Body: left rail | center embed | right rail ─────────── */}
      <div className="flex min-h-0 flex-1">
        {/* Left nav rail */}
        <aside className="hidden shrink-0 flex-col gap-1 border-r border-white/8 bg-[rgba(8,14,28,0.45)] p-2 md:flex md:w-[68px] xl:w-60 xl:p-3">
          {NAV_ORDER.map((key) => {
            const Icon = NAV_ICONS[key];
            const isActive = !searchActive && key === active;
            return (
              <button
                key={key}
                type="button"
                onClick={() => {
                  setSearchActive(false);
                  go(key);
                }}
                title={copy.nav[key]}
                className={cn(
                  "group flex items-center gap-3 rounded-xl px-2.5 py-2.5 text-sm font-semibold transition xl:px-3",
                  "justify-center xl:justify-start",
                  isActive
                    ? "bg-gradient-to-r from-primary/20 to-accent/10 text-foreground ring-1 ring-primary/30"
                    : "text-muted-foreground hover:bg-white/5 hover:text-foreground",
                )}
              >
                <Icon
                  className={cn("size-5 shrink-0", isActive && "text-primary")}
                  aria-hidden
                />
                <span className="hidden xl:inline">{copy.nav[key]}</span>
              </button>
            );
          })}
        </aside>

        {/* Center embed surface */}
        <main className="relative min-w-0 flex-1 overflow-hidden">
          {/* cinematic backdrop behind the centered surface */}
          <div
            aria-hidden
            className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_60%_50%_at_50%_-10%,rgba(20,184,166,0.08),transparent_55%),radial-gradient(ellipse_50%_40%_at_85%_30%,rgba(45,127,249,0.07),transparent_50%)]"
          />
          <div className="relative mx-auto flex h-full max-w-[620px] flex-col px-0 sm:px-4 sm:py-4">
            <div className="relative flex-1 overflow-hidden border-white/10 bg-[#020617] sm:rounded-3xl sm:border sm:shadow-[0_30px_90px_-30px_rgba(0,0,0,0.9),0_0_0_1px_rgba(20,184,166,0.08)]">
              {base ? (
                <>
                  <iframe
                    key={reloadKey}
                    src={resolvedSrc}
                    title={copy.iframeTitle}
                    onLoad={onIframeLoad}
                    className="absolute inset-0 size-full border-0 bg-[#020617]"
                    allow="clipboard-read; clipboard-write; fullscreen; microphone; camera; autoplay"
                    referrerPolicy="strict-origin-when-cross-origin"
                  />
                  {status === "loading" ? (
                    <div className="absolute inset-0 z-10 grid place-items-center bg-[#020617]">
                      <div className="flex flex-col items-center gap-4 text-center">
                        <span className="size-10 animate-spin rounded-full border-2 border-white/15 border-t-primary" />
                        <div>
                          <p className="text-sm font-semibold text-foreground">{copy.loadingTitle}</p>
                          <p className="mt-1 text-xs text-muted-foreground">{copy.loadingBody}</p>
                        </div>
                      </div>
                    </div>
                  ) : null}
                  {status === "error" ? (
                    <div className="absolute inset-0 z-10 grid place-items-center bg-[#020617] px-6">
                      <div className="max-w-sm text-center">
                        <p className="text-base font-semibold text-foreground">{copy.errorTitle}</p>
                        <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{copy.errorBody}</p>
                        <div className="mt-5 flex items-center justify-center gap-3">
                          <button
                            type="button"
                            onClick={retry}
                            className="rounded-full bg-gradient-to-r from-primary to-accent px-5 py-2 text-sm font-semibold text-white transition hover:brightness-110"
                          >
                            {copy.retry}
                          </button>
                          <a
                            href={resolvedSrc}
                            target="_blank"
                            rel="noreferrer"
                            className="rounded-full border border-white/15 px-5 py-2 text-sm font-medium text-foreground/90 transition hover:border-white/30"
                          >
                            {copy.openNewTab}
                          </a>
                        </div>
                      </div>
                    </div>
                  ) : null}
                </>
              ) : (
                <div className="absolute inset-0 grid place-items-center px-6">
                  <div className="max-w-md text-center">
                    <p className="text-base font-semibold text-foreground">{copy.notConfiguredTitle}</p>
                    <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
                      {copy.notConfiguredBody}
                    </p>
                  </div>
                </div>
              )}
            </div>
          </div>
        </main>

        {/* Right contextual rail */}
        <aside className="hidden w-80 shrink-0 flex-col gap-3 overflow-y-auto border-l border-white/8 bg-[rgba(8,14,28,0.4)] p-4 xl:flex">
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
