import Link from "next/link";
import { ArrowRight, Diamond, Sparkles } from "lucide-react";

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
import { getHomeSparksDiamondsCopy } from "@/lib/marketing-copy/home-page-sections";
import { marketingGutterX } from "@/lib/ui-classes";
import { cn } from "@/lib/utils";

/**
 * Sparks & Diamonds — economy explainer (poster-led).
 *
 * The infographic itself carries the full breakdown (what Sparks are, what
 * Diamonds are, the Send→Earn loop, Diamond tiers, KYC). Section copy is
 * intentionally minimal — eyebrow + title + one context line + two CTAs —
 * so the infographic is the lede, not buried underneath text.
 */
export function HomeSparksDiamonds({ locale }: { locale: Locale }) {
  const c = getHomeSparksDiamondsCopy(locale);

  return (
    <section
      id="sparks-and-diamonds"
      className="relative isolate overflow-hidden border-t border-white/5 py-24 sm:py-28 lg:py-32"
    >
      <WebsiteSectionBackdrop variant="spotlight" />
      <div className={marketingGutterX}>
        <PremiumSectionHeader eyebrow={c.eyebrow} title={c.title} description={c.description} />

        {/* Two-icon kicker — sets the language: pink Sparks, cyan Diamonds. */}
        <div className="mx-auto mt-8 flex max-w-md items-center justify-center gap-4 text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">
          <span className="inline-flex items-center gap-1.5 text-[#E0639A]">
            <Sparkles className="h-3.5 w-3.5" aria-hidden />
            Sparks
          </span>
          <span aria-hidden className="h-px w-6 bg-white/15" />
          <span className="inline-flex items-center gap-1.5 text-[var(--accent)]">
            <Diamond className="h-3.5 w-3.5" aria-hidden />
            Diamonds
          </span>
        </div>

        {/* Flagship infographic — full-width centerpiece, dramatic glow. */}
        <div className="relative mt-14 sm:mt-16">
          <SpotlightBeam tone="cyan" intensity="strong" />
          <OrbitDots tone="cyan" preset="hero" />
          <PosterFrame
            src="/marketing/sparks-and-diamonds.png"
            alt="PulseVerse Sparks & Diamonds — send Sparks to support people, earn Diamonds for impact, unlock tiers and exclusives."
            width={1024}
            height={682}
            glow="cyan"
            size="dramatic"
            tag={{ label: c.posterTag }}
            sizes="(max-width: 768px) 100vw, (max-width: 1280px) 95vw, 1180px"
            className={cn("mx-auto max-w-6xl")}
          />
          <PosterCaptionStrip device="In-app" context={c.posterCaption} tone="cyan" />
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
