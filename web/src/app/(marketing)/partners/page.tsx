import type { Metadata } from "next";

import { SectionHeader } from "@/components/marketing/section-header";
import { MarketingDestinationLink } from "@/components/marketing/marketing-destination-link";
import { MarketingPageShell } from "@/components/marketing/marketing-page-shell";
import { CtaSection } from "@/components/marketing/cta-section";
import { marketingCardMuted, marketingInlineLink } from "@/lib/ui-classes";
import { canonical, m } from "@/lib/page-metadata";
import { cn } from "@/lib/utils";

export const metadata: Metadata = { ...m.partners, alternates: canonical("/partners") };

const offers = [
  {
    title: "Education series",
    body: "Co-branded Live with moderated Q&A, clear disclosures, and optional integration with Circles programming — built for discovery-first Live, not static webinars.",
  },
  {
    title: "Circles & community",
    body: "Sponsored room headers and editorial support in premium healthcare topic spaces — with paths for highlights to surface on Pulse Page via My Pulse.",
  },
  {
    title: "Research-ready analytics",
    body: "Directional engagement and segment visibility with consent boundaries, evolving toward credible partner Data & Insights — expand under your data agreement.",
  },
] as const;

export default function PartnersPage() {
  return (
    <>
      <MarketingPageShell width="medium" breadcrumbPath="/partners">
        <SectionHeader
          eyebrow="Partners"
          title="Build with healthcare culture"
          description="Institutions, associations, and innovators partner with PulseVerse to reach clinicians in Feed, Circles, Live, and on Pulse Page — with moderation seriousness, trust tooling, and identity surfaces that respect how teams actually connect."
        />
        <div className="mt-10 grid gap-6 md:grid-cols-3">
          {offers.map((o) => (
            <div key={o.title} className={cn("rounded-2xl p-6", marketingCardMuted)}>
              <h2 className="text-lg font-semibold text-foreground">{o.title}</h2>
              <p className="mt-3 text-sm leading-relaxed text-muted-foreground">{o.body}</p>
            </div>
          ))}
        </div>
        <p className="mt-10 text-center text-sm text-muted-foreground">
          Enterprise pathways, BAAs, and regional rollouts — start on the{" "}
          <MarketingDestinationLink href="/contact" analyticsSource="partners_inline_contact" className={marketingInlineLink}>
            contact form
          </MarketingDestinationLink>
          .
        </p>
      </MarketingPageShell>
      <CtaSection
        title="Talk partnerships"
        description="Tell us about your organization and the communities you serve."
        primaryHref="/contact"
        primaryLabel="Contact us"
        analyticsScope="partners_bottom"
      />
    </>
  );
}
