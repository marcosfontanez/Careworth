import Link from "next/link";
import { ArrowRight, BarChart3, Link2, MessageSquare, Sparkles, UserCircle } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  OrbitDots,
  PosterCaptionStrip,
  PosterFrame,
  PremiumSectionHeader,
  SpotlightBeam,
  WebsiteSectionBackdrop,
} from "@/components/marketing/website-visuals";
import { marketingGutterX, marketingEyebrow, marketingCardMuted, shadowPrimaryCta, marketingInlineLinkStrong } from "@/lib/ui-classes";
import { cn } from "@/lib/utils";
import {
  pulsePageAudienceSegments,
  pulsePageShareWays,
  pulsePageShowcase,
  pulsePageWhyProfessionals,
} from "@/mock/marketing";

export function FeaturePulsePageLanding() {
  return (
    <>
      {/* Hero — copy + identity statement, no inline mock UI. The flagship
          comparison render carries the visual story in the next band. */}
      <section className="relative isolate overflow-hidden pb-12 pt-12 sm:pb-16 sm:pt-16">
        <WebsiteSectionBackdrop variant="spotlight" />
        <div className={cn(marketingGutterX, "relative")}>
          <div className="mx-auto max-w-3xl text-center">
            <p className="inline-flex items-center gap-2 rounded-full border border-primary/30 bg-primary/[0.08] px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.2em] text-primary backdrop-blur">
              Pulse Page <span className="text-muted-foreground/60">/</span>
              <span className="text-[var(--accent)]">My Pulse</span>
            </p>
            <h1 className="mt-6 text-balance text-4xl font-bold leading-[1.08] tracking-tight text-foreground sm:text-5xl lg:text-[3.25rem]">
              Your{" "}
              <span className="bg-linear-to-r from-accent to-primary bg-clip-text text-transparent">
                professional home
              </span>{" "}
              on PulseVerse.
            </h1>
            <p className="mx-auto mt-6 max-w-2xl text-pretty text-lg leading-relaxed text-muted-foreground">
              A premium identity surface — Current Vibe mini player, My Pulse (latest five updates), Media Hub — and a
              rolling five-slot expression feed that always reads current, never cluttered.
            </p>
            <div className="mt-8 flex flex-wrap justify-center gap-3">
              <Button asChild className={cn("h-12 rounded-full px-7 font-semibold", shadowPrimaryCta, "bg-primary text-primary-foreground")}>
                <Link href="/download" className="inline-flex items-center gap-2">
                  Create your Pulse Page
                  <ArrowRight className="h-4 w-4" />
                </Link>
              </Button>
              <Button asChild variant="outline" className="h-12 rounded-full border-white/15 bg-white/4 px-7 font-semibold">
                <Link href="/features/my-pulse" className="inline-flex items-center gap-2">
                  <MessageSquare className="h-4 w-4" />
                  How My Pulse works
                </Link>
              </Button>
            </div>
            <div className="mt-8 flex flex-wrap justify-center gap-x-6 gap-y-3 text-sm text-muted-foreground">
              <span className="inline-flex items-center gap-2">
                <Sparkles className="h-4 w-4 text-primary" />
                Premium professional profile
              </span>
              <span className="inline-flex items-center gap-2">
                <MessageSquare className="h-4 w-4 text-primary" />
                Rolling 5 updates · My Pulse
              </span>
              <span className="inline-flex items-center gap-2">
                <Link2 className="h-4 w-4 text-primary" />
                Everything in sync
              </span>
            </div>
          </div>
        </div>
      </section>

      {/* Flagship Pulse Page vs My Pulse poster — same treatment as homepage. */}
      <section className="relative isolate overflow-hidden border-t border-white/5 py-20 sm:py-24">
        <WebsiteSectionBackdrop variant="deep" />
        <div className={cn(marketingGutterX, "relative")}>
          <PremiumSectionHeader
            eyebrow="Pulse Page · My Pulse"
            title="One identity, two surfaces."
            description="Pulse Page is your full identity hub — Current Vibe, Media Hub, professional profile. My Pulse is the rolling five-slot strip on top, where Thought, Clip, Link, and Pics keep your page alive."
          />
          <div className="relative mt-14 sm:mt-16">
            <SpotlightBeam tone="cyan" intensity="strong" />
            <OrbitDots tone="cyan" preset="pulse" />
            <PosterFrame
              src="/marketing/pulse-page-vs-my-pulse.png"
              alt="PulseVerse Pulse Page (full identity hub) vs My Pulse (rolling 5-slot expression feed) on iPhone."
              width={1024}
              height={576}
              glow="cyan"
              size="dramatic"
              priority
              tag={{ label: "Pulse Page · iPhone" }}
              className="mx-auto max-w-6xl"
            />
            <PosterCaptionStrip
              device="iPhone"
              context="Pulse Page · Identity hub  ·  My Pulse · Rolling 5-slot feed"
              tone="cyan"
            />
          </div>
        </div>
      </section>

      <section className={cn(marketingGutterX, "pb-16")}>
        <div className="mx-auto max-w-3xl text-center">
          <h2 className="text-2xl font-bold tracking-tight text-foreground sm:text-3xl">One profile. Many ways to share.</h2>
          <p className="mt-3 text-muted-foreground">
            Thought, Clip, Link, and Pics stay tight on My Pulse; Current Vibe sets the soundtrack; Media Hub carries your
            teaching clips, favorites, and photos — a living page, not a static bio.
          </p>
        </div>
        <div className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
          {pulsePageShareWays.map((item) => (
            <div key={item.title} className={cn("rounded-2xl p-5", marketingCardMuted)}>
              <span className="text-2xl" aria-hidden>
                {item.emoji}
              </span>
              <p className="mt-3 text-sm font-semibold text-foreground">{item.title}</p>
              <p className="mt-2 text-xs leading-relaxed text-muted-foreground">{item.body}</p>
            </div>
          ))}
        </div>
      </section>

      <section className={cn(marketingGutterX, "pb-20")}>
        <div className="mx-auto max-w-3xl text-center">
          <h2 className="text-2xl font-bold text-foreground sm:text-3xl">Media Hub — your library on Pulse Page.</h2>
          <p className="mt-3 text-muted-foreground">
            Recent Videos, Favorites, and My Photos in one compact, glanceable grid. Identity up top; polish and proof
            underneath.
          </p>
        </div>
        <div className="mt-10 grid gap-6 lg:grid-cols-3">
          {pulsePageShowcase.map((s) => (
            <div key={s.title} className={cn("flex flex-col overflow-hidden rounded-2xl", marketingCardMuted)}>
              <div className="aspect-16/10 bg-linear-to-br from-slate-800 to-slate-950">
                <div className="flex h-full items-end p-4">
                  <div>
                    <p className="text-[10px] font-semibold uppercase tracking-wider text-[var(--accent)]">{s.kicker}</p>
                    <p className="text-sm font-semibold text-foreground">{s.title}</p>
                  </div>
                </div>
              </div>
              <div className="flex flex-1 flex-col p-5">
                <Link href="/download" className={cn("mt-auto inline-flex items-center gap-1 text-sm", marketingInlineLinkStrong)}>
                  {s.cta}
                  <ArrowRight className="h-4 w-4" />
                </Link>
              </div>
            </div>
          ))}
        </div>
      </section>

      <section className={cn(marketingGutterX, "pb-16")}>
        <div className="mx-auto max-w-3xl text-center">
          <p className={marketingEyebrow}>Why professionals love Pulse Page</p>
        </div>
        <div className="mt-8 grid gap-6 sm:grid-cols-2 lg:grid-cols-5">
          {pulsePageWhyProfessionals.map((w) => (
            <div key={w.title} className="text-center">
              <div className="mx-auto flex h-10 w-10 items-center justify-center rounded-full border border-primary/30 text-primary">
                <BarChart3 className="h-4 w-4" />
              </div>
              <p className="mt-3 text-sm font-semibold text-foreground">{w.title}</p>
              <p className="mt-2 text-xs leading-relaxed text-muted-foreground">{w.body}</p>
            </div>
          ))}
        </div>
      </section>

      <section className={cn(marketingGutterX, "pb-20")}>
        <div className="mx-auto max-w-3xl text-center">
          <h2 className="text-2xl font-bold text-foreground sm:text-3xl">For experts. Creators. Leaders. Innovators.</h2>
        </div>
        <div className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
          {pulsePageAudienceSegments.map((seg) => (
            <div key={seg.title} className={cn("rounded-2xl border border-white/10 bg-white/2 p-5 text-center ring-1 ring-white/4")}>
              <UserCircle className="mx-auto h-8 w-8 text-[var(--accent)]" strokeWidth={1.25} />
              <p className="mt-4 text-sm font-semibold text-foreground">{seg.title}</p>
              <p className="mt-2 text-xs leading-relaxed text-muted-foreground">{seg.body}</p>
            </div>
          ))}
        </div>
      </section>
    </>
  );
}
