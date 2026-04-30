import { MarketingBreadcrumbs } from "@/components/marketing/marketing-breadcrumbs";
import { CtaSection } from "@/components/marketing/cta-section";
import { FeaturePulsePageLanding } from "@/components/marketing/feature-pulse-page-landing";
import { generateMarketingMetadata } from "@/lib/marketing-seo";

export const generateMetadata = () => generateMarketingMetadata("featuresPulsePage");

export default function PulsePageFeaturePage() {
  return (
    <>
      <MarketingBreadcrumbs path="/features/pulse-page" />
      <FeaturePulsePageLanding />
      <CtaSection
        title="Your professional home is waiting."
        description="Claim your Pulse Page — Current Vibe, My Pulse (latest five updates), Media Hub, and creator-style identity in one surface."
        primaryHref="/download"
        primaryLabel="Create your Pulse Page"
        secondaryHref="/features/my-pulse"
        secondaryLabel="How My Pulse works"
        analyticsScope="feature_pulse_page"
      />
    </>
  );
}
