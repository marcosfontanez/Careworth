import type { Metadata } from "next";

import { CtaSection } from "@/components/marketing/cta-section";
import { FeatureMyPulseLanding } from "@/components/marketing/feature-my-pulse-landing";
import { canonical, m } from "@/lib/page-metadata";

export const metadata: Metadata = { ...m.featuresMyPulse, alternates: canonical("/features/my-pulse") };

export default function MyPulseFeaturePage() {
  return (
    <>
      <FeatureMyPulseLanding />
      <CtaSection
        title="Your community. Your voice. Your Pulse."
        description="Keep saves, trends, and connections in one calm surface — built for licensed life."
        primaryHref="/download"
        primaryLabel="Join PulseVerse now"
        secondaryHref="/features/pulse-page"
        secondaryLabel="Build your Pulse Page"
      />
    </>
  );
}
