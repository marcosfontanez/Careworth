"use client";

import Link from "next/link";
import { ArrowRight } from "lucide-react";

import { MARKETING_EVENTS } from "@/lib/marketing-analytics";
import { trackHomepageConversion } from "@/lib/marketing-conversion-tracking";
import type { LandingFeature } from "@/lib/marketing-copy/home-landing";
import { marketingFocusRing, marketingInlineLinkStrong } from "@/lib/ui-classes";
import { cn } from "@/lib/utils";

export function HomeFeatureCtaLink({ feature }: { feature: LandingFeature }) {
  return (
    <Link
      href={feature.href}
      prefetch={feature.href.startsWith("/web-app") ? false : undefined}
      onClick={() =>
        trackHomepageConversion(MARKETING_EVENTS.homepageFeatureCtaClick, {
          section: "experience",
          cta_label: feature.cta,
          destination: feature.href,
        })
      }
      className={cn("mt-6 inline-flex items-center gap-1.5", marketingInlineLinkStrong, marketingFocusRing)}
    >
      {feature.cta}
      <ArrowRight className="h-4 w-4" aria-hidden />
    </Link>
  );
}
