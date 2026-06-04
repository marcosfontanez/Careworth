import dynamic from "next/dynamic";

import { HeroSection } from "@/components/marketing/hero-section";
import { HomeFeatureShowcase } from "@/components/marketing/home-feature-showcase";
import { getMarketingLocale } from "@/lib/marketing-locale-server";
import { generateMarketingMetadata } from "@/lib/marketing-seo";

const HomePulseDuo = dynamic(() => import("@/components/marketing/home-pulse-duo").then((mod) => mod.HomePulseDuo));
const HomeCreatorHub = dynamic(() =>
  import("@/components/marketing/home-creator-hub").then((mod) => mod.HomeCreatorHub),
);
const HomeTrustSection = dynamic(() =>
  import("@/components/marketing/home-trust-section").then((mod) => mod.HomeTrustSection),
);
const HomeFinalCta = dynamic(() => import("@/components/marketing/home-final-cta").then((mod) => mod.HomeFinalCta));

export const generateMetadata = () => generateMarketingMetadata("home");

export default async function HomePage() {
  const locale = await getMarketingLocale();

  return (
    <>
      <HeroSection locale={locale} />
      <HomeFeatureShowcase locale={locale} />
      <HomePulseDuo locale={locale} />
      <HomeCreatorHub locale={locale} />
      <HomeTrustSection locale={locale} />
      <HomeFinalCta locale={locale} />
    </>
  );
}
