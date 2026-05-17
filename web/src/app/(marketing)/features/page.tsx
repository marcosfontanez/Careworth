import Link from "next/link";
import { ArrowRight, LayoutGrid, ShoppingBag, Sparkles, Video } from "lucide-react";

import { MarketingDestinationLink } from "@/components/marketing/marketing-destination-link";
import { CtaSection } from "@/components/marketing/cta-section";
import { MarketingPageShell } from "@/components/marketing/marketing-page-shell";
import { SectionHeader } from "@/components/marketing/section-header";
import {
  OrbitDots,
  PosterCaptionStrip,
  PosterFrame,
  PremiumSectionHeader,
  SpotlightBeam,
  WebsiteSectionBackdrop,
} from "@/components/marketing/website-visuals";
import { Button } from "@/components/ui/button";
import { Card, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  marketingCardInteractive,
  marketingEyebrow,
  marketingGutterX,
  marketingSectionTitle,
  shadowPrimaryCta,
} from "@/lib/ui-classes";
import { getFeaturesHubCopy } from "@/lib/marketing-copy/features-hub";
import { getMarketingLocale } from "@/lib/marketing-locale-server";
import { generateMarketingMetadata } from "@/lib/marketing-seo";
import { cn } from "@/lib/utils";

export const generateMetadata = () => generateMarketingMetadata("features");

const CREATOR_ECON_ICONS = [Video, ShoppingBag, Sparkles] as const;

