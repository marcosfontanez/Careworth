import Link from "next/link";
import { SectionHeader } from "@/components/marketing/section-header";
import { MarketingPageShell } from "@/components/marketing/marketing-page-shell";
import { CtaSection } from "@/components/marketing/cta-section";
import { marketingCardMuted } from "@/lib/ui-classes";
import { cn } from "@/lib/utils";

const offers = [
  {
    title: "Education series",
    body: "Co-branded Live and on-demand modules with moderated Q&A and clear disclosure rules.",
  },
  {
    title: "Circles & community",
    body: "Sponsored room headers and programming support — without burying organic conversation.",
  },
  {
    title: "Research-ready analytics",
    body: "Directional engagement slices with consent boundaries — expand with your data agreement.",
  },
] as const;

export default function PartnersPage() {
  return (
    <>
      <MarketingPageShell width="medium">
        <SectionHeader
          eyebrow="Partners"
          title="Build with healthcare culture"
          description="We partner with institutions, associations, and innovators who want to meet clinicians where they actually talk — not only where they clock in."
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
          <Link href="/contact" className="font-medium text-primary hover:underline">
            contact form
          </Link>
          .
        </p>
      </MarketingPageShell>
      <CtaSection
        title="Talk partnerships"
        description="Tell us about your organization and the communities you serve."
        primaryHref="/contact"
        primaryLabel="Contact us"
      />
    </>
  );
}
