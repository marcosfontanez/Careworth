import Link from "next/link";
import { ArrowRight, Camera, Clapperboard, Link2, MessageSquare, Sparkles } from "lucide-react";

import { Button } from "@/components/ui/button";
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
      <section className="relative overflow-hidden pb-16 pt-10 sm:pb-24 sm:pt-14">
        <div className="pointer-events-none absolute right-0 top-0 h-96 w-96 rounded-full bg-emerald-500/10 blur-[100px]" />
        <div className="pointer-events-none absolute -left-20 bottom-0 h-72 w-72 rounded-full bg-primary/10 blur-[80px]" />
        <div className={cn(marketingGutterX, "relative grid items-center gap-14 lg:grid-cols-2")}>
          <div>
            <p className={marketingEyebrow}>My Pulse</p>
            <h1 className="mt-5 text-4xl font-bold leading-[1.08] tracking-tight text-foreground sm:text-5xl lg:text-[3.1rem]">
              Your latest five updates —{" "}
              <span className="bg-gradient-to-r from-[var(--accent)] to-primary bg-clip-text text-transparent">
                always fresh
              </span>
              , never a wall.
            </h1>
            <p className="mt-6 max-w-xl text-lg leading-relaxed text-muted-foreground">
              My Pulse lives on your Pulse Page as a rolling strip of Thought, Clip, Link, and Pics. Only the newest five
              items stay visible; add a sixth and the oldest rolls off so your profile reads current, not cluttered.
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
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
            <div className="mt-10 flex flex-wrap gap-6 text-sm text-muted-foreground">
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
          <div className="space-y-3">
            <div className="rounded-xl border border-white/10 bg-white/[0.03] p-4 ring-1 ring-white/[0.04]">
              <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">On your Pulse Page · newest first</p>
              <p className="mt-1 text-[10px] text-muted-foreground">Illustrative content · not a live account</p>
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
