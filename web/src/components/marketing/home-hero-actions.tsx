"use client";

import { ArrowRight } from "lucide-react";

import { MarketingPrimaryCta, MarketingSecondaryLink } from "@/components/marketing/marketing-cta";
import { useHomeDemo } from "@/components/marketing/home-demo-context";
import { MARKETING_EVENTS } from "@/lib/marketing-analytics";
import { trackHomepageConversion } from "@/lib/marketing-conversion-tracking";
import { marketingFocusRing } from "@/lib/ui-classes";
import { cn } from "@/lib/utils";

type Props = {
  primaryCta: string;
  secondaryCta: string;
  demoCta: string;
};

export function HomeHeroActions({ primaryCta, secondaryCta, demoCta }: Props) {
  const { openDemoVideo } = useHomeDemo();

  return (
    <>
      <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:flex-wrap">
        <MarketingPrimaryCta
          href="/download"
          analyticsSource="hero_primary"
          onClick={() =>
            trackHomepageConversion(MARKETING_EVENTS.homepageDownloadClick, {
              section: "hero",
              cta_label: primaryCta,
              destination: "/download",
            })
          }
        >
          {primaryCta}
        </MarketingPrimaryCta>
        <MarketingSecondaryLink
          href="/web-app"
          prefetch={false}
          onClick={() =>
            trackHomepageConversion(MARKETING_EVENTS.homepageWebBetaClick, {
              section: "hero",
              cta_label: secondaryCta,
              destination: "/web-app",
            })
          }
        >
          {secondaryCta}
        </MarketingSecondaryLink>
      </div>
      <button
        type="button"
        onClick={() => {
          trackHomepageConversion(MARKETING_EVENTS.homepageWatchDemoClick, {
            section: "hero",
            cta_label: demoCta,
            destination: "#demo",
          });
          openDemoVideo();
        }}
        className={cn(
          "mt-4 inline-flex items-center gap-1.5 text-sm font-semibold text-accent hover:text-accent/90",
          marketingFocusRing,
          "rounded-sm",
        )}
      >
        {demoCta}
        <ArrowRight className="h-4 w-4" aria-hidden />
      </button>
    </>
  );
}
