import { BetaAccessButtons } from "@/components/marketing/beta-access-buttons";
import { MarketingPrimaryCta, MarketingSecondaryCta } from "@/components/marketing/marketing-cta";
import { PosterFrame, SplitFeatureRow } from "@/components/marketing/website-visuals";
import type { Locale } from "@/lib/i18n";
import { getHomeCtaCopy } from "@/lib/marketing-copy/home";
import { marketingGradientFrame, marketingGradientFrameInner, marketingGutterX } from "@/lib/ui-classes";
import { cn } from "@/lib/utils";

/**
 * Premium homepage closing CTA — gradient panel with ecosystem hero visual.
 */
export function HomeFinalCta({ locale }: { locale: Locale }) {
  const c = getHomeCtaCopy(locale);
  return (
    <section className="relative isolate py-12 sm:py-16">
      <div className={marketingGutterX}>
        <div className={marketingGradientFrame}>
          <div className={cn(marketingGradientFrameInner, "px-6 py-10 sm:px-12 sm:py-14")}>
            <div
              aria-hidden
              className="pointer-events-none absolute inset-0 opacity-50"
              style={{
                background:
                  "radial-gradient(ellipse 70% 60% at 85% 40%, rgba(45,127,249,0.35), transparent 50%), radial-gradient(ellipse 50% 50% at 12% 100%, rgba(20,184,166,0.20), transparent 55%)",
              }}
            />

            <SplitFeatureRow className="relative gap-10 lg:gap-14">
              <div className="text-center lg:text-left">
                <h2 className="font-heading text-[2.1rem] font-bold leading-[1.04] tracking-tight text-foreground sm:text-[2.6rem]">
                  {c.title}
                </h2>
                <p className="mx-auto mt-3 max-w-xl text-pretty text-base leading-relaxed text-muted-foreground sm:text-lg lg:mx-0">
                  {c.description}
                </p>
                <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:flex-wrap lg:justify-start">
                  <MarketingPrimaryCta href="/download" analyticsSource="home_bottom_primary">
                    {c.primaryLabel}
                  </MarketingPrimaryCta>
                  <MarketingSecondaryCta href="/contact" analyticsSource="home_bottom_secondary">
                    {c.secondaryLabel}
                  </MarketingSecondaryCta>
                </div>
                <BetaAccessButtons
                  locale={locale}
                  className="mt-5 justify-center lg:justify-start"
                />
              </div>

              <PosterFrame
                src="/marketing/marketing-home-ecosystem-hero.png"
                alt={c.ecosystemHeroAlt}
                width={1024}
                height={576}
                glow="blue"
                size="dramatic"
                tag={{ label: "PulseVerse", tone: "cyan" }}
                sizes="(max-width: 1024px) 100vw, min(520px, 45vw)"
                className="w-full max-w-xl justify-self-center lg:max-w-none lg:justify-self-end"
                cornerTrace={false}
              />
            </SplitFeatureRow>
          </div>
        </div>
      </div>
    </section>
  );
}
