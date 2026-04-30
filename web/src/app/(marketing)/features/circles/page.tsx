import { MarketingBreadcrumbs } from "@/components/marketing/marketing-breadcrumbs";
import { CtaSection } from "@/components/marketing/cta-section";
import { FeatureCirclesLanding } from "@/components/marketing/feature-circles-landing";
import { generateMarketingMetadata } from "@/lib/marketing-seo";

export const generateMetadata = () => generateMarketingMetadata("featuresCircles");

export default function CirclesFeaturePage() {
  return (
    <>
      <MarketingBreadcrumbs path="/features/circles" />
      <FeatureCirclesLanding />
      <CtaSection
        title="Your community. Your voice. Your Pulse."
        description="Pick your Circles, follow the culture you trust, and share what matters back to My Pulse."
        primaryHref="/download"
        primaryLabel="Join PulseVerse now"
        secondaryHref="/contact"
        secondaryLabel="Talk to partnerships"
        analyticsScope="feature_circles"
      />
    </>
  );
}
