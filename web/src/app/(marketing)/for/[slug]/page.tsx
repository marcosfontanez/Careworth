import { notFound } from "next/navigation";

import { AnswerPageLanding, type RelatedLink } from "@/components/marketing/answer-page-landing";
import { MarketingPageShell } from "@/components/marketing/marketing-page-shell";
import type { Locale } from "@/lib/i18n";
import {
  answerPageMetadata,
  answerPagePath,
  getAnswerPage,
  getAnswerPages,
  getAnswerSlugs,
} from "@/lib/marketing-copy/answer-pages";
import { getMarketingLocale } from "@/lib/marketing-locale-server";

export function generateStaticParams() {
  return getAnswerSlugs("for").map((slug) => ({ slug }));
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const locale = await getMarketingLocale();
  const page = getAnswerPage("for", slug, locale);
  return page ? answerPageMetadata(page, locale) : {};
}

const labels: Record<Locale, { primary: string; secondary: string; related: string }> = {
  en: { primary: "Join PulseVerse", secondary: "Explore features", related: "More for your role" },
  es: { primary: "Únete a PulseVerse", secondary: "Ver funciones", related: "Más para tu rol" },
};

export default async function ForRolePage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const locale = await getMarketingLocale();
  const page = getAnswerPage("for", slug, locale);
  if (!page) notFound();

  const t = labels[locale];
  const related: RelatedLink[] = getAnswerPages("for", locale)
    .filter((p) => p.slug !== slug)
    .map((p) => ({ label: p.eyebrow, href: answerPagePath("for", p.slug) }));

  return (
    <MarketingPageShell breadcrumbPath={answerPagePath("for", slug)}>
      <AnswerPageLanding
        page={page}
        related={related}
        relatedTitle={t.related}
        ctaPrimaryLabel={t.primary}
        ctaSecondaryLabel={t.secondary}
      />
    </MarketingPageShell>
  );
}
