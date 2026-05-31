"use client";

import Link from "next/link";
import { ArrowRight, Compass, Pin, Search, Sparkles, Users } from "lucide-react";
import { useSearchParams } from "next/navigation";
import { useMemo, useState } from "react";

import type { WebAppCirclesCopy } from "@/lib/marketing-copy/web-app";
import type { WebCircle, WebCirclesIndexResult, WebMyCircle } from "@/lib/web-app/circles-data";
import { formatCount } from "@/lib/web-app/format";

import { WebCircleCard } from "./web-circle-card";

function FeaturedCircle({ circle, copy }: { circle: WebCircle; copy: WebAppCirclesCopy }) {
  return (
    <Link
      href={`/web-app/circles/${encodeURIComponent(circle.slug)}`}
      className="group relative flex items-center gap-4 overflow-hidden rounded-3xl border border-amber-300/30 bg-gradient-to-br from-[rgba(28,24,10,0.7)] via-[rgba(14,20,34,0.85)] to-[rgba(12,18,32,0.9)] p-5 shadow-[0_30px_80px_-44px_rgba(0,0,0,0.95),0_0_40px_-18px_rgba(251,191,36,0.5)] backdrop-blur-sm transition hover:border-amber-300/50 sm:p-6"
    >
      <Pin className="absolute right-5 top-5 size-4 rotate-45 text-amber-300/80" aria-hidden />
      <span className="grid size-16 shrink-0 place-items-center rounded-2xl border border-amber-300/30 bg-gradient-to-br from-amber-300/20 to-amber-500/10 text-4xl shadow-[0_0_24px_-6px_rgba(251,191,36,0.7)] sm:size-20">
        {circle.icon ?? "💡"}
      </span>
      <div className="min-w-0 flex-1">
        <span className="inline-flex items-center gap-1.5 rounded-full border border-amber-300/40 bg-amber-300/10 px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-[0.16em] text-amber-200">
          <Pin className="size-3" aria-hidden />
          {copy.pinnedLabel}
        </span>
        <h2 className="mt-2 truncate font-heading text-xl font-bold tracking-tight text-foreground sm:text-2xl">
          {circle.name}
        </h2>
        {circle.description?.trim() ? (
          <p className="mt-1 line-clamp-1 text-sm text-muted-foreground [overflow-wrap:anywhere]">
            {circle.description}
          </p>
        ) : null}
        <p className="mt-1.5 flex items-center gap-1.5 text-xs text-muted-foreground">
          <Users className="size-3.5" aria-hidden />
          {formatCount(circle.memberCount)} {copy.membersLabel}
        </p>
      </div>
      <span className="hidden shrink-0 items-center gap-1.5 rounded-full border border-amber-300/40 bg-amber-300/10 px-4 py-2 text-sm font-semibold text-amber-100 transition group-hover:bg-amber-300/20 sm:inline-flex">
        {copy.viewLabel}
        <ArrowRight className="size-4" aria-hidden />
      </span>
    </Link>
  );
}

function SectionHeading({ icon, children }: { icon: React.ReactNode; children: React.ReactNode }) {
  return (
    <h2 className="mb-3 flex items-center gap-2 text-sm font-bold uppercase tracking-[0.14em] text-muted-foreground">
      {icon}
      {children}
    </h2>
  );
}

