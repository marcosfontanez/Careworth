import { ArrowRight } from "lucide-react";

import { BetaAccessButtons } from "@/components/marketing/beta-access-buttons";
import { MarketingDestinationLink } from "@/components/marketing/marketing-destination-link";
import { PosterFrame, SplitFeatureRow } from "@/components/marketing/website-visuals";
import { Button } from "@/components/ui/button";
import type { Locale } from "@/lib/i18n";
import { getHomeCtaCopy } from "@/lib/marketing-copy/home";
import { marketingGutterX } from "@/lib/ui-classes";
import { cn } from "@/lib/utils";

/**
 * Premium homepage closing CTA — gradient panel with ecosystem hero visual.
 */
export function HomeFinalCta({ locale }: { locale: Locale }) {
  const c = getHomeCtaCopy(locale);
  return (
    <section className="relative isolate py-16 sm:py-20">
      <div className={marketingGutterX}>
        <div
          className={cn(
            "relative overflow-hidden rounded-[1.75rem] p-px",
            "bg-linear-to-r from-[#0c1f4a] via-primary to-[#00a8cc]",
            "shadow-[0_30px_90px_-24px_rgba(45,127,249,0.55)]",
          )}
        >
          <div className="relative overflow-hidden rounded-[calc(1.75rem-1px)] bg-[rgba(5,10,20,0.93)] px-8 py-14 sm:px-14 sm:py-16">
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
                <div className="mt-8 flex flex-wrap justify-center gap-3 lg:justify-start">
                  <Button
                    size="lg"
                    className="h-12 rounded-full bg-white px-8 font-semibold text-[#050a14] shadow-[0_12px_40px_-10px_rgba(255,255,255,0.45)] hover:bg-white/95"
                    asChild
                  >
                    <MarketingDestinationLink
                      href="/download"
                      className="inline-flex items-center gap-2"
                      analyticsSource="home_bottom_primary"
                    >
                      {c.primaryLabel}
                      <ArrowRight className="h-5 w-5" aria-hidden />
                    </MarketingDestinationLink>
                  </Button>
                  <Button
                    size="lg"
                    variant="outline"
                    className="h-12 rounded-full border-white/25 bg-transparent px-7 font-semibold text-foreground hover:bg-white/6"
                    asChild
                  >
                    <MarketingDestinationLink href="/contact" analyticsSource="home_bottom_secondary">
                      {c.secondaryLabel}
                    </MarketingDestinationLink>
                  </Button>
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
