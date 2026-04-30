import type { Metadata } from "next";

import { AppJsonLd } from "@/components/json-ld";
import { FaqAccordion } from "@/components/marketing/faq-accordion";
import { MarketingPageShell } from "@/components/marketing/marketing-page-shell";
import { SectionHeader } from "@/components/marketing/section-header";
import { getMarketingFaqItems } from "@/lib/marketing-copy/faq";
import type { Locale } from "@/lib/i18n";
import { getMarketingLocale } from "@/lib/marketing-locale-server";
import { marketingCardMuted } from "@/lib/ui-classes";
import { canonical, m } from "@/lib/page-metadata";
import { faqPageSchema } from "@/lib/structured-data";
import { cn } from "@/lib/utils";

export const metadata: Metadata = { ...m.faq, alternates: canonical("/faq") };

const faqTitles: Record<Locale, { title: string; description: string }> = {
  en: { title: "FAQ", description: "Quick answers for professionals considering PulseVerse." },
  es: { title: "Preguntas frecuentes", description: "Respuestas rápidas para profes que valoran PulseVerse." },
};

export default async function FaqPage() {
  const locale = await getMarketingLocale();
  const items = getMarketingFaqItems(locale);
  const head = faqTitles[locale];

  return (
    <MarketingPageShell width="tight" breadcrumbPath="/faq">
      <AppJsonLd data={faqPageSchema(items)} />
      <SectionHeader title={head.title} description={head.description} />
      <div className={cn("mt-10 rounded-2xl border border-white/10 p-4 ring-1 ring-white/[0.04] sm:p-6", marketingCardMuted)}>
        <FaqAccordion items={items} />
      </div>
    </MarketingPageShell>
  );
}
