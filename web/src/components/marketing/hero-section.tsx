import { Sparkles } from "lucide-react";

import { MarketingPrimaryCta, MarketingSecondaryLink } from "@/components/marketing/marketing-cta";
import {
  OrbitDots,
  PosterCaptionStrip,
  PosterFrame,
  SpotlightBeam,
  WebsiteSectionBackdrop,
} from "@/components/marketing/website-visuals";
import { getHomeHeroCopy } from "@/lib/marketing-copy/home";
import { marketingGutterX } from "@/lib/ui-classes";
import type { Locale } from "@/lib/i18n";
import { cn } from "@/lib/utils";

export function HeroSection({ locale }: { locale: Locale }) {
  const t = getHomeHeroCopy(locale);
  return (
    <section className="relative isolate overflow-hidden pt-12 pb-16 sm:pt-16 sm:pb-20 lg:pb-24">
      <WebsiteSectionBackdrop variant="deep" animated />
      <div
        aria-hidden
        className="pointer-events-none absolute -left-24 top-12 -z-10 h-[420px] w-[420px] rounded-full bg-primary/10 blur-[110px]"
      />
      <div
        aria-hidden
        className="pointer-events-none absolute -right-32 top-44 -z-10 h-[360px] w-[360px] rounded-full bg-(--accent)/10 blur-[110px]"
      />

      <div className={cn("relative", marketingGutterX)}>
        {/*
         * Poster-led hero. The poster carries the headline, subhead, brand mark,
         * and trust strip — the surrounding copy is intentionally minimal so the
         * hero asset gets to be the star.
         */}
        <div className="grid items-center gap-12 lg:grid-cols-[minmax(0,0.7fr)_minmax(0,1.3fr)] lg:gap-16">
          <div className="relative z-10">
            <span className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/4 px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em] text-(--accent)/90">
              <Sparkles className="h-3.5 w-3.5" aria-hidden />
              {t.eyebrow}
            </span>
            {/* Visible H1 — mirrors the headline baked into the hero image for SEO + screen readers
                (Google won't reliably read text-as-pixels). Kept compact so the poster stays the lede. */}
            <h1 className="pv-gradient-text mt-4 max-w-md text-balance font-heading text-3xl font-bold leading-[1.05] tracking-tight sm:text-4xl lg:text-[2.6rem]">
              {t.headline}
            </h1>
            <p className="mt-5 max-w-md text-pretty text-base leading-relaxed text-muted-foreground sm:text-lg">
              {t.subhead}
            </p>
            <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:flex-wrap">
              <MarketingPrimaryCta href="/download" analyticsSource="hero_primary">
                {t.primaryCta}
              </MarketingPrimaryCta>
              <MarketingSecondaryLink href="/web-app" prefetch={false}>
                {t.secondaryCta}
              </MarketingSecondaryLink>
            </div>
          </div>

          <div className="relative lg:-mr-6 xl:-mr-12">
            <SpotlightBeam tone="cyan" intensity="strong" />
            <OrbitDots tone="cyan" preset="hero" />
            <PosterFrame
              src="/marketing/hero-healthcare-home.png"
              alt="PulseVerse — Healthcare culture has a home. Login, profile, Circles, and Creator Hub on iPhone."
              width={1024}
              height={576}
              priority
              glow="cyan"
              sizes="(max-width: 1024px) 100vw, 760px"
              size="dramatic"
              tag={{ label: t.posterTag }}
              className="pv-float lg:translate-y-2"
            />
            <PosterCaptionStrip device="iPhone" context={t.posterCaption} tone="cyan" />
          </div>
        </div>
      </div>
    </section>
  );
}
