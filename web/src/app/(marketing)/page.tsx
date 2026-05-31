import dynamic from "next/dynamic";

import { HeroSection } from "@/components/marketing/hero-section";
import { HomeFeatureShowcase } from "@/components/marketing/home-feature-showcase";
import { getMarketingLocale } from "@/lib/marketing-locale-server";
import { generateMarketingMetadata } from "@/lib/marketing-seo";

const HomePulseDuo = dynamic(() => import("@/components/marketing/home-pulse-duo").then((mod) => mod.HomePulseDuo));
const HomeCirclesSpotlight = dynamic(() =>
  import("@/components/marketing/home-circles-spotlight").then((mod) => mod.HomeCirclesSpotlight),
);
const HomeCreatorHub = dynamic(() =>
  import("@/components/marketing/home-creator-hub").then((mod) => mod.HomeCreatorHub),
);
const HomePulseShop = dynamic(() =>
  import("@/components/marketing/home-pulse-shop").then((mod) => mod.HomePulseShop),
);
const HomeSparksDiamonds = dynamic(() =>
  import("@/components/marketing/home-sparks-diamonds").then((mod) => mod.HomeSparksDiamonds),
);
const HomeBordersFlagship = dynamic(() =>
  import("@/components/marketing/home-borders-flagship").then((mod) => mod.HomeBordersFlagship),
);
const HomeTrustSection = dynamic(() =>
  import("@/components/marketing/home-trust-section").then((mod) => mod.HomeTrustSection),
);
const HomeAdFilm = dynamic(() =>
  import("@/components/marketing/home-ad-film").then((mod) => mod.HomeAdFilm),
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
      <HomeCirclesSpotlight locale={locale} />
      <HomeCreatorHub locale={locale} />
      <HomePulseShop locale={locale} />
      <HomeSparksDiamonds locale={locale} />
      <HomeBordersFlagship locale={locale} />
      <HomeTrustSection locale={locale} />
      <HomeAdFilm locale={locale} />
      <HomeFinalCta locale={locale} />
    </>
  );
}
