import Link from "next/link";
import { ArrowRight, Sparkles } from "lucide-react";

import { LandingImage } from "@/components/marketing/landing-image";
import { MarketingPrimaryCta, MarketingSecondaryLink } from "@/components/marketing/marketing-cta";
import { MarketingLogo } from "@/components/marketing/marketing-logo";
import { WebsiteSectionBackdrop } from "@/components/marketing/website-visuals";
import type { Locale } from "@/lib/i18n";
import { getHomeLandingCopy } from "@/lib/marketing-copy/home-landing";
import { LANDING } from "@/lib/marketing-landing-assets";
import { marketingFocusRing, marketingGutterX } from "@/lib/ui-classes";
import { cn } from "@/lib/utils";

export function HeroSection({ locale }: { locale: Locale }) {
  const t = getHomeLandingCopy(locale).hero;

  return (
    <section className="relative isolate overflow-hidden pt-10 pb-14 sm:pt-14 sm:pb-18 lg:pb-20">
      <WebsiteSectionBackdrop variant="deep" animated />
      <div
        aria-hidden
        className="pointer-events-none absolute -left-32 top-0 -z-10 h-[480px] w-[480px] rounded-full bg-primary/10 blur-[120px]"
      />
      <div
        aria-hidden
        className="pointer-events-none absolute -right-32 top-32 -z-10 h-[400px] w-[400px] rounded-full bg-accent/10 blur-[120px]"
      />

      <div className={cn("relative", marketingGutterX)}>
        <div className="grid items-center gap-10 lg:grid-cols-2 lg:gap-14 xl:gap-16">
          {/* Copy first on mobile; left on desktop */}
          <div className="relative z-10 order-1 lg:order-none">
            <MarketingLogo className="mb-6 hidden sm:flex" />
            <span className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/4 px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em] text-accent/90">
              <Sparkles className="h-3.5 w-3.5" aria-hidden />
              {t.badge}
            </span>
            <h1 className="mt-5 font-heading text-4xl font-bold leading-[1.04] tracking-tight sm:text-5xl lg:text-[3.25rem]">
              {t.headlineLines.map((line, i) => (
                <span
                  key={line}
                  className={cn("block", i === t.headlineLines.length - 1 ? "pv-gradient-text" : "text-foreground")}
                >
                  {line}
                </span>
              ))}
            </h1>
            <p className="mt-5 max-w-xl text-pretty text-base leading-relaxed text-muted-foreground sm:text-lg">
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
            <Link
              href="#demo"
              className={cn(
                "mt-4 inline-flex items-center gap-1.5 text-sm font-semibold text-accent hover:text-accent/90",
                marketingFocusRing,
                "rounded-sm",
              )}
            >
              {t.demoCta}
              <ArrowRight className="h-4 w-4" aria-hidden />
            </Link>
            <p className="mt-6 text-xs leading-relaxed text-muted-foreground/90">{t.webBetaNote}</p>

            <ul className="mt-8 grid gap-2.5 sm:grid-cols-2">
              {t.miniCards.map((card) => (
                <li
                  key={card.title}
                  className="rounded-xl border border-white/10 bg-[rgba(12,21,36,0.55)] px-3.5 py-3 ring-1 ring-white/4"
                >
                  <p className="text-sm font-semibold text-foreground">{card.title}</p>
                  <p className="mt-0.5 text-xs leading-relaxed text-muted-foreground">{card.body}</p>
                </li>
              ))}
            </ul>
            <p className="mt-8 text-sm font-medium tracking-wide text-accent/90">{t.tagline}</p>
          </div>

          {/* Hero visual — second on mobile, right on desktop; sole priority image */}
          <div className="relative order-2 lg:order-none">
            <div
              aria-hidden
              className="pointer-events-none absolute inset-[-8%] -z-10 rounded-[3rem] bg-[radial-gradient(ellipse_70%_55%_at_50%_45%,rgba(20,184,166,0.22),transparent_60%)] blur-2xl"
            />
            <LandingImage
              src={LANDING.hero.src}
              alt={LANDING.hero.alt}
              width={LANDING.hero.width}
              height={LANDING.hero.height}
              priority
              sizes="(max-width: 1024px) 100vw, min(680px, 50vw)"
              className="shadow-[0_50px_140px_-40px_rgba(20,184,166,0.55)]"
            />
          </div>
        </div>
      </div>
    </section>
  );
}
