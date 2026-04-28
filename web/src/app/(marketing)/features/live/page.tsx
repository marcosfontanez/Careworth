import type { Metadata } from "next";

import { CtaSection } from "@/components/marketing/cta-section";
import { FeatureLiveLanding } from "@/components/marketing/feature-live-landing";
import { canonical, m } from "@/lib/page-metadata";

export const metadata: Metadata = { ...m.featuresLive, alternates: canonical("/features/live") };

export default function LiveFeaturePage() {
  return (
    <>
      <FeatureLiveLanding />
      <CtaSection
        title="Your knowledge can change lives."
        description="Go Live with moderators, labels, and Q&amp;A that respect how clinicians actually teach."
        primaryHref="/download"
        primaryLabel="Go Live now"
        secondaryHref="/contact"
        secondaryLabel="Talk to partnerships"
      />
    </>
  );
}
