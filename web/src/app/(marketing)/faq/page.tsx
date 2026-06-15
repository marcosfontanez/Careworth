import { AppJsonLd } from "@/components/json-ld";
import { FaqList } from "@/components/marketing/faq-list";
import { MarketingPageShell } from "@/components/marketing/marketing-page-shell";
import { SectionHeader } from "@/components/marketing/section-header";
import { getMarketingFaqItems } from "@/lib/marketing-copy/faq";
import type { Locale } from "@/lib/i18n";
import { getMarketingLocale } from "@/lib/marketing-locale-server";
import { generateMarketingMetadata } from "@/lib/marketing-seo";
import { faqPageSchema } from "@/lib/structured-data";

export const generateMetadata = () => generateMarketingMetadata("faq");

const faqTitles: Record<Locale, { title: string; description: string }> = {
  en: {
    title: "FAQ",
    description:
      "Quick answers about PulseVerse — download, safety, web beta, PHI, moderation, Sparks, and account deletion.",
  },
  es: {
    title: "Preguntas frecuentes",
    description:
      "Respuestas rápidas sobre PulseVerse: descarga, seguridad, beta web, PHI, moderación, Sparks y eliminación de cuenta.",
  },
};

export default async function FaqPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>;
}) {
  const locale = await getMarketingLocale();
  const { q } = await searchParams;
  const items = getMarketingFaqItems(locale);
  const head = faqTitles[locale];

  return (
    <MarketingPageShell width="tight" breadcrumbPath="/faq">
      <AppJsonLd data={faqPageSchema(items)} />
      <SectionHeader title={head.title} description={head.description} />
      <div className="mt-10">
        <FaqList items={items} highlightQuery={q} />
      </div>
    </MarketingPageShell>
  );
}
