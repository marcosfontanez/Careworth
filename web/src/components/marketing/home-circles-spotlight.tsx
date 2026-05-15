import Link from "next/link";
import { ArrowRight } from "lucide-react";

import {
  OrbitDots,
  PosterCaptionStrip,
  PosterFrame,
  SpotlightBeam,
  WebsiteSectionBackdrop,
} from "@/components/marketing/website-visuals";
import { Button } from "@/components/ui/button";
import type { Locale } from "@/lib/i18n";
import { getHomeCirclesSpotlightCopy } from "@/lib/marketing-copy/home-page-sections";
import { marketingGutterX } from "@/lib/ui-classes";

/**
 * Circles spotlight — poster-led.
 *
 * The Circles poster already carries the four explainer bullets (Discover /
 * Popular Circles / Trending Topics / Real Connections) along the bottom.
 * Section copy is intentionally limited to eyebrow + title + one context line
 * + two CTAs so the poster stays the centerpiece.
 */
export function HomeCirclesSpotlight({ locale }: { locale: Locale }) {
  const c = getHomeCirclesSpotlightCopy(locale);

  return (
    <section className="relative isolate overflow-hidden border-t border-white/5 py-24 sm:py-28 lg:py-32">
      <WebsiteSectionBackdrop variant="deep" />
      <div className={marketingGutterX}>
        {/* Image-led split — image gets meaningfully more weight than copy on lg+. */}
        <div className="grid items-center gap-12 lg:grid-cols-[minmax(0,0.7fr)_minmax(0,1.3fr)] lg:gap-16">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.22em] text-primary/90">
              {c.eyebrow}
            </p>
            {/* Image already carries the giant "Circles" wordmark — H2 is sr-only for SEO so we don't double up visually. */}
            <h2 className="sr-only">{c.title}</h2>
            <p className="mt-4 text-pretty text-base leading-relaxed text-muted-foreground sm:text-lg">
              {c.description}
            </p>

            <div className="mt-8 flex flex-wrap gap-3">
              <Button
                size="lg"
                className="h-11 rounded-full bg-primary px-6 font-semibold text-primary-foreground hover:bg-primary/90"
                asChild
              >
                <Link href="/features/circles" className="inline-flex items-center gap-2">
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
                <Link href="/features">{c.ctaSecondary}</Link>
              </Button>
            </div>
          </div>

          <div className="relative lg:-mr-6 xl:-mr-12">
            <SpotlightBeam tone="blue" intensity="strong" />
            <OrbitDots tone="blue" preset="circles" />
            <PosterFrame
              src="/marketing/hero-circles.png"
              alt="PulseVerse Circles — discover popular circles, your circles, and trending topics"
              width={1024}
              height={576}
              glow="blue"
              sizes="(max-width: 1024px) 100vw, 760px"
              size="dramatic"
              tag={{ label: c.posterTag }}
            />
            <PosterCaptionStrip device="iPhone" context={c.posterCaption} tone="blue" />
          </div>
        </div>
      </div>
    </section>
  );
}
