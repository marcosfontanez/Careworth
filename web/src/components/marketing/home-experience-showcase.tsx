import Link from "next/link";
import { ArrowRight } from "lucide-react";

import { LandingImage } from "@/components/marketing/landing-image";
import { Reveal } from "@/components/marketing/reveal";
import { PremiumSectionHeader } from "@/components/marketing/website-visuals";
import type { Locale } from "@/lib/i18n";
import { getHomeLandingCopy, type LandingFeature } from "@/lib/marketing-copy/home-landing";
import { LANDING } from "@/lib/marketing-landing-assets";
import { marketingFocusRing, marketingGutterX, marketingInlineLinkStrong, marketingSection } from "@/lib/ui-classes";
import { cn } from "@/lib/utils";

const FEATURE_ASSETS: Record<
  LandingFeature["id"],
  { src: string; width: number; height: number; alt: string }
> = {
  feed: LANDING.feed,
  circles: LANDING.circlesDiscover,
  prompts: LANDING.circlesConversation,
  myPulse: LANDING.myPulse,
  creator: LANDING.creatorHub,
  live: LANDING.live,
};

function FeatureRow({
  feature,
  reversed,
}: {
  feature: LandingFeature;
  reversed?: boolean;
}) {
  const asset = FEATURE_ASSETS[feature.id];
  return (
    <div
      className={cn(
        "grid items-center gap-10 lg:grid-cols-2 lg:gap-16",
        reversed && "lg:[&>*:first-child]:order-2",
      )}
    >
      <LandingImage
        src={asset.src}
        alt={asset.alt}
        width={asset.width}
        height={asset.height}
        sizes="(max-width: 1024px) 85vw, 420px"
        className="mx-auto max-w-[420px] shadow-[0_32px_90px_-30px_rgba(45,127,249,0.35)]"
      />
      <div className={cn("max-w-lg", reversed ? "lg:justify-self-end" : "")}>
        <h3 className="font-heading text-2xl font-bold tracking-tight text-foreground sm:text-3xl">
          {feature.headline}
        </h3>
        <p className="mt-3 text-pretty text-base leading-relaxed text-muted-foreground">{feature.copy}</p>
        <ul className="mt-5 space-y-2">
          {feature.bullets.map((b) => (
            <li key={b} className="flex gap-2.5 text-sm text-muted-foreground">
              <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-accent/80" aria-hidden />
              {b}
            </li>
          ))}
        </ul>
        <Link
          href={feature.href}
          prefetch={feature.href.startsWith("/web-app") ? false : undefined}
          className={cn("mt-6 inline-flex items-center gap-1.5", marketingInlineLinkStrong, marketingFocusRing)}
        >
          {feature.cta}
          <ArrowRight className="h-4 w-4" aria-hidden />
        </Link>
      </div>
    </div>
  );
}

export function HomeExperienceShowcase({ locale }: { locale: Locale }) {
  const c = getHomeLandingCopy(locale).experience;

  return (
    <section className={marketingSection}>
      <div className={marketingGutterX}>
        <Reveal>
          <PremiumSectionHeader eyebrow={c.eyebrow} title={c.title} description={c.subtitle} />
        </Reveal>
        <div className="mt-12 space-y-20 sm:mt-16 sm:space-y-24">
          {c.features.map((feature, i) => (
            <Reveal key={feature.id} className="pv-cv-section">
              <FeatureRow feature={feature} reversed={i % 2 === 1} />
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  );
}
