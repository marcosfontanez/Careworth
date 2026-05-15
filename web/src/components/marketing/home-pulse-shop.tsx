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
 * Pulse Shop spotlight (NEW homepage section).
 *
 * Pulse Shop was previously only mentioned inside Creator Hub and Borders
 * sections. With the two new marketing renders we can give it its own
 * moment between Creator Hub and Sparks & Diamonds.
 *
 * Layout — paired posters:
 *   • LEFT  · cinematic featured-drop banner (Featured Border + trust chips)
 *   • RIGHT · the actual Pulse Shop mobile UI (tabs, Featured, Browse grid)
 *
 * Both posters are tall portrait-oriented (~580×1024) so they get matched
 * heights via the grid. CTAs route to `/features` (the shop only opens
 * in-app) and to the Sparks & Diamonds anchor for users who clicked
 * here without knowing what Sparks are yet.
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

        {/* Paired posters — banner left, real shop UI right.
            Each gets its own beam + orbit, but they share the same vertical
            rhythm so they read as a single moment. */}
        <div className="mt-14 grid gap-12 lg:mt-20 lg:grid-cols-2 lg:gap-14">
          <div className="relative">
            <SpotlightBeam tone="cyan" intensity="strong" />
            <OrbitDots tone="cyan" preset="hero" />
            <PosterFrame
              src="/marketing/shop-banner-hero.png"
              alt="Pulse Shop — premium borders, exclusive rewards, creator support that powers the Verse."
              width={580}
              height={1024}
              glow="cyan"
              sizes="(max-width: 1024px) 100vw, 560px"
              size="dramatic"
              tag={{ label: c.bannerTag }}
              className={cn("mx-auto max-w-md")}
            />
            <PosterCaptionStrip device="In-app" context={c.bannerCaption} tone="cyan" />
          </div>

          <div className="relative">
            <SpotlightBeam tone="blue" intensity="strong" />
            <OrbitDots tone="blue" preset="circles" />
            <PosterFrame
              src="/marketing/shop-mobile-frame.png"
              alt="Pulse Shop mobile UI — Borders / Sparks / Gifts tabs with Featured Border and Browse Borders grid."
              width={580}
              height={1024}
              glow="blue"
              sizes="(max-width: 1024px) 100vw, 560px"
              size="dramatic"
              tag={{ label: c.mobileTag }}
              className={cn("mx-auto max-w-md")}
            />
            <PosterCaptionStrip device="iPhone" context={c.mobileCaption} tone="blue" />
          </div>
        </div>

        {/* CTAs — primary routes to /features (shop only opens in-app);
            secondary anchors to the Sparks & Diamonds explainer below. */}
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
            <Link href="#sparks-and-diamonds">{c.ctaSecondary}</Link>
          </Button>
        </div>
      </div>
    </section>
  );
}
