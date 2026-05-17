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
import {
  OrbitDots,
  PosterCaptionStrip,
  PosterFrame,
  SpotlightBeam,
  WebsiteSectionBackdrop,
} from "@/components/marketing/website-visuals";
import { marketingGutterX, marketingEyebrow, marketingCardMuted, shadowPrimaryCta, marketingInlineLinkStrong } from "@/lib/ui-classes";
import { cn } from "@/lib/utils";
import {
  circlesDiscoverTags,
  circlesFeaturedShowcase,
  circlesTrendingTopics,
  circlesWhyBetter,
} from "@/mock/marketing";

export function FeatureCirclesLanding() {
  return (
    <>
      <section className="relative isolate overflow-hidden pb-20 pt-12 sm:pb-28 sm:pt-16">
        <WebsiteSectionBackdrop variant="deep" />
        <div className={cn(marketingGutterX, "relative grid items-center gap-12 lg:grid-cols-[minmax(0,0.7fr)_minmax(0,1.3fr)] lg:gap-16")}>
          <div>
            <p className={marketingEyebrow}>Circles</p>
            <h1 className="mt-5 text-balance text-4xl font-bold leading-[1.08] tracking-tight text-foreground sm:text-5xl lg:text-[3.25rem]">
              Where healthcare finds its{" "}
              <span className="bg-linear-to-r from-accent to-primary bg-clip-text text-transparent">people.</span>
            </h1>
            <p className="mt-6 max-w-xl text-pretty text-lg leading-relaxed text-muted-foreground">
              Join healthcare-specific, topic-based circles — premium rooms with high-signal threads. Share what lands
              with you straight back to My Pulse on your Pulse Page.
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Button asChild className={cn("h-12 rounded-full px-7 font-semibold", shadowPrimaryCta, "bg-primary text-primary-foreground")}>
                <Link href="/download" className="inline-flex items-center gap-2">
                  Join PulseVerse
                  <ArrowRight className="h-4 w-4" />
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

          <div className="relative lg:-mr-6 xl:-mr-12">
            <SpotlightBeam tone="blue" intensity="strong" />
            <OrbitDots tone="blue" preset="circles" />
            <PosterFrame
              src="/marketing/hero-circles.png"
              alt="PulseVerse Circles — discover popular circles, your circles, and trending topics"
              width={1024}
              height={576}
              glow="blue"
              size="dramatic"
              priority
              sizes="(max-width: 1024px) 100vw, 760px"
              tag={{ label: "Circles · iPhone" }}
            />
            <PosterCaptionStrip
              device="iPhone"
              context="Discover · Popular Circles · Trending Topics"
              tone="blue"
            />
          </div>
        </div>
      </section>

      <section className={cn(marketingGutterX, "pb-20")}>
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <h2 className="text-2xl font-bold tracking-tight text-foreground sm:text-3xl">Featured Circles</h2>
            <p className="mt-2 max-w-xl text-muted-foreground">
              Specialty, shift, and culture hubs — moderated with clinical context and designed to feel elevated, not
              like legacy forums.
            </p>
          </div>
          <Link href="/download" className={cn("inline-flex items-center gap-1 text-sm", marketingInlineLinkStrong)}>
            Explore all Circles
            <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
        <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
          {circlesFeaturedShowcase.map((c) => (
            <div
              key={c.name}
              className={cn(
                "group flex flex-col rounded-2xl border border-white/10 bg-linear-to-br p-5 ring-1 ring-white/5 transition hover:border-primary/35",
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
            <div className="mt-4 flex rounded-xl border border-white/10 bg-white/3 px-3 py-2 text-sm text-muted-foreground">
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
            <div className="mt-4 space-y-3 rounded-xl border border-white/10 bg-white/3 p-4">
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
