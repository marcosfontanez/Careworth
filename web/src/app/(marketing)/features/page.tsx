import Link from "next/link";
import { ArrowRight, LayoutGrid } from "lucide-react";
import { MarketingDestinationLink } from "@/components/marketing/marketing-destination-link";
import { CtaSection } from "@/components/marketing/cta-section";
import { FeaturesComparisonSection, FeaturesHubStatsBar } from "@/components/marketing/features-hub-extras";
import { HomeWhySix } from "@/components/marketing/home-why-six";
import { SectionHeader } from "@/components/marketing/section-header";
import { MarketingPageShell } from "@/components/marketing/marketing-page-shell";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  marketingCardInteractive,
  marketingEyebrow,
  marketingSectionTitle,
  shadowPrimaryCta,
} from "@/lib/ui-classes";
import { getFeaturesHubCopy } from "@/lib/marketing-copy/features-hub";
import { getMarketingLocale } from "@/lib/marketing-locale-server";
import { generateMarketingMetadata } from "@/lib/marketing-seo";
import { cn } from "@/lib/utils";

export const generateMetadata = () => generateMarketingMetadata("features");

export default async function FeaturesHubPage() {
  const locale = await getMarketingLocale();
  const copy = getFeaturesHubCopy(locale);

  return (
    <>
      <MarketingPageShell breadcrumbPath="/features">
        <div className="relative overflow-hidden rounded-3xl border border-border/80 bg-gradient-to-br from-card/90 via-background to-primary/[0.07] px-6 py-12 sm:px-10 sm:py-14">
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

      <FeaturesHubStatsBar stats={copy.stats} />

      <MarketingPageShell className="!pt-0">
        <div className="mt-4">
          <div className="flex flex-wrap items-end justify-between gap-4">
            <div>
              <p className={cn(marketingEyebrow, "tracking-widest")}>{copy.spotlightsEyebrow}</p>
              <h2 className={cn(marketingSectionTitle, "mt-2")}>{copy.spotlightsTitle}</h2>
              <p className="mt-2 max-w-2xl leading-relaxed text-muted-foreground">{copy.spotlightsBody}</p>
            </div>
          </div>
          <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
            {copy.spotlights.map((s) => (
              <Link key={s.tag} href={s.href} className="group">
                <Card className={cn("h-full", marketingCardInteractive)}>
                  <CardHeader>
                    <Badge variant="outline" className="w-fit border-primary/30 text-primary">
                      {s.tag}
                    </Badge>
                    <CardTitle className="mt-3 text-lg leading-snug">{s.title}</CardTitle>
                    <CardDescription className="text-base leading-relaxed">{s.body}</CardDescription>
                    <p className="mt-4 flex items-center gap-1 text-sm font-medium text-primary">
                      {copy.explore}
                      <ArrowRight className="h-4 w-4 opacity-0 transition duration-200 group-hover:translate-x-0.5 group-hover:opacity-100" />
                    </p>
                  </CardHeader>
                </Card>
              </Link>
            ))}
          </div>
        </div>

        <div className="mt-20">
          <div className="flex items-center gap-2 text-muted-foreground">
            <LayoutGrid className="h-4 w-4 text-primary" aria-hidden />
            <p className={cn(marketingEyebrow, "tracking-widest")}>{copy.allSurfacesEyebrow}</p>
          </div>
          <h2 className={cn(marketingSectionTitle, "mt-2")}>{copy.allSurfacesTitle}</h2>
          <p className="mt-2 max-w-2xl leading-relaxed text-muted-foreground">{copy.allSurfacesBody}</p>
          <div className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
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

      <FeaturesComparisonSection
        eyebrow={copy.compareEyebrow}
        title={copy.compareTitle}
        body={copy.compareBody}
        tableTitle={copy.compareTableTitle}
        colUs={copy.compareColUs}
        colThem={copy.compareColThem}
        rows={copy.comparisonRows}
        cellLimited={copy.compareCellLimited}
        cellDash={copy.compareCellDash}
        includedAria={copy.compareIncludedAria}
      />
      <HomeWhySix locale={locale} />
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
