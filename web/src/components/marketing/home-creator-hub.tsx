import Link from "next/link";
import {
  ArrowRight,
  BadgeCheck,
  BookOpen,
  Coins,
  Hourglass,
  ShieldCheck,
  Smartphone,
  Sparkles,
} from "lucide-react";

import {
  OrbitDots,
  PosterCaptionStrip,
  PosterFrame,
  SpotlightBeam,
  WebsiteSectionBackdrop,
} from "@/components/marketing/website-visuals";
import { Button } from "@/components/ui/button";
import type { Locale } from "@/lib/i18n";
import { getHomeCreatorHubCopy } from "@/lib/marketing-copy/home-page-sections";
import { marketingGutterX } from "@/lib/ui-classes";
import { cn } from "@/lib/utils";

/**
 * Icons map 1:1 to the credibility chips in
 * `home-page-sections.ts → creatorHub.pillars`. Order matters:
 *   0 License-verified · 1 Native store payments · 2 Limited drops
 *   3 Earned ≠ purchased · 4 Per-creator ledger · 5 HIPAA-aware moderation
 */
const ICONS = [BadgeCheck, Smartphone, Hourglass, Coins, BookOpen, ShieldCheck] as const;

export function HomeCreatorHub({ locale }: { locale: Locale }) {
  const c = getHomeCreatorHubCopy(locale);

  return (
    <section className="relative isolate overflow-hidden border-t border-white/5 py-24 sm:py-28 lg:py-32">
      <WebsiteSectionBackdrop variant="deep" />
      <div className={marketingGutterX}>
        {/* Eyebrow + headline + description (centered, premium). */}
        <div className="mx-auto max-w-3xl text-center">
          <p className="text-xs font-semibold uppercase tracking-[0.22em] text-[#E5B84B]/90">{c.eyebrow}</p>
          <h2 className="mt-3 text-balance font-heading text-3xl font-bold tracking-tight text-foreground sm:text-4xl lg:text-[2.65rem] lg:leading-[1.08]">
            {c.title}
          </h2>
          <p className="mt-4 text-pretty text-base leading-relaxed text-muted-foreground sm:text-lg">
            {c.description}
          </p>
        </div>

        {/* Collage: phone in center, six pillar chips floating around it. */}
        <div className="mt-14 lg:mt-20">
          <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.3fr)_minmax(0,1fr)] lg:gap-8">
            {/* Left column — three chips. License-verified + Limited drops are gold for emphasis. */}
            <ul className="space-y-4 self-center lg:space-y-5">
              {c.pillars.slice(0, 3).map((p, i) => {
                const Icon = ICONS[i] ?? Sparkles;
                const accentGold = i === 0 || i === 2;
                return (
                  <li key={p.title}>
                    <CollageChip icon={Icon} title={p.title} body={p.body} gold={accentGold} align="left" />
                  </li>
                );
              })}
            </ul>

            {/* Center — the Creator Hub render. Flagship gold treatment. */}
            <div className="relative order-first lg:order-none">
              <SpotlightBeam tone="gold" intensity="strong" />
              <OrbitDots tone="gold" preset="creator" />
              <PosterFrame
                src="/marketing/creator-hub.png"
                alt="PulseVerse Creator Hub — Pulse Shop, leaderboards, exclusive borders, creator rewards, and Go Live."
                width={1024}
                height={576}
                glow="gold"
                sizes="(max-width: 1024px) 100vw, 640px"
                size="dramatic"
                tag={{ label: c.posterTag, tone: "gold" }}
              />
              <PosterCaptionStrip device="iPhone" context={c.posterCaption} tone="gold" />
            </div>

            {/* Right column — three chips. Per-creator ledger is gold for emphasis. */}
            <ul className="space-y-4 self-center lg:space-y-5">
              {c.pillars.slice(3, 6).map((p, i) => {
                const Icon = ICONS[i + 3] ?? Sparkles;
                const accentGold = i === 1;
                return (
                  <li key={p.title}>
                    <CollageChip icon={Icon} title={p.title} body={p.body} gold={accentGold} align="right" />
                  </li>
                );
              })}
            </ul>
          </div>
        </div>

        {/* CTAs */}
        <div className="mt-12 flex flex-wrap justify-center gap-3">
          <Button
            size="lg"
            className="h-11 rounded-full bg-primary px-6 font-semibold text-primary-foreground hover:bg-primary/90"
            asChild
          >
            <Link href="/features" className="inline-flex items-center gap-2">
              {c.ctaPrimary}
              <ArrowRight className="h-4 w-4" aria-hidden />
            </Link>
          </Button>
          <Button
            size="lg"
            variant="outline"
            className="h-11 rounded-full border-white/15 bg-white/[0.03] px-6 font-semibold hover:bg-white/[0.07]"
            asChild
          >
            <Link href="/features/live">{c.ctaSecondary}</Link>
          </Button>
        </div>
      </div>
    </section>
  );
}

function CollageChip({
  icon: Icon,
  title,
  body,
  gold,
  align,
}: {
  icon: React.ComponentType<{ className?: string; "aria-hidden"?: boolean }>;
  title: string;
  body: string;
  gold?: boolean;
  align: "left" | "right";
}) {
  return (
    <div
      className={cn(
        "group relative overflow-hidden rounded-2xl border border-white/10 bg-[rgba(12,21,36,0.65)] p-4 ring-1 ring-white/[0.04] backdrop-blur-md transition duration-200",
        gold
          ? "hover:border-[#E5B84B]/40 hover:shadow-[0_24px_60px_-26px_rgba(229,184,75,0.45)]"
          : "hover:border-[var(--accent)]/40 hover:shadow-[0_24px_60px_-26px_rgba(20,184,166,0.45)]",
      )}
    >
      <div
        aria-hidden
        className={cn(
          "pointer-events-none absolute -top-12 h-32 w-32 rounded-full opacity-50 blur-2xl",
          align === "left" ? "-right-10" : "-left-10",
          gold ? "bg-[rgba(229,184,75,0.20)]" : "bg-[var(--accent)]/15",
        )}
      />
      <div className={cn("relative flex items-start gap-3", align === "right" && "lg:flex-row-reverse lg:text-right")}>
        <span
          className={cn(
            "flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ring-1",
            gold
              ? "bg-[rgba(229,184,75,0.10)] text-[#E5B84B] ring-[rgba(229,184,75,0.35)]"
              : "bg-[var(--accent)]/10 text-[var(--accent)] ring-[var(--accent)]/30",
          )}
        >
          <Icon className="h-5 w-5" aria-hidden />
        </span>
        <div className="min-w-0">
          <p className="text-sm font-semibold leading-tight text-foreground">{title}</p>
          <p className="mt-1 text-xs leading-relaxed text-muted-foreground">{body}</p>
        </div>
      </div>
    </div>
  );
}