export function WebCirclesIndex({
  result,
  myCircles,
  copy,
}: {
  result: WebCirclesIndexResult;
  myCircles: WebMyCircle[];
  copy: WebAppCirclesCopy;
}) {
  const searchParams = useSearchParams();
  // Honor the chrome top-bar search (?q=) as the initial filter value.
  const [query, setQuery] = useState(() => searchParams.get("q") ?? "");

  const circles = useMemo(() => (result.state === "ok" ? result.circles : []), [result]);
  const featured = useMemo(() => circles.find((c) => c.isPinned) ?? null, [circles]);
  const rest = useMemo(() => circles.filter((c) => c.id !== featured?.id), [circles, featured]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return rest;
    return rest.filter(
      (c) =>
        c.name.toLowerCase().includes(q) ||
        (c.description ?? "").toLowerCase().includes(q),
    );
  }, [rest, query]);

  return (
    <div className="mx-auto w-full max-w-[940px] px-4 py-6 sm:px-6 sm:py-8">
      <header className="mb-5">
        <h1 className="font-heading text-2xl font-bold tracking-tight text-foreground">{copy.indexTitle}</h1>
        <p className="mt-1 text-sm text-muted-foreground">{copy.indexSubtitle}</p>
      </header>

      {/* My Circles — the signed-in viewer's joined Circles (read-only; joining stays in-app) */}
      <section className="mb-7">
        <SectionHeading icon={<Sparkles className="size-3.5 text-[var(--accent)]" aria-hidden />}>
          {copy.myCirclesTitle}
        </SectionHeading>
        {myCircles.length === 0 ? (
          <div className="rounded-3xl border border-white/10 bg-[rgba(12,18,32,0.8)] p-7 text-center backdrop-blur-sm">
            <span className="mx-auto mb-3 grid size-12 place-items-center rounded-2xl border border-white/10 bg-gradient-to-br from-primary/20 to-accent/15 text-2xl">
              💬
            </span>
            <p className="text-base font-semibold text-foreground">{copy.myCirclesEmptyTitle}</p>
            <p className="mx-auto mt-1.5 max-w-sm text-sm leading-relaxed text-muted-foreground">
              {copy.myCirclesEmptyBody}
            </p>
            <a
              href="#discover-circles"
              className="mt-4 inline-flex items-center gap-1.5 rounded-full bg-gradient-to-r from-teal-400 to-sky-500 px-4 py-2 text-sm font-semibold text-[#04121f] shadow-[0_8px_24px_-10px_rgba(20,184,166,0.8)] transition hover:brightness-110"
            >
              <Compass className="size-4" aria-hidden />
              {copy.exploreCirclesCta}
            </a>
          </div>
        ) : (
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {myCircles.map((circle) => (
              <WebCircleCard key={circle.id} circle={circle} copy={copy} />
            ))}
          </div>
        )}
      </section>

      <section id="discover-circles" className="scroll-mt-24">
        <SectionHeading icon={<Compass className="size-3.5 text-[var(--accent)]" aria-hidden />}>
          {copy.discoverTitle}
        </SectionHeading>
      {result.state === "error" ? (
        <div className="rounded-3xl border border-white/10 bg-[rgba(12,18,32,0.8)] p-8 text-center backdrop-blur-sm">
          <p className="text-base font-semibold text-foreground">{copy.errorTitle}</p>
          <p className="mx-auto mt-2 max-w-sm text-sm leading-relaxed text-muted-foreground">{copy.errorBody}</p>
        </div>
      ) : circles.length === 0 ? (
        <div className="rounded-3xl border border-white/10 bg-[rgba(12,18,32,0.8)] p-8 text-center backdrop-blur-sm">
          <p className="text-base font-semibold text-foreground">{copy.indexEmptyTitle}</p>
          <p className="mx-auto mt-2 max-w-sm text-sm leading-relaxed text-muted-foreground">{copy.indexEmptyBody}</p>
        </div>
      ) : (
        <>
          {/* Search */}
          <div className="mb-5 flex items-center gap-2 rounded-full border border-white/10 bg-white/[0.04] px-4 py-2.5 backdrop-blur-sm focus-within:border-primary/40">
            <Search className="size-4 shrink-0 text-muted-foreground" aria-hidden />
            <input
              type="search"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder={copy.searchPlaceholder}
              className="w-full bg-transparent text-sm text-foreground placeholder:text-muted-foreground focus:outline-none"
            />
          </div>

          {/* Featured pinned circle (hidden while actively searching) */}
          {featured && !query.trim() ? (
            <div className="mb-5">
              <FeaturedCircle circle={featured} copy={copy} />
            </div>
          ) : null}

          {filtered.length === 0 ? (
            <div className="rounded-3xl border border-white/10 bg-[rgba(12,18,32,0.7)] p-8 text-center text-sm text-muted-foreground backdrop-blur-sm">
              {copy.searchEmpty}
            </div>
          ) : (
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {filtered.map((circle) => (
                <WebCircleCard key={circle.id} circle={circle} copy={copy} />
              ))}
            </div>
          )}
        </>
      )}
      </section>
    </div>
  );
}
