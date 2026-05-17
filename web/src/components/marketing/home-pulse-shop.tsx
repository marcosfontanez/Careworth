import Link from "next/link";
import { ArrowRight } from "lucide-react";

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
import { getHomePulseShopCopy } from "@/lib/marketing-copy/home-page-sections";
import { marketingGutterX } from "@/lib/ui-classes";
import { cn } from "@/lib/utils";

/**
 * Pulse Shop spotlight — one flagship mobile render.
 *
 * We previously showed two posters side-by-side; both marketing assets reused
 * the same Featured Border / Emerald Renewal hero, so the pair read as
 * duplicate UI. A single tall phone frame reads cleaner and still shows
 * tabs, balances, featured drop, and the browse grid.
 */
export function HomePulseShop({ locale }: { locale: Locale }) {
  const c = getHomePulseShopCopy(locale);

  return (
    <section
      id="pulse-shop"
      className="relative isolate overflow-hidden border-t border-white/5 py-24 sm:py-28 lg:py-32"
    >
      <WebsiteSectionBackdrop variant="spotlight" />
      <div className={marketingGutterX}>
        <PremiumSectionHeader eyebrow={c.eyebrow} title={c.title} description={c.description} />

        <div className="relative mt-14 sm:mt-16">
          <SpotlightBeam tone="cyan" intensity="strong" />
          <OrbitDots tone="cyan" preset="hero" />
          <PosterFrame
            src="/marketing/shop-mobile-frame.png"
            alt="Pulse Shop — Borders, Sparks, and Gifts with featured monthly border and browse grid."
            width={580}
            height={1024}
            glow="cyan"
            sizes="(max-width: 1024px) 100vw, 560px"
            size="dramatic"
            tag={{ label: c.posterTag }}
            className={cn("mx-auto max-w-md")}
          />
          <PosterCaptionStrip device="iPhone" context={c.posterCaption} tone="cyan" />
        </div>

        <div className="mt-12 flex flex-wrap justify-center gap-3">
          <Button
            size="lg"
            className="h-11 rounded-full bg-primary px-6 font-semibold text-primary-foreground hover:bg-primary/90"
            asChild
          >
            <Link href="/features#creator-economy" className="inline-flex items-center gap-2">
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
            <Link href="/#sparks-and-diamonds">{c.ctaSecondary}</Link>
          </Button>
        </div>
      </div>
    </section>
  );
}
