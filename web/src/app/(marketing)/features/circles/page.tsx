import { CtaSection } from "@/components/marketing/cta-section";
import { FeatureCirclesLanding } from "@/components/marketing/feature-circles-landing";

export default function CirclesFeaturePage() {
  return (
    <>
      <FeatureCirclesLanding />
      <CtaSection
        title="Your community. Your voice. Your Pulse."
        description="Pick your Circles, follow the culture you trust, and share what matters back to My Pulse."
        primaryHref="/download"
        primaryLabel="Join CareWorth now"
        secondaryHref="/contact"
        secondaryLabel="Talk to partnerships"
      />
    </>
  );
}
