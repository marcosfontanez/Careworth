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
  PremiumSectionHeader,
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

/**
 * Creator Hub — poster-led.
 *
 * The new banner asset (`creator-hub.png`) bakes in the headline
 * "Create. Customize. Get rewarded." plus 6 feature cards (Pulse Shop,
 * Leaderboards, Exclusive Borders, Creator Rewards, Go Live). The 6-chip
 * collage we used before has been retired since the banner already
 * communicates the same message in higher fidelity.
 *
 * What stays below the banner is a slim "credibility receipts" strip —
 * one icon + short label per pillar — for the trust signals that aren't
 * baked into the banner art (license verification, native store payments,
 * scarcity, earned vs. purchased ledger separation, HIPAA-aware moderation).
 */
export function HomeCreatorHub({ locale }: { locale: Locale }) {
  const c = getHomeCreatorHubCopy(locale);

  return (
    <section className="relative isolate overflow-hidden border-t border-white/5 py-24 sm:py-28 lg:py-32">
      <WebsiteSectionBackdrop variant="deep" />
      <div className={marketingGutterX}>
        <PremiumSectionHeader eyebrow={c.eyebrow} title={c.title} description={c.description} />

        {/* Flagship banner — full-width centerpiece, dramatic gold treatment. */}
        <div className="relative mt-14 sm:mt-16">
          <SpotlightBeam tone="gold" intensity="strong" />
          <OrbitDots tone="gold" preset="creator" />
          <PosterFrame
            src="/marketing/creator-hub.png"
            alt="PulseVerse Creator Hub — Pulse Shop, leaderboards, exclusive borders, creator rewards, and Go Live."
            width={1024}
            height={576}
            glow="gold"
            sizes="(max-width: 768px) 100vw, (max-width: 1280px) 95vw, 1180px"
            size="dramatic"
            tag={{ label: c.posterTag, tone: "gold" }}
            className={cn("mx-auto max-w-6xl")}
          />
          <PosterCaptionStrip device="iPhone" context={c.posterCaption} tone="gold" />
        </div>

        {/* Credibility receipts strip — one compact line under the banner.
            Keeps "license-verified / native store payments / limited drops / earned≠purchased /
            per-creator ledger / HIPAA-aware moderation" visible without competing with the banner. */}
        <ul
          className={cn(
            "mt-12 grid gap-2.5 rounded-2xl border border-white/10 bg-[rgba(12,21,36,0.55)] p-3 ring-1 ring-white/4 backdrop-blur-md sm:p-4",
            "grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 lg:gap-2",
            "shadow-[0_24px_70px_-30px_rgba(229,184,75,0.30)]",
          )}
          aria-label="Creator Hub credibility receipts"
        >
          {c.pillars.map((p, i) => {
            const Icon = ICONS[i] ?? Sparkles;
            const accent = i === 0 || i === 2 || i === 4;
            return (
              <li
                key={p.title}
                className={cn(
                  "flex items-center gap-2.5 rounded-xl px-2.5 py-2",
                  i !== 0 && "lg:border-l lg:border-white/[0.06] lg:pl-3.5",
                )}
              >
                <span
                  className={cn(
                    "flex h-8 w-8 shrink-0 items-center justify-center rounded-lg ring-1",
                    accent
                      ? "bg-[rgba(229,184,75,0.10)] text-[#E5B84B] ring-[rgba(229,184,75,0.30)]"
                      : "bg-accent/10 text-[var(--accent)] ring-[var(--accent)]/30",
                  )}
                >
                  <Icon className="h-4 w-4" aria-hidden />
                </span>
                <span className="min-w-0 truncate text-xs font-semibold tracking-tight text-foreground sm:text-sm">
                  {p.title}
                </span>
              </li>
            );
          })}
        </ul>

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
            className="h-11 rounded-full border-white/15 bg-white/3 px-6 font-semibold hover:bg-white/7"
            asChild
          >
            <Link href="/features/live">{c.ctaSecondary}</Link>
          </Button>
        </div>
      </div>
    </section>
  );
}
