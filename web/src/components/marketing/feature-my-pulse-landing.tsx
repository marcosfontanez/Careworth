import Link from "next/link";
import { Activity, ArrowRight, Bookmark, LineChart, Lock, Users } from "lucide-react";

import { Button } from "@/components/ui/button";
import { marketingGutterX, marketingEyebrow, marketingCardMuted, shadowPrimaryCta } from "@/lib/ui-classes";
import { cn } from "@/lib/utils";
import { myPulseHighlights, myPulsePrivateFeatures } from "@/mock/marketing";

function ProfileViewsSpark() {
  const pts = [40, 52, 48, 61, 58, 72, 68, 85];
  return (
    <div className="rounded-xl border border-white/10 bg-white/[0.03] p-4 ring-1 ring-white/[0.04]">
      <div className="flex items-center justify-between">
        <p className="text-xs font-semibold text-muted-foreground">Profile views</p>
        <span className="text-xs font-semibold text-emerald-400">+18%</span>
      </div>
      <div className="mt-3 flex h-16 items-end gap-1">
        {pts.map((h, i) => (
          <div
            key={i}
            className="flex-1 rounded-t-sm bg-gradient-to-t from-primary/60 to-[var(--accent)]/50"
            style={{ height: `${h}%` }}
          />
        ))}
      </div>
      <p className="mt-2 text-[10px] text-muted-foreground">Illustrative trend · not live account data</p>
    </div>
  );
}

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
              Your{" "}
              <span className="bg-gradient-to-r from-[var(--accent)] to-primary bg-clip-text text-transparent">private rhythm</span>{" "}
              between shifts.
            </h1>
            <p className="mt-6 max-w-xl text-lg leading-relaxed text-muted-foreground">
              Saves, activity, and connections — organized for recall without turning into a second inbox. Built for
              healthcare professionals who live in notifications all day.
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Button asChild className={cn("h-12 rounded-full px-7 font-semibold", shadowPrimaryCta, "bg-primary text-primary-foreground")}>
                <Link href="/download" className="inline-flex items-center gap-2">
                  Open My Pulse
                  <ArrowRight className="h-4 w-4" />
                </Link>
              </Button>
              <Button asChild variant="outline" className="h-12 rounded-full border-white/15 bg-white/[0.04] px-7 font-semibold">
                <Link href="/features/pulse-page">Compare · Pulse Page</Link>
              </Button>
            </div>
            <div className="mt-10 flex flex-wrap gap-6 text-sm text-muted-foreground">
              <span className="inline-flex items-center gap-2">
                <Bookmark className="h-4 w-4 text-primary" />
                Saves &amp; collections
              </span>
              <span className="inline-flex items-center gap-2">
                <Lock className="h-4 w-4 text-primary" />
                Privacy you control
              </span>
              <span className="inline-flex items-center gap-2">
                <Activity className="h-4 w-4 text-primary" />
                Calm activity ledger
              </span>
            </div>
          </div>
          <div className="space-y-4">
            <ProfileViewsSpark />
            <div className="grid grid-cols-2 gap-3">
              {myPulseHighlights.map((h) => (
                <div key={h.label} className={cn("rounded-xl border border-white/10 bg-white/[0.03] p-4", marketingCardMuted)}>
                  <p className="text-[10px] font-medium uppercase tracking-wide text-muted-foreground">{h.label}</p>
                  <p className="mt-2 text-xl font-bold tabular-nums text-foreground">{h.value}</p>
                  <p className="text-[10px] text-muted-foreground">{h.sub}</p>
                </div>
              ))}
            </div>
            <div className="rounded-xl border border-white/10 bg-[rgba(12,21,36,0.75)] p-4 ring-1 ring-primary/15">
              <div className="flex items-center gap-2 text-xs font-semibold text-[var(--accent)]">
                <LineChart className="h-4 w-4" />
                Engagement trend
              </div>
              <p className="mt-2 text-sm text-muted-foreground">
                Rolling summaries for reactions, revisits, and Live time — tuned for quick scans before rounds.
              </p>
            </div>
          </div>
        </div>
      </section>

      <section className={cn(marketingGutterX, "pb-20")}>
        <div className="mx-auto max-w-3xl text-center">
          <h2 className="text-2xl font-bold text-foreground sm:text-3xl">Infrastructure that respects your attention.</h2>
          <p className="mt-3 text-muted-foreground">My Pulse keeps the signal close — without pretending every ping is urgent.</p>
        </div>
        <div className="mt-10 grid gap-6 md:grid-cols-3">
          {myPulsePrivateFeatures.map((f) => (
            <div key={f.title} className={cn("rounded-2xl p-6", marketingCardMuted)}>
              <Users className="h-8 w-8 text-primary" />
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
              <h2 className="text-2xl font-bold text-foreground">Pulse Page is public. My Pulse is yours.</h2>
              <p className="mt-2 max-w-xl text-sm text-muted-foreground">
                Use Pulse Page for how the world sees you — and My Pulse for how you stay grounded between shifts.
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
