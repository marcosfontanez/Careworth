import dynamic from "next/dynamic";

import { CtaSection } from "@/components/marketing/cta-section";
import { HomeFeatureShowcase } from "@/components/marketing/home-feature-showcase";
import { HomeProductOverview } from "@/components/marketing/home-product-overview";
import { HeroSection } from "@/components/marketing/hero-section";
import { getHomeCtaCopy } from "@/lib/marketing-copy/home";
import { getMarketingLocale } from "@/lib/marketing-locale-server";
import { generateMarketingMetadata } from "@/lib/marketing-seo";

const HomeSpotlightSection = dynamic(() =>
  import("@/components/marketing/home-spotlight-section").then((mod) => mod.HomeSpotlightSection),
);
const HomePulseDuo = dynamic(() => import("@/components/marketing/home-pulse-duo").then((mod) => mod.HomePulseDuo));
const HomeMyPulseSignature = dynamic(() =>
  import("@/components/marketing/home-my-pulse-signature").then((mod) => mod.HomeMyPulseSignature),
);
const HomeWhySix = dynamic(() => import("@/components/marketing/home-why-six").then((mod) => mod.HomeWhySix));
const HomeStatsSplit = dynamic(() => import("@/components/marketing/home-stats-split").then((mod) => mod.HomeStatsSplit));
const HomeTestimonials = dynamic(() =>
  import("@/components/marketing/home-testimonials").then((mod) => mod.HomeTestimonials),
);

export const generateMetadata = () => generateMarketingMetadata("home");

export default async function HomePage() {
  const locale = await getMarketingLocale();
  const cta = getHomeCtaCopy(locale);

  return (
    <>
      <HeroSection locale={locale} />
      <HomeFeatureShowcase locale={locale} />
      <HomeProductOverview locale={locale} />
      <HomeSpotlightSection locale={locale} />
      <HomePulseDuo locale={locale} />
      <HomeMyPulseSignature locale={locale} />
      <HomeWhySix locale={locale} />
      <HomeStatsSplit locale={locale} />
      <HomeTestimonials locale={locale} />
      <CtaSection
        title={cta.title}
        description={cta.description}
        primaryHref="/download"
        primaryLabel={cta.primaryLabel}
        secondaryHref="/contact"
        secondaryLabel={cta.secondaryLabel}
        analyticsScope="home_bottom"
      />
    </>
  );
}
