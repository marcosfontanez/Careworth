import Link from "next/link";
import { ArrowRight, Camera, Clapperboard, Link2, MessageSquare, Sparkles } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  OrbitDots,
  PosterCaptionStrip,
  PosterFrame,
  PremiumSectionHeader,
  SpotlightBeam,
  WebsiteSectionBackdrop,
} from "@/components/marketing/website-visuals";
import { marketingGutterX, marketingEyebrow, marketingCardMuted, shadowPrimaryCta } from "@/lib/ui-classes";
import { cn } from "@/lib/utils";
import { myPulseCoreIdeas, myPulseFeedSlots } from "@/mock/marketing";

const typeIcon = {
  Thought: MessageSquare,
  Clip: Clapperboard,
  Link: Link2,
  Pics: Camera,
} as const;

export function FeatureMyPulseLanding() {
  return (
    <>
      {/* Hero — copy lead, flagship poster carries the visual story below. */}
      <section className="relative isolate overflow-hidden pb-12 pt-12 sm:pb-16 sm:pt-16">
        <WebsiteSectionBackdrop variant="spotlight" />
        <div className={cn(marketingGutterX, "relative")}>
          <div className="mx-auto max-w-3xl text-center">
            <p className={marketingEyebrow}>My Pulse</p>
            <h1 className="mt-6 text-balance text-4xl font-bold leading-[1.08] tracking-tight text-foreground sm:text-5xl lg:text-[3.1rem]">
              Your latest five updates —{" "}
              <span className="bg-gradient-to-r from-[var(--accent)] to-primary bg-clip-text text-transparent">
                always fresh
              </span>
              , never a wall.
            </h1>
            <p className="mx-auto mt-6 max-w-2xl text-pretty text-lg leading-relaxed text-muted-foreground">
              My Pulse lives on your Pulse Page as a rolling strip of Thought, Clip, Link, and Pics. Only the newest five
              items stay visible; add a sixth and the oldest rolls off so your profile reads current, not cluttered.
            </p>
            <div className="mt-8 flex flex-wrap justify-center gap-3">
              <Button asChild className={cn("h-12 rounded-full px-7 font-semibold", shadowPrimaryCta, "bg-primary text-primary-foreground")}>
                <Link href="/download" className="inline-flex items-center gap-2">
                  Open My Pulse
                  <ArrowRight className="h-4 w-4" />
                </Link>
              </Button>
              <Button asChild variant="outline" className="h-12 rounded-full border-white/15 bg-white/[0.04] px-7 font-semibold">
                <Link href="/features/pulse-page">See Pulse Page</Link>
              </Button>
            </div>
            <div className="mt-8 flex flex-wrap justify-center gap-x-6 gap-y-3 text-sm text-muted-foreground">
              <span className="inline-flex items-center gap-2">
                <MessageSquare className="h-4 w-4 text-primary" />
                Thought · Clip · Link · Pics
              </span>
              <span className="inline-flex items-center gap-2">
                <Clapperboard className="h-4 w-4 text-primary" />
                Clips from PulseVerse
              </span>
              <span className="inline-flex items-center gap-2">
                <Link2 className="h-4 w-4 text-primary" />
                Links + context
              </span>
            </div>
          </div>
        </div>
      </section>

      {/* Flagship comparison poster — anchors My Pulse next to its identity hub. */}
      <section className="relative isolate overflow-hidden border-t border-white/5 py-20 sm:py-24">
        <WebsiteSectionBackdrop variant="deep" />
        <div className={cn(marketingGutterX, "relative")}>
          <PremiumSectionHeader
            eyebrow="My Pulse · in context"
            title="Where the rolling five live."
            description="My Pulse sits at the top of your Pulse Page as a rolling 5-slot expression feed — current, never cluttered."
          />
          <div className="relative mt-14 sm:mt-16">
            <SpotlightBeam tone="cyan" intensity="strong" />
            <OrbitDots tone="cyan" preset="pulse" />
            <PosterFrame
              src="/marketing/pulse-page-vs-my-pulse.png"
              alt="PulseVerse — My Pulse rolling 5-slot feed sits inside your Pulse Page identity hub on iPhone."
              width={1024}
              height={576}
              glow="cyan"
              size="dramatic"
              priority
              tag={{ label: "My Pulse · iPhone" }}
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

      {/* Live "rolls off" demo — keeps the working illustration but no longer competes with the poster. */}
      <section className={cn(marketingGutterX, "pb-16 pt-4")}>
        <div className="mx-auto max-w-3xl text-center">
          <h2 className="text-balance text-2xl font-bold tracking-tight text-foreground sm:text-3xl">
            Five items in. The sixth rolls the oldest off.
          </h2>
          <p className="mt-3 text-pretty text-muted-foreground">
            That&apos;s the whole rule. No backlog of stale posts, no infinite scroll on your own profile.
          </p>
        </div>
        <div className="mx-auto mt-10 max-w-xl space-y-3">
          <div className="rounded-xl border border-white/10 bg-white/[0.03] p-4 ring-1 ring-white/[0.04]">
            <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">On your Pulse Page · newest first</p>
          </div>
          {myPulseFeedSlots.map((slot, i) => {
            const Icon = typeIcon[slot.type];
            return (
              <div
                key={`${slot.type}-${i}`}
                className={cn(
                  "flex items-start gap-3 rounded-xl border border-white/10 bg-[rgba(12,21,36,0.75)] p-4 ring-1 ring-white/[0.04]",
                  i === 0 && "ring-1 ring-primary/25",
                )}
              >
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-primary/25 bg-primary/10 text-primary">
                  <Icon className="h-4 w-4" />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] font-bold uppercase tracking-wide text-[var(--accent)]">{slot.type}</span>
                    {i === myPulseFeedSlots.length - 1 ? (
                      <span className="rounded bg-white/10 px-1.5 py-0.5 text-[9px] font-medium text-muted-foreground">
                        rolls off next
                      </span>
                    ) : null}
                  </div>
                  <p className="mt-1 text-sm text-muted-foreground">{slot.preview}</p>
                </div>
              </div>
            );
          })}
        </div>
      </section>

      <section className={cn(marketingGutterX, "pb-20")}>
        <div className="mx-auto max-w-3xl text-center">
          <h2 className="text-2xl font-bold text-foreground sm:text-3xl">Why the five-item window exists</h2>
          <p className="mt-3 text-muted-foreground">
            My Pulse is identity-first: a quick read on what you care about now — not a private analytics dashboard or
            engagement scoreboard.
          </p>
        </div>
        <div className="mt-10 grid gap-6 md:grid-cols-3">
          {myPulseCoreIdeas.map((f) => (
            <div key={f.title} className={cn("rounded-2xl p-6", marketingCardMuted)}>
              <Sparkles className="h-8 w-8 text-primary" />
              <h3 className="mt-4 text-lg font-semibold text-foreground">{f.title}</h3>
              <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{f.body}</p>
            </div>
          ))}
        </div>
      </section>

      <section className={cn(marketingGutterX, "pb-12")}>
        <div className="rounded-3xl border border-white/10 bg-gradient-to-br from-[rgba(12,21,36,0.9)] to-primary/[0.12] p-8 sm:p-10 ring-1 ring-white/[0.06]">
          <div className="flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <h2 className="text-2xl font-bold text-foreground">Pulse Page is the stage. My Pulse is the headline.</h2>
              <p className="mt-2 max-w-xl text-sm text-muted-foreground">
                Current Vibe sets the music; Media Hub organizes your clips and photos; My Pulse keeps the story you&apos;re
                telling today in focus — all on one premium identity surface.
              </p>
            </div>
            <Button asChild size="lg" className={cn("h-12 rounded-full px-8 font-semibold", shadowPrimaryCta, "bg-primary")}>
              <Link href="/download">Get the app</Link>
            </Button>
          </div>
        </div>
      </section>
    </>
  );
}
