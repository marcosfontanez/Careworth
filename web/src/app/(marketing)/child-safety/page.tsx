import type { Metadata } from "next";
import type { ReactNode } from "react";
import Link from "next/link";

import { MarketingPageShell } from "@/components/marketing/marketing-page-shell";
import { SectionHeader } from "@/components/marketing/section-header";
import { getChildSafetyPageCopy } from "@/lib/marketing-copy/child-safety-page";
import { getMarketingLocale } from "@/lib/marketing-locale-server";
import { marketingMetadataFor } from "@/lib/marketing-seo";
import { getChildSafetyComplianceEmail } from "@/lib/site-constants";
import { marketingCardMuted, marketingInlineLink } from "@/lib/ui-classes";
import { cn } from "@/lib/utils";

export async function generateMetadata(): Promise<Metadata> {
  const locale = await getMarketingLocale();
  const base = marketingMetadataFor("childSafety", locale);
  const absoluteTitle =
    locale === "es" ? "Normas de seguridad infantil de PulseVerse" : "PulseVerse Child Safety Standards";
  return {
    ...base,
    title: { absolute: absoluteTitle },
    openGraph: base.openGraph ? { ...base.openGraph, title: absoluteTitle } : undefined,
  };
}

function PolicyCard({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className={cn("rounded-2xl p-6 md:p-8", marketingCardMuted)}>
      <h2 className="text-lg font-semibold text-foreground">{title}</h2>
      {children}
    </section>
  );
}

export default async function ChildSafetyPage() {
  const locale = await getMarketingLocale();
  const c = getChildSafetyPageCopy(locale);
  const safetyEmail = getChildSafetyComplianceEmail();

  return (
    <MarketingPageShell width="medium" breadcrumbPath="/child-safety">
      <SectionHeader eyebrow={c.eyebrow} title={c.title} description={c.intro} />
      <p className="mt-4 text-xs text-muted-foreground">{c.lastReviewedLabel}</p>
      <div className="mt-12 grid gap-6">
        <PolicyCard title={c.surfacesTitle}>
          <p className="mt-3 text-sm leading-relaxed text-muted-foreground">{c.surfacesBody}</p>
        </PolicyCard>
        <PolicyCard title={c.zeroToleranceTitle}>
          <p className="mt-3 text-sm leading-relaxed text-muted-foreground">{c.zeroToleranceLead}</p>
          <ul className="mt-4 list-disc space-y-2 pl-5 text-sm leading-relaxed text-muted-foreground">
            {c.zeroToleranceItems.map((item) => (
              <li key={item}>{item}</li>
            ))}
          </ul>
        </PolicyCard>
        <PolicyCard title={c.inAppTitle}>
          <p className="mt-3 text-sm leading-relaxed text-muted-foreground">{c.inAppBody}</p>
        </PolicyCard>
        <PolicyCard title={c.urgentTitle}>
          <p className="mt-3 text-sm leading-relaxed text-muted-foreground">{c.urgentBody}</p>
        </PolicyCard>
        <PolicyCard title={c.reviewTitle}>
          <p className="mt-3 text-sm leading-relaxed text-muted-foreground">{c.reviewBody}</p>
        </PolicyCard>
        <PolicyCard title={c.csamTitle}>
          <p className="mt-3 text-sm leading-relaxed text-muted-foreground">{c.csamBody}</p>
        </PolicyCard>
        <PolicyCard title={c.complianceTitle}>
          <p className="mt-3 text-sm leading-relaxed text-muted-foreground">{c.complianceBody}</p>
        </PolicyCard>
      </div>
      <div className="mt-12 rounded-2xl border border-white/10 bg-white/2 p-8 ring-1 ring-white/4">
        <p className="text-sm font-semibold text-foreground">{c.contactTitle}</p>
        <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
          {c.contactLead}{" "}
          <a href={`mailto:${safetyEmail}`} className={marketingInlineLink}>
            {safetyEmail}
          </a>
          .
        </p>
      </div>
      <div className="mt-12 rounded-2xl border border-white/10 bg-white/2 p-8 ring-1 ring-white/4">
        <p className="text-sm font-semibold text-foreground">{c.relatedTitle}</p>
        <ul className="mt-4 space-y-2 text-sm text-muted-foreground">
          {c.relatedLinks.map((item) => (
            <li key={item.href}>
              <Link href={item.href} className={marketingInlineLink}>
                {item.label}
              </Link>
            </li>
          ))}
        </ul>
      </div>
    </MarketingPageShell>
  );
}
