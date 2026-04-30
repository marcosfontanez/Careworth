import type { Metadata } from "next";
import Link from "next/link";

import { ContactSuccessTracker } from "@/components/marketing/contact-success-tracker";
import { ContactForm } from "@/components/marketing/contact-form";
import { MarketingPageShell } from "@/components/marketing/marketing-page-shell";
import { SectionHeader } from "@/components/marketing/section-header";
import { Button } from "@/components/ui/button";
import { getContactPageCopy } from "@/lib/marketing-copy/contact";
import { getMarketingLocale } from "@/lib/marketing-locale-server";
import { canonical, m } from "@/lib/page-metadata";

export const metadata: Metadata = { ...m.contact, alternates: canonical("/contact") };

export default async function ContactPage({
  searchParams,
}: {
  searchParams: Promise<{ sent?: string; topic?: string }>;
}) {
  const q = await searchParams;
  const sent = q.sent === "1";
  const topic = typeof q.topic === "string" ? q.topic.slice(0, 64) : "";

  const locale = await getMarketingLocale();
  const t = getContactPageCopy(locale);

  return (
    <MarketingPageShell width="form" breadcrumbPath="/contact">
      <SectionHeader title={t.title} description={t.description} />
      {sent ? (
        <>
          <ContactSuccessTracker />
          <div className="mt-10 space-y-4 rounded-2xl border border-[var(--accent)]/25 bg-[var(--accent)]/5 p-8 text-center">
            <p className="text-lg font-semibold text-foreground">{t.successTitle}</p>
            <p className="text-sm text-muted-foreground">{t.successBody}</p>
            <Button asChild variant="outline" className="mt-2 border-white/20">
              <Link href="/">{t.backHome}</Link>
            </Button>
          </div>
        </>
      ) : (
        <ContactForm initialTopic={topic} locale={locale} />
      )}
    </MarketingPageShell>
  );
}
