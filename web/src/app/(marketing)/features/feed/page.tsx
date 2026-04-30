import { MarketingBreadcrumbs } from "@/components/marketing/marketing-breadcrumbs";
import { CtaSection } from "@/components/marketing/cta-section";
import { FeatureFeedLanding } from "@/components/marketing/feature-feed-landing";
import { generateMarketingMetadata } from "@/lib/marketing-seo";

export const generateMetadata = () => generateMarketingMetadata("featuresFeed");

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
