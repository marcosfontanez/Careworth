import { CtaSection } from "@/components/marketing/cta-section";
import { FeaturePulsePageLanding } from "@/components/marketing/feature-pulse-page-landing";

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
