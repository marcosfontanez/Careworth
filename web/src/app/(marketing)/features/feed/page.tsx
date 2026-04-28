import { CtaSection } from "@/components/marketing/cta-section";
import { FeatureFeedLanding } from "@/components/marketing/feature-feed-landing";

export default function FeedFeaturePage() {
  return (
    <>
      <FeatureFeedLanding />
      <CtaSection
        title="Your community. Your voice. Your Pulse."
        description="Scroll with context, create with credibility, and grow with moderators who understand medicine."
        primaryHref="/download"
        primaryLabel="Join PulseVerse now"
        secondaryHref="/features/circles"
        secondaryLabel="Explore Circles"
      />
    </>
  );
}
