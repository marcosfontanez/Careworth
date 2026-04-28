import type { Metadata } from "next";

import { CtaSection } from "@/components/marketing/cta-section";
import { FeaturePulsePageLanding } from "@/components/marketing/feature-pulse-page-landing";
import { canonical, m } from "@/lib/page-metadata";

export const metadata: Metadata = { ...m.featuresPulsePage, alternates: canonical("/features/pulse-page") };

export default function PulsePageFeaturePage() {
  return (
    <>
      <FeaturePulsePageLanding />
      <CtaSection
        title="Your professional home is waiting."
        description="Claim your Pulse Page — pins, media, rolling posts, and a profile that matches your practice."
        primaryHref="/download"
        primaryLabel="Create your Pulse Page"
        secondaryHref="/features/my-pulse"
        secondaryLabel="Explore My Pulse"
      />
    </>
  );
}
