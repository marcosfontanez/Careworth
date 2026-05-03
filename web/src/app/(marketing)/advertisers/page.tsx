import { AdvertisersLanding } from "@/components/marketing/advertisers-landing";
import { CtaSection } from "@/components/marketing/cta-section";
import { getAdvertisersLandingCopy } from "@/lib/marketing-copy/advertisers-landing";
import { getMarketingLocale } from "@/lib/marketing-locale-server";
import { generateMarketingMetadata } from "@/lib/marketing-seo";

export const generateMetadata = () => generateMarketingMetadata("advertisers");

export default async function AdvertisersPage() {
  const locale = await getMarketingLocale();
  const c = getAdvertisersLandingCopy(locale);

  return (
    <>
      <AdvertisersLanding locale={locale} />
      <CtaSection
        title={c.bottomCta.title}
        description={c.bottomCta.description}
        primaryHref="/contact?topic=media-kit"
        primaryLabel={c.bottomCta.primaryLabel}
        secondaryHref="/contact?topic=partnerships"
        secondaryLabel={c.bottomCta.secondaryLabel}
        analyticsScope="advertisers_bottom"
      />
    </>
  );
}
