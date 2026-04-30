import { SectionHeader } from "@/components/marketing/section-header";
import { MarketingDestinationLink } from "@/components/marketing/marketing-destination-link";
import { MarketingPageShell } from "@/components/marketing/marketing-page-shell";
import { CtaSection } from "@/components/marketing/cta-section";
import { getPartnersPageCopy } from "@/lib/marketing-copy/partners-page";
import { getMarketingLocale } from "@/lib/marketing-locale-server";
import { generateMarketingMetadata } from "@/lib/marketing-seo";
import { marketingCardMuted, marketingInlineLink } from "@/lib/ui-classes";
import { cn } from "@/lib/utils";

export const generateMetadata = () => generateMarketingMetadata("partners");

export default async function PartnersPage() {
  const locale = await getMarketingLocale();
  const c = getPartnersPageCopy(locale);

  return (
    <>
      <MarketingPageShell width="medium" breadcrumbPath="/partners">
        <SectionHeader eyebrow={c.eyebrow} title={c.title} description={c.description} />
        <div className="mt-10 grid gap-6 md:grid-cols-3">
          {c.offers.map((o) => (
            <div key={o.title} className={cn("rounded-2xl p-6", marketingCardMuted)}>
              <h2 className="text-lg font-semibold text-foreground">{o.title}</h2>
              <p className="mt-3 text-sm leading-relaxed text-muted-foreground">{o.body}</p>
            </div>
          ))}
        </div>
        <p className="mt-10 text-center text-sm text-muted-foreground">
          {c.contactLead}{" "}
          <MarketingDestinationLink href="/contact" analyticsSource="partners_inline_contact" className={marketingInlineLink}>
            {c.contactLinkLabel}
          </MarketingDestinationLink>
          .
        </p>
      </MarketingPageShell>
      <CtaSection
        title={c.ctaTitle}
        description={c.ctaDescription}
        primaryHref="/contact"
        primaryLabel={c.ctaPrimaryLabel}
        analyticsScope="partners_bottom"
      />
    </>
  );
}
