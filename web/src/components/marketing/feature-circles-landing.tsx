import Link from "next/link";
import {
  ArrowRight,
  Check,
  Globe,
  Search,
  Shield,
  Users,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { marketingGutterX, marketingEyebrow, marketingCardMuted, shadowPrimaryCta } from "@/lib/ui-classes";
import { cn } from "@/lib/utils";
import {
  circlesDiscoverTags,
  circlesFeaturedShowcase,
  circlesTrendingTopics,
  circlesWhyBetter,
} from "@/mock/marketing";

function PulseDecor({ className }: { className?: string }) {
  return (
    <svg
      className={cn("text-primary/50", className)}
      viewBox="0 0 400 100"
      fill="none"
      aria-hidden
    >
      <path
        d="M0 50 H80 L92 18 L104 82 L116 28 L128 72 L140 38 L152 58 H400"
        stroke="currentColor"
        strokeWidth="1.5"
        vectorEffect="non-scaling-stroke"
      />
    </svg>
  );
}

export function FeatureCirclesLanding() {
  return (
    <>
      <section className="relative overflow-hidden pb-16 pt-10 sm:pb-24 sm:pt-14">
        <div className="pointer-events-none absolute -left-24 top-0 h-80 w-80 rounded-full bg-primary/10 blur-[90px]" />
        <div className="pointer-events-none absolute -right-20 top-40 h-72 w-72 rounded-full bg-[var(--accent)]/10 blur-[80px]" />
        <div className={cn(marketingGutterX, "relative grid items-center gap-14 lg:grid-cols-2")}>
          <div>
            <p className={marketingEyebrow}>Circles</p>
            <h1 className="mt-5 text-4xl font-bold leading-[1.08] tracking-tight text-foreground sm:text-5xl lg:text-[3.25rem]">
              Circles: where healthcare finds its{" "}
              <span className="bg-gradient-to-r from-[var(--accent)] to-primary bg-clip-text text-transparent">people.</span>
            </h1>
            <p className="mt-6 max-w-xl text-lg leading-relaxed text-muted-foreground">
              Join private, topic-based communities built for healthcare professionals. Share knowledge, ask questions,
              and grow together—with people who get it.
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Button asChild className={cn("h-12 rounded-full px-7 font-semibold", shadowPrimaryCta, "bg-primary text-primary-foreground")}>
                <Link href="/download" className="inline-flex items-center gap-2">
                  Join CareWorth
                  <ArrowRight className="h-4 w-4" />
                </Link>
              </Button>
              <Button asChild variant="outline" className="h-12 rounded-full border-white/15 bg-white/[0.04] px-7 font-semibold">
                <Link href="/features" className="inline-flex items-center gap-2">
                  <Search className="h-4 w-4" />
                  Explore Circles
                </Link>
              </Button>
            </div>
            <div className="mt-10 flex flex-wrap gap-6 text-sm text-muted-foreground">
              <span className="inline-flex items-center gap-2">
                <Users className="h-4 w-4 text-primary" />
                Topic-based communities
              </span>
              <span className="inline-flex items-center gap-2">
                <Shield className="h-4 w-4 text-primary" />
                Trusted professionals
              </span>
              <span className="inline-flex items-center gap-2">
                <Globe className="h-4 w-4 text-primary" />
                Safe &amp; focused
              </span>
            </div>
          </div>
          <div className="relative">
            <PulseDecor className="absolute -right-4 top-8 w-[110%] max-w-none opacity-60 sm:top-12" />
            <div className="relative mx-auto grid max-w-lg gap-4 sm:max-w-none sm:grid-cols-2">
              <div
                className={cn(
                  "rounded-2xl border border-white/10 bg-[rgba(12,21,36,0.85)] p-4 shadow-[0_24px_80px_-24px_rgba(0,0,0,0.85)] backdrop-blur-md",
                  "sm:translate-y-6",
                )}
              >
                <p className="text-xs font-semibold uppercase tracking-wider text-[var(--accent)]">Circles · preview</p>
                <div className="mt-3 space-y-2">
                  {[1, 2, 3].map((i) => (
                    <div key={i} className="flex items-center gap-3 rounded-xl border border-white/5 bg-white/[0.03] px-3 py-2">
                      <div className="h-9 w-9 rounded-lg bg-gradient-to-br from-primary/40 to-[#0066ff]/30" />
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-medium text-foreground">Thread preview {i}</p>
                        <p className="truncate text-xs text-muted-foreground">Reactions · clinician-moderated</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
              <div className="rounded-2xl border border-white/10 bg-[rgba(12,21,36,0.75)] p-4 ring-1 ring-white/[0.04] backdrop-blur-md">
                <p className="text-xs text-muted-foreground">Featured rooms</p>
                <p className="mt-2 text-2xl font-bold text-foreground">25K+</p>
                <p className="text-sm text-[var(--accent)]">active circles</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className={cn(marketingGutterX, "pb-20")}>
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <h2 className="text-2xl font-bold tracking-tight text-foreground sm:text-3xl">Featured Circles</h2>
            <p className="mt-2 max-w-xl text-muted-foreground">Culture hubs clinicians actually join — from humor to high-acuity rooms.</p>
          </div>
          <Link href="/download" className="inline-flex items-center gap-1 text-sm font-semibold text-primary hover:underline">
            Explore all Circles
            <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
        <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
          {circlesFeaturedShowcase.map((c) => (
            <div
              key={c.name}
              className={cn(
                "group flex flex-col rounded-2xl border border-white/10 bg-gradient-to-br p-5 ring-1 ring-white/[0.05] transition hover:border-primary/35",
                c.tint,
              )}
            >
              <span className="text-3xl" aria-hidden>
                {c.emoji}
              </span>
              <p className="mt-4 text-sm font-semibold text-foreground">{c.name}</p>
              <p className="mt-1 text-xs text-muted-foreground">{c.members} members</p>
            </div>
          ))}
        </div>

        <div className="mt-14 grid gap-6 lg:grid-cols-2 xl:grid-cols-4">
          <div className={cn("rounded-2xl p-6", marketingCardMuted)}>
            <h3 className="text-sm font-semibold uppercase tracking-wider text-[var(--accent)]">Trending · 24h</h3>
            <ol className="mt-4 space-y-3">
              {circlesTrendingTopics.map((t, i) => (
                <li key={t} className="flex gap-3 text-sm">
                  <span className="font-mono text-xs text-muted-foreground">{i + 1}</span>
                  <span className="text-foreground">{t}</span>
                </li>
              ))}
            </ol>
          </div>
          <div className={cn("rounded-2xl p-6", marketingCardMuted)}>
            <h3 className="text-sm font-semibold text-foreground">Discover your people</h3>
            <div className="mt-4 flex rounded-xl border border-white/10 bg-white/[0.03] px-3 py-2 text-sm text-muted-foreground">
              <Search className="mr-2 h-4 w-4 shrink-0 text-primary" />
              Search Circles…
            </div>
            <div className="mt-4 flex flex-wrap gap-2">
              {circlesDiscoverTags.map((tag) => (
                <span
                  key={tag}
                  className="rounded-full border border-primary/25 bg-primary/10 px-3 py-1 text-xs font-medium text-primary"
                >
                  {tag}
                </span>
              ))}
            </div>
          </div>
          <div className={cn("rounded-2xl p-6", marketingCardMuted)}>
            <h3 className="text-sm font-semibold text-foreground">Share &amp; repost</h3>
            <div className="mt-4 space-y-3 rounded-xl border border-white/10 bg-white/[0.03] p-4">
              <p className="text-sm text-muted-foreground">Great thread on night-shift handoffs…</p>
              <div className="flex flex-wrap gap-2">
                <Button size="sm" variant="secondary" className="border border-white/10 bg-primary/15 text-primary">
                  Share to Circle
                </Button>
                <Button size="sm" variant="outline" className="border-white/15">
                  Repost to My Pulse
                </Button>
              </div>
            </div>
          </div>
          <div className={cn("rounded-2xl p-6", marketingCardMuted)}>
            <h3 className="text-sm font-semibold text-foreground">Why Circles win</h3>
            <ul className="mt-4 space-y-3">
              {circlesWhyBetter.map((line) => (
                <li key={line} className="flex gap-2 text-sm text-muted-foreground">
                  <Check className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
                  {line}
                </li>
              ))}
            </ul>
          </div>
        </div>
      </section>
    </>
  );
}
