import type { Metadata } from "next";

import { MarketingBreadcrumbs } from "@/components/marketing/marketing-breadcrumbs";
import { CtaSection } from "@/components/marketing/cta-section";
import { FeatureLiveLanding } from "@/components/marketing/feature-live-landing";
import { canonical, m } from "@/lib/page-metadata";

export const metadata: Metadata = { ...m.featuresLive, alternates: canonical("/features/live") };

export default function LiveFeaturePage() {
  return (
    <>
      <MarketingBreadcrumbs path="/features/live" />
      <FeatureLiveLanding />
      <CtaSection
        title="Your knowledge can change lives."
        description="Discover and host Live with Featured, Top Live Now, Rising Lives, and topic browse — plus moderation that respects how clinicians teach."
        primaryHref="/download"
        primaryLabel="Go Live now"
        secondaryHref="/contact"
        secondaryLabel="Talk to partnerships"
        analyticsScope="feature_live"
      />
    </>
  );
}
