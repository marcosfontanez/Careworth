import { CtaSection } from "@/components/marketing/cta-section";
import { HomeFeatureShowcase } from "@/components/marketing/home-feature-showcase";
import { HomeProductOverview } from "@/components/marketing/home-product-overview";
import { HomePulseDuo } from "@/components/marketing/home-pulse-duo";
import { HomeSpotlightSection } from "@/components/marketing/home-spotlight-section";
import { HomeStatsSplit } from "@/components/marketing/home-stats-split";
import { HomeTestimonials } from "@/components/marketing/home-testimonials";
import { HomeWhySix } from "@/components/marketing/home-why-six";
import { HeroSection } from "@/components/marketing/hero-section";

export default function HomePage() {
  return (
    <>
      <HeroSection />
      <HomeFeatureShowcase />
      <HomeProductOverview />
      <HomeSpotlightSection />
      <HomePulseDuo />
      <HomeWhySix />
      <HomeStatsSplit />
      <HomeTestimonials />
      <CtaSection
        title="Your community. Your voice. Your Pulse."
        description="Join clinicians, students, and teams building healthcare culture — with trust, clarity, and room to breathe."
        primaryHref="/download"
        primaryLabel="Join CareWorth now"
        secondaryHref="/contact"
        secondaryLabel="Talk to partnerships"
      />
    </>
  );
}