export default async function FeaturesHubPage() {
  const locale = await getMarketingLocale();
  const copy = getFeaturesHubCopy(locale);

  return (
    <>
      <MarketingPageShell breadcrumbPath="/features">
        <div className="relative overflow-hidden rounded-3xl border border-border/80 bg-linear-to-br from-card/90 via-background to-primary/[0.07] px-6 py-12 sm:px-10 sm:py-14">
          <div className="pointer-events-none absolute -right-24 -top-24 h-72 w-72 rounded-full bg-primary/15 blur-3xl" aria-hidden />
          <div className="pointer-events-none absolute -bottom-20 -left-16 h-56 w-56 rounded-full bg-pv-electric/10 blur-3xl" aria-hidden />
          <SectionHeader
            className="relative mx-0 max-w-3xl text-left"
            eyebrow={copy.intro.eyebrow}
            title={copy.intro.title}
            description={copy.intro.description}
          />
          <div className="relative mt-8 flex flex-wrap gap-3">
            <Button asChild className={cn("bg-primary text-primary-foreground", shadowPrimaryCta)}>
              <MarketingDestinationLink href="/download" analyticsSource="features_hub_join">
                {copy.join}
              </MarketingDestinationLink>
            </Button>
            <Button asChild variant="outline" className="border-border/80 bg-card/40">
              <MarketingDestinationLink href="/contact" analyticsSource="features_hub_partner">
                {copy.partner}
              </MarketingDestinationLink>
            </Button>
          </div>
        </div>
      </MarketingPageShell>

      <section id="creator-hub-visual" className="relative isolate overflow-hidden border-y border-white/5 py-20 sm:py-24">
        <WebsiteSectionBackdrop variant="deep" />
        <div className={cn(marketingGutterX, "relative")}>
          <PremiumSectionHeader
            eyebrow="Creator economy"
            title="Hub, Shop, and rewards on one premium surface."
            description="Built for creators in healthcare — custom borders, send-a-spark gifting, and a Pulse Shop tuned for credibility, not chaos."
          />
          <div className="relative mt-14 sm:mt-16">
            <SpotlightBeam tone="gold" intensity="strong" />
            <OrbitDots tone="gold" preset="hero" />
            <PosterFrame
              src="/marketing/creator-hub.png"
              alt="PulseVerse Creator Hub, Pulse Shop, and rewards on iPhone — borders, gifting, and creator surface."
              width={1024}
              height={576}
              glow="gold"
              size="dramatic"
              tag={{ label: "Creator Hub · iPhone" }}
              className="mx-auto max-w-6xl"
            />
            <PosterCaptionStrip
              device="iPhone"
              context="Creator Hub  ·  Pulse Shop  ·  Rewards & gifting"
              tone="gold"
            />
          </div>
        </div>
      </section>

      <MarketingPageShell className="pt-0!">
        <div id="platform-surfaces" className="mt-4 scroll-mt-28">
          <div className="flex items-center gap-2 text-muted-foreground">
            <LayoutGrid className="h-4 w-4 text-primary" aria-hidden />
            <p className={cn(marketingEyebrow, "tracking-widest")}>{copy.allSurfacesEyebrow}</p>
          </div>
          <h2 className={cn(marketingSectionTitle, "mt-2")}>{copy.allSurfacesTitle}</h2>
          <p className="mt-2 max-w-2xl leading-relaxed text-muted-foreground">{copy.allSurfacesBody}</p>
          <div className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
            {copy.grid.map((l) => (
              <Link key={l.href} href={l.href} className="group">
                <Card className={cn("h-full", marketingCardInteractive)}>
                  <CardHeader>
                    <CardTitle className="flex items-center justify-between text-xl">
                      {l.title}
                      <ArrowRight className="h-4 w-4 text-primary opacity-0 transition duration-200 group-hover:translate-x-0.5 group-hover:opacity-100" />
                    </CardTitle>
                    <CardDescription className="text-base leading-relaxed">{l.desc}</CardDescription>
                  </CardHeader>
                </Card>
              </Link>
            ))}
          </div>
        </div>
      </MarketingPageShell>

      <section id="creator-economy" className="scroll-mt-28 border-t border-white/5 py-20 sm:py-24">
        <WebsiteSectionBackdrop variant="soft" />
        <div className={marketingGutterX}>
          <PremiumSectionHeader
            eyebrow={copy.creatorEconomy.eyebrow}
            title={copy.creatorEconomy.title}
            description={copy.creatorEconomy.description}
          />
          <div className="mt-12 grid gap-6 lg:grid-cols-3">
            {copy.creatorEconomy.blocks.map((block, i) => {
              const Icon = CREATOR_ECON_ICONS[i] ?? Sparkles;
              return (
                <article
                  key={block.title}
                  className="relative overflow-hidden rounded-2xl border border-white/10 bg-[rgba(12,21,36,0.55)] p-6 ring-1 ring-white/4 backdrop-blur-md"
                >
                  <div
                    aria-hidden
                    className="pointer-events-none absolute -right-8 -top-8 h-28 w-28 rounded-full bg-primary/10 blur-2xl"
                  />
                  <div className="relative">
                    <span className="inline-flex h-10 w-10 items-center justify-center rounded-xl border border-primary/30 bg-primary/10 text-primary">
                      <Icon className="h-5 w-5" aria-hidden />
                    </span>
                    <h3 className="mt-4 text-lg font-semibold text-foreground">{block.title}</h3>
                    <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{block.lead}</p>
                    <ul className="mt-4 space-y-2.5 text-sm leading-relaxed text-muted-foreground">
                      {block.bullets.map((b) => (
                        <li key={b} className="flex gap-2">
                          <span className="mt-2 h-1 w-1 shrink-0 rounded-full bg-accent" aria-hidden />
                          <span>{b}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                </article>
              );
            })}
          </div>
          <p className="mx-auto mt-10 max-w-2xl text-center text-sm text-muted-foreground">
            {locale === "es" ? (
              <>
                Más detalle sobre Sparks & Diamonds y Borders está en la{" "}
                <Link href="/#sparks-and-diamonds" className="font-medium text-primary underline-offset-4 hover:underline">
                  sección de economía en la página principal
                </Link>{" "}
                y en el{" "}
                <Link href="/#borders" className="font-medium text-primary underline-offset-4 hover:underline">
                  destacado de Borders
                </Link>
                .
              </>
            ) : (
              <>
                Deep dives for Sparks & Diamonds and Borders live on the{" "}
                <Link href="/#sparks-and-diamonds" className="font-medium text-primary underline-offset-4 hover:underline">
                  homepage economy section
                </Link>{" "}
                and{" "}
                <Link href="/#borders" className="font-medium text-primary underline-offset-4 hover:underline">
                  Borders flagship
                </Link>
                .
              </>
            )}
          </p>
        </div>
      </section>

      <CtaSection
        title={copy.bottomCta.title}
        description={copy.bottomCta.description}
        primaryHref="/download"
        primaryLabel={copy.bottomCta.primaryLabel}
        secondaryHref="/contact"
        secondaryLabel={copy.bottomCta.secondaryLabel}
        analyticsScope="features_hub"
      />
    </>
  );
}
