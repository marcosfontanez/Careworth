import type { Metadata } from "next";

import { MarketingBreadcrumbs } from "@/components/marketing/marketing-breadcrumbs";
import { CtaSection } from "@/components/marketing/cta-section";
import { FeatureFeedLanding } from "@/components/marketing/feature-feed-landing";
import { canonical, m } from "@/lib/page-metadata";

export const metadata: Metadata = { ...m.featuresFeed, alternates: canonical("/features/feed") };

export default function FeedFeaturePage() {
  return (
    <>
      <MarketingBreadcrumbs path="/features/feed" />
      <FeatureFeedLanding />
      <CtaSection
        title="Your community. Your voice. Your Pulse."
        description="Scroll with context, create with credibility, and grow with moderators who understand medicine."
        primaryHref="/download"
        primaryLabel="Join PulseVerse now"
        secondaryHref="/features/circles"
        secondaryLabel="Explore Circles"
        analyticsScope="feature_feed"
      />
    </>
  );
}
