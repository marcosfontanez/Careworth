import Link from "next/link";
import { ArrowRight, BarChart3, Link2, MessageSquare, Sparkles, UserCircle } from "lucide-react";

import { Button } from "@/components/ui/button";
import { marketingGutterX, marketingEyebrow, marketingCardMuted, shadowPrimaryCta } from "@/lib/ui-classes";
import { cn } from "@/lib/utils";
import {
  pulsePageAudienceSegments,
  pulsePageShareWays,
  pulsePageShowcase,
  pulsePageWhyProfessionals,
} from "@/mock/marketing";

function DeviceCluster() {
  return (
    <div className="relative mx-auto max-w-lg">
      <div className="pointer-events-none absolute -inset-6 rounded-3xl bg-gradient-to-tr from-primary/20 via-transparent to-[var(--accent)]/15 blur-2xl" />
      <div className="relative grid gap-4 sm:grid-cols-2">
        <div
          className={cn(
            "rounded-2xl border border-white/10 bg-[rgba(12,21,36,0.9)] p-4 shadow-xl backdrop-blur-md",
            "sm:translate-y-8 sm:scale-95",
          )}
        >
          <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Phone · Pulse</p>
          <div className="mt-3 flex items-center gap-3">
            <div className="h-11 w-11 rounded-full bg-gradient-to-br from-primary to-[#0066ff]" />
            <div>
              <p className="text-sm font-semibold text-foreground">Dr. Sara Khan</p>
              <p className="text-xs text-muted-foreground">1.2K followers · verified</p>
            </div>
          </div>
        </div>
        <div className="rounded-2xl border border-white/10 bg-[rgba(12,21,36,0.85)] p-5 shadow-xl ring-1 ring-primary/15 backdrop-blur-md">
          <p className="text-[10px] font-semibold uppercase tracking-wider text-[var(--accent)]">Laptop · edit</p>
          <div className="mt-3 space-y-2">
            <div className="h-2 w-3/4 rounded bg-white/10" />
            <div className="h-2 w-1/2 rounded bg-white/10" />
            <div className="mt-4 flex gap-2">
              <span className="rounded-lg bg-primary/20 px-2 py-1 text-[10px] font-medium text-primary">Edit profile</span>
              <span className="rounded-lg border border-white/15 px-2 py-1 text-[10px] text-muted-foreground">View page</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export function FeaturePulsePageLanding() {
  return (
    <>
      <section className="relative overflow-hidden pb-16 pt-8 sm:pb-24 sm:pt-12">
        <div className="pointer-events-none absolute -left-24 top-10 h-80 w-80 rounded-full bg-primary/12 blur-[90px]" />
        <div className="pointer-events-none absolute -right-16 bottom-0 h-72 w-72 rounded-full bg-[var(--accent)]/10 blur-[80px]" />
        <div className={cn(marketingGutterX, "relative grid items-center gap-14 lg:grid-cols-2")}>
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-primary">
              Pulse Page / <span className="text-[var(--accent)]">My Pulse</span>
            </p>
            <h1 className="mt-5 text-4xl font-bold leading-[1.08] tracking-tight text-foreground sm:text-5xl lg:text-[3.25rem]">
              Build your{" "}
              <span className="bg-gradient-to-r from-foreground to-foreground bg-clip-text">professional home</span> on{" "}
              <span className="bg-gradient-to-r from-[var(--accent)] to-primary bg-clip-text text-transparent">CareWorth.</span>
            </h1>
            <p className="mt-6 max-w-xl text-lg leading-relaxed text-muted-foreground">
              Premium profile, rolling five-post feed, pins, media hub, and everything that syncs with how you actually
              show up in medicine.
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Button asChild className={cn("h-12 rounded-full px-7 font-semibold", shadowPrimaryCta, "bg-primary text-primary-foreground")}>
                <Link href="/download" className="inline-flex items-center gap-2">
                  Create your Pulse Page
                  <ArrowRight className="h-4 w-4" />
                </Link>
              </Button>
              <Button asChild variant="outline" className="h-12 rounded-full border-white/15 bg-white/[0.04] px-7 font-semibold">
                <Link href="/features" className="inline-flex items-center gap-2">
                  <UserCircle className="h-4 w-4" />
                  Explore CareWorth
                </Link>
              </Button>
            </div>
            <div className="mt-10 flex flex-wrap gap-6 text-sm text-muted-foreground">
              <span className="inline-flex items-center gap-2">
                <Sparkles className="h-4 w-4 text-primary" />
                Premium professional profile
              </span>
              <span className="inline-flex items-center gap-2">
                <MessageSquare className="h-4 w-4 text-primary" />
                Rolling 5-post feed
              </span>
              <span className="inline-flex items-center gap-2">
                <Link2 className="h-4 w-4 text-primary" />
                Everything in sync
              </span>
            </div>
          </div>
          <DeviceCluster />
        </div>
      </section>

      <section className={cn(marketingGutterX, "pb-16")}>
        <div className="mx-auto max-w-3xl text-center">
          <h2 className="text-2xl font-bold tracking-tight text-foreground sm:text-3xl">One profile. Many ways to share.</h2>
          <p className="mt-3 text-muted-foreground">Surface your credibility without stiff templates — mix formats the way clinicians already consume culture.</p>
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
          <h2 className="text-2xl font-bold text-foreground sm:text-3xl">Highlight your work, your way.</h2>
          <p className="mt-3 text-muted-foreground">Videos, reading lists, and photography — with credentialed context.</p>
        </div>
        <div className="mt-10 grid gap-6 lg:grid-cols-3">
          {pulsePageShowcase.map((s) => (
            <div key={s.title} className={cn("flex flex-col overflow-hidden rounded-2xl", marketingCardMuted)}>
              <div className="aspect-[16/10] bg-gradient-to-br from-slate-800 to-slate-950">
                <div className="flex h-full items-end p-4">
                  <div>
                    <p className="text-[10px] font-semibold uppercase tracking-wider text-[var(--accent)]">{s.kicker}</p>
                    <p className="text-sm font-semibold text-foreground">{s.title}</p>
                  </div>
                </div>
              </div>
              <div className="flex flex-1 flex-col p-5">
                <Link href="/download" className="mt-auto inline-flex items-center gap-1 text-sm font-semibold text-primary hover:underline">
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
            <div key={seg.title} className={cn("rounded-2xl border border-white/10 bg-white/[0.02] p-5 text-center ring-1 ring-white/[0.04]")}>
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
