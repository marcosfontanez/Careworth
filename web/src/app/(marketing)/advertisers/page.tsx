import type { Metadata } from "next";

import { AdvertisersLanding } from "@/components/marketing/advertisers-landing";
import { CtaSection } from "@/components/marketing/cta-section";
import { canonical, m } from "@/lib/page-metadata";

export const metadata: Metadata = { ...m.advertisers, alternates: canonical("/advertisers") };

export default function AdvertisersPage() {
  return (
    <>
      <AdvertisersLanding />
      <CtaSection
        title="Let's build something meaningful together."
        description="Media kits, partnership pilots, and brand-safe placements — start with a conversation."
        primaryHref="/contact"
        primaryLabel="Request media kit"
        secondaryHref="/contact"
        secondaryLabel="Talk to partnerships"
      />
    </>
  );
}
