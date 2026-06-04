import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight } from "lucide-react";

import { MarketingPageShell } from "@/components/marketing/marketing-page-shell";
import { SectionHeader } from "@/components/marketing/section-header";
import type { Locale } from "@/lib/i18n";
import { answerPagePath, getAnswerPages } from "@/lib/marketing-copy/answer-pages";
import { getMarketingLocale } from "@/lib/marketing-locale-server";
import { canonical } from "@/lib/page-metadata";
import { marketingCardInteractive } from "@/lib/ui-classes";
import { cn } from "@/lib/utils";

const head: Record<Locale, { title: string; description: string }> = {
  en: {
    title: "Compare PulseVerse",
    description: "How PulseVerse compares to other apps when you want a social space built for healthcare workers.",
  },
  es: {
    title: "Compara PulseVerse",
    description: "Cómo se compara PulseVerse con otras apps cuando quieres un espacio social hecho para sanitarios.",
  },
};

export async function generateMetadata(): Promise<Metadata> {
  const locale = await getMarketingLocale();
  const h = head[locale];
  return {
    title: h.title,
    description: h.description,
    alternates: canonical("/compare"),
  };
}

export default async function CompareIndexPage() {
  const locale = await getMarketingLocale();
  const h = head[locale];
  const pages = getAnswerPages("compare", locale);

  return (
    <MarketingPageShell breadcrumbPath="/compare">
      <SectionHeader title={h.title} description={h.description} />
      <ul className="mt-10 grid gap-4 sm:grid-cols-2">
        {pages.map((p) => (
          <li key={p.slug}>
            <Link
              href={answerPagePath("compare", p.slug)}
              className={cn("group flex h-full flex-col rounded-2xl p-6", marketingCardInteractive)}
            >
              <p className="text-xs font-semibold uppercase tracking-wider text-[var(--accent)]">{p.eyebrow}</p>
              <h2 className="mt-2 text-lg font-bold text-foreground">{p.h1}</h2>
              <p className="mt-2 line-clamp-3 flex-1 text-sm text-muted-foreground">{p.metaDescription}</p>
              <span className="mt-4 inline-flex items-center gap-1 text-sm font-semibold text-sky-300">
                Read
                <ArrowRight className="h-4 w-4 transition group-hover:translate-x-0.5" aria-hidden />
              </span>
            </Link>
          </li>
        ))}
      </ul>
    </MarketingPageShell>
  );
}
