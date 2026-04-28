import Link from "next/link";
import { ArrowRight, Radio, Shield, UserCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { site } from "@/lib/design-tokens";
import { marketingElevatedFrame, marketingGutterX, shadowPrimaryCta } from "@/lib/ui-classes";
import { cn } from "@/lib/utils";

function PulseWaveBackdrop({ className }: { className?: string }) {
  return (
    <svg
      className={cn("text-primary/40", className)}
      viewBox="0 0 600 120"
      fill="none"
      preserveAspectRatio="none"
      aria-hidden
    >
      <defs>
        <linearGradient id="pulseGrad" x1="0" y1="0" x2="600" y2="0">
          <stop stopColor="currentColor" stopOpacity="0" />
          <stop offset="0.35" stopColor="currentColor" stopOpacity="0.9" />
          <stop offset="0.65" stopColor="currentColor" stopOpacity="0.9" />
          <stop offset="1" stopColor="currentColor" stopOpacity="0" />
        </linearGradient>
      </defs>
      <path
        d="M0 60 H120 L135 25 L150 95 L165 35 L180 85 L195 45 L210 70 H600"
        stroke="url(#pulseGrad)"
        strokeWidth="2"
        vectorEffect="non-scaling-stroke"
      />
    </svg>
  );
}

export function HeroSection() {
  return (
    <section className="relative overflow-hidden pb-16 pt-10 sm:pb-24 sm:pt-14">
      <div className="pointer-events-none absolute -left-32 top-0 h-[420px] w-[420px] rounded-full bg-primary/[0.12] blur-[100px]" />
      <div className="pointer-events-none absolute -right-24 top-32 h-[360px] w-[360px] rounded-full bg-[var(--accent)]/[0.08] blur-[90px]" />
      <div className={cn("relative", marketingGutterX)}>
        <div className="grid items-center gap-12 lg:grid-cols-2 lg:gap-10">
          <div>
            <h1 className="mt-2 text-4xl font-bold leading-[1.08] tracking-tight text-foreground sm:text-5xl lg:text-[3.15rem] xl:text-6xl">
              Healthcare culture,{" "}
              <span className="bg-gradient-to-r from-primary via-[#4d9fff] to-[var(--accent)] bg-clip-text text-transparent">
                all in one place.
              </span>
            </h1>
            <p className="mt-6 max-w-xl text-lg leading-relaxed text-muted-foreground">
              The social platform for the global healthcare community — feed, Circles, Live, and Pulse Page. Built for
              professionals who want real connection, not another stiff directory.
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Button
                size="lg"
                className={cn(
                  "h-12 rounded-full px-8 text-base font-semibold",
                  "bg-primary text-primary-foreground hover:bg-primary/90",
                  shadowPrimaryCta,
                )}
                asChild
              >
                <Link href="/download" className="inline-flex items-center gap-2">
                  Join PulseVerse
                  <ArrowRight className="h-5 w-5" aria-hidden />
                </Link>
              </Button>
              <Button
                size="lg"
                variant="outline"
                className="h-12 rounded-full border-[rgba(148,163,184,0.25)] bg-transparent px-7 text-base font-semibold hover:bg-white/[0.04]"
                asChild
              >
                <Link href="/features/pulse-page" className="inline-flex items-center gap-2">
                  <UserCircle className="h-5 w-5 text-primary" aria-hidden />
                  Explore Pulse Page
                </Link>
              </Button>
            </div>
            <ul className="mt-10 flex flex-wrap gap-x-8 gap-y-3 text-sm text-muted-foreground">
              <li className="flex items-center gap-2">
                <Shield className="h-4 w-4 shrink-0 text-primary" aria-hidden />
                <span className="font-medium text-foreground/90">Safe &amp; verified</span>
              </li>
              <li className="flex items-center gap-2">
                <UserCircle className="h-4 w-4 shrink-0 text-primary" aria-hidden />
                <span className="font-medium text-foreground/90">Real connections</span>
              </li>
              <li className="flex items-center gap-2">
                <Radio className="h-4 w-4 shrink-0 text-primary" aria-hidden />
                <span className="font-medium text-foreground/90">Live &amp; on-demand</span>
              </li>
            </ul>
            <p className="mt-8 text-sm text-muted-foreground">
              {site.name} — where clinicians, students, and teams build culture that lasts.
            </p>
          </div>

          <div className="relative mx-auto w-full max-w-[540px] lg:mx-0 lg:max-w-none">
            <PulseWaveBackdrop className="absolute -left-4 -right-4 top-1/3 z-0 h-16 w-[calc(100%+2rem)] -translate-y-1/2 sm:h-20" />
            <div className={cn("relative z-10 p-5 sm:p-6", marketingElevatedFrame)}>
              <div className="relative mx-auto flex min-h-[320px] items-center justify-center sm:min-h-[380px]">
                {/* Phone */}
                <div
                  className="absolute left-0 top-8 z-20 w-[38%] max-w-[150px] -rotate-6 rounded-[1.75rem] border border-[rgba(148,163,184,0.2)] bg-[#070d16] p-2 shadow-2xl shadow-black/60 sm:left-2 sm:top-10"
                  aria-hidden
                >
                  <div className="aspect-[9/18] overflow-hidden rounded-xl bg-gradient-to-b from-[#0f1828] to-background">
                    <div className="flex gap-1 border-b border-white/5 p-2">
                      <span className="h-6 w-6 rounded-full bg-primary/30" />
                      <div className="flex-1 space-y-1 pt-0.5">
                        <div className="h-2 w-3/4 rounded bg-white/10" />
                        <div className="h-1.5 w-1/2 rounded bg-white/5" />
                      </div>
                    </div>
                    <div className="space-y-2 p-2">
                      <div className="h-20 rounded-lg bg-primary/15" />
                      <div className="h-2 rounded bg-white/10" />
                      <div className="h-2 w-5/6 rounded bg-white/5" />
                    </div>
                  </div>
                </div>
                {/* Laptop */}
                <div
                  className="relative z-10 ml-[18%] mt-4 w-[78%] rounded-xl border border-[rgba(148,163,184,0.2)] bg-[#0a101c] p-1.5 shadow-2xl shadow-black/50 sm:ml-[14%]"
                  aria-hidden
                >
                  <div className="flex items-center gap-1.5 border-b border-white/5 px-2 py-1.5">
                    <span className="h-2 w-2 rounded-full bg-red-400/80" />
                    <span className="h-2 w-2 rounded-full bg-amber-400/80" />
                    <span className="h-2 w-2 rounded-full bg-emerald-400/80" />
                  </div>
                  <div className="aspect-[16/10] rounded-lg bg-gradient-to-br from-[#0f1828] via-[#0a0f18] to-background p-4">
                    <div className="flex gap-3">
                      <div className="h-14 w-14 shrink-0 rounded-full bg-gradient-to-br from-primary/40 to-[var(--accent)]/30 ring-2 ring-primary/30" />
                      <div className="flex-1 space-y-2 pt-1">
                        <div className="h-2.5 w-1/3 rounded bg-white/15" />
                        <div className="h-2 w-full rounded bg-white/5" />
                        <div className="h-2 w-4/5 rounded bg-white/5" />
                      </div>
                    </div>
                    <div className="mt-4 grid grid-cols-3 gap-2">
                      <div className="h-16 rounded-lg bg-white/[0.04]" />
                      <div className="h-16 rounded-lg bg-primary/20" />
                      <div className="h-16 rounded-lg bg-white/[0.04]" />
                    </div>
                  </div>
                </div>
              </div>
              <p className="mt-4 text-center text-xs text-muted-foreground">
                Product frames · swap for marketing captures anytime
              </p>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
