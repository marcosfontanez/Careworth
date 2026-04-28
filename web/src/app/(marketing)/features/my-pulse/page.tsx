import { CtaSection } from "@/components/marketing/cta-section";
import { FeatureMyPulseLanding } from "@/components/marketing/feature-my-pulse-landing";

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
