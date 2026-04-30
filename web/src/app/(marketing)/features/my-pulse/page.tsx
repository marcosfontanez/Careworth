import type { Metadata } from "next";

import { MarketingBreadcrumbs } from "@/components/marketing/marketing-breadcrumbs";
import { CtaSection } from "@/components/marketing/cta-section";
import { FeatureMyPulseLanding } from "@/components/marketing/feature-my-pulse-landing";
import { canonical, m } from "@/lib/page-metadata";

export const metadata: Metadata = { ...m.featuresMyPulse, alternates: canonical("/features/my-pulse") };

export default function MyPulseFeaturePage() {
  return (
    <>
      <MarketingBreadcrumbs path="/features/my-pulse" />
      <FeatureMyPulseLanding />
      <CtaSection
        title="Your community. Your voice. Your Pulse."
        description="Keep Thought, Clip, Link, and Pics fresh on your Pulse Page — five visible slots, always current."
        primaryHref="/download"
        primaryLabel="Join PulseVerse now"
        secondaryHref="/features/pulse-page"
        secondaryLabel="See Pulse Page"
        analyticsScope="feature_my_pulse"
      />
    </>
  );
}
