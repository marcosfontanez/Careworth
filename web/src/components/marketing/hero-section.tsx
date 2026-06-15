import { Sparkles } from "lucide-react";

import { HomeHeroActions } from "@/components/marketing/home-hero-actions";
import { LandingImage } from "@/components/marketing/landing-image";
import { MarketingLogo } from "@/components/marketing/marketing-logo";
import { WebsiteSectionBackdrop } from "@/components/marketing/website-visuals";
import type { Locale } from "@/lib/i18n";
import { getHomeLandingCopy } from "@/lib/marketing-copy/home-landing";
import { LANDING } from "@/lib/marketing-landing-assets";
import { marketingGutterX } from "@/lib/ui-classes";
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
        {/* Desktop: wider image column (7/12); mini cards move below so the montage isn't dwarfed by copy height */}
        <div className="grid items-center gap-10 lg:grid-cols-12 lg:gap-x-8 xl:gap-x-10">
          <div className="relative z-10 order-1 lg:col-span-5 lg:order-none">
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
            <HomeHeroActions primaryCta={t.primaryCta} secondaryCta={t.secondaryCta} demoCta={t.demoCta} />
            <p className="mt-6 text-xs leading-relaxed text-muted-foreground/90">{t.webBetaNote}</p>
            <p className="mt-8 text-sm font-medium tracking-wide text-accent/90 lg:hidden">{t.tagline}</p>

            {/* Mini cards under copy on mobile/tablet only */}
            <ul className="mt-8 grid gap-2.5 sm:grid-cols-2 lg:hidden">
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
          </div>

          {/* Hero visual — dominant on desktop; sole priority image */}
          <div className="relative order-2 lg:col-span-7 lg:order-none xl:-mr-8 2xl:-mr-12">
            <div
              aria-hidden
              className="pointer-events-none absolute inset-[-12%] -z-10 rounded-[3rem] bg-[radial-gradient(ellipse_70%_55%_at_50%_45%,rgba(20,184,166,0.28),transparent_62%)] blur-2xl"
            />
            <LandingImage
              src={LANDING.hero.src}
              alt={LANDING.hero.alt}
              width={LANDING.hero.width}
              height={LANDING.hero.height}
              priority
              sizes="(max-width: 1024px) 100vw, min(960px, 58vw)"
              className={cn(
                "w-full shadow-[0_50px_140px_-40px_rgba(20,184,166,0.55)]",
                "lg:rounded-[2rem] xl:rounded-[2.25rem]",
              )}
            />
          </div>
        </div>

        {/* Mini cards + tagline full width below hero on desktop */}
        <div className="mt-10 hidden lg:block">
          <ul className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
            {t.miniCards.map((card) => (
              <li
                key={card.title}
                className="rounded-xl border border-white/10 bg-[rgba(12,21,36,0.55)] px-4 py-3.5 ring-1 ring-white/4"
              >
                <p className="text-sm font-semibold text-foreground">{card.title}</p>
                <p className="mt-1 text-xs leading-relaxed text-muted-foreground">{card.body}</p>
              </li>
            ))}
          </ul>
          <p className="mt-8 text-center text-sm font-medium tracking-wide text-accent/90 sm:text-left">{t.tagline}</p>
        </div>
      </div>
    </section>
  );
}
