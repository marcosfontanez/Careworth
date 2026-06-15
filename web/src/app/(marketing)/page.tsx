import dynamic from "next/dynamic";

import { HomeDemoProvider } from "@/components/marketing/home-demo-context";
import { HeroSection } from "@/components/marketing/hero-section";
import { HomeDemoVideo } from "@/components/marketing/home-demo-video";
import { HomeDownloadCta } from "@/components/marketing/home-download-cta";
import { HomeExperienceShowcase } from "@/components/marketing/home-experience-showcase";
import { HomeTrustBand } from "@/components/marketing/home-trust-band";
import { HomeWhyDifferent } from "@/components/marketing/home-why-different";
import { Reveal } from "@/components/marketing/reveal";
import { getHomeLandingCopy } from "@/lib/marketing-copy/home-landing";
import { getMarketingLocale } from "@/lib/marketing-locale-server";
import { generateMarketingMetadata } from "@/lib/marketing-seo";

const MobileStickyDownloadCta = dynamic(() =>
  import("@/components/marketing/mobile-sticky-download-cta").then((m) => m.MobileStickyDownloadCta),
);

export const generateMetadata = () => generateMarketingMetadata("home");

export default async function HomePage() {
  const locale = await getMarketingLocale();
  const landing = getHomeLandingCopy(locale);

  return (
    <HomeDemoProvider>
      <HeroSection locale={locale} />
      <Reveal className="pv-cv-section">
        <HomeExperienceShowcase locale={locale} />
      </Reveal>
      <Reveal className="pv-cv-section">
        <HomeWhyDifferent copy={landing.whyDifferent} />
      </Reveal>
      <Reveal className="pv-cv-section">
        <HomeDemoVideo copy={landing.demo} />
      </Reveal>
      <Reveal className="pv-cv-section">
        <HomeDownloadCta copy={landing.download} />
      </Reveal>
      <HomeTrustBand locale={locale} />
      {/* Room for sticky mobile CTA bar */}
      <div className="h-20 lg:hidden" aria-hidden />
      <MobileStickyDownloadCta />
    </HomeDemoProvider>
  );
}
