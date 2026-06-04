import Link from "next/link";
import { ArrowRight, Check, Sparkles } from "lucide-react";

import { AppJsonLd } from "@/components/json-ld";
import { CtaSection } from "@/components/marketing/cta-section";
import { FaqAccordion } from "@/components/marketing/faq-accordion";
import { Button } from "@/components/ui/button";
import type { AnswerPage } from "@/lib/marketing-copy/answer-pages";
import { faqPageSchema } from "@/lib/structured-data";
import {
  marketingCardMuted,
  marketingEyebrow,
  marketingInlineLinkStrong,
  shadowPrimaryCta,
} from "@/lib/ui-classes";
import { cn } from "@/lib/utils";

export type RelatedLink = { label: string; href: string };

export function AnswerPageLanding({
  page,
  related,
  relatedTitle,
  ctaPrimaryLabel,
  ctaSecondaryLabel,
}: {
  page: AnswerPage;
  related: RelatedLink[];
  relatedTitle: string;
  ctaPrimaryLabel: string;
  ctaSecondaryLabel: string;
}) {
  return (
    <>
      <AppJsonLd data={faqPageSchema(page.faqs)} />

      {/* Hero */}
      <section className="mx-auto max-w-3xl text-center">
        <p className={cn(marketingEyebrow, "tracking-widest")}>{page.eyebrow}</p>
        <h1 className="mt-3 text-balance text-4xl font-bold leading-[1.08] tracking-tight text-foreground sm:text-5xl">
          {page.h1}
        </h1>
      </section>

      {/* The AI-quotable answer block */}
      <section className="mx-auto mt-8 max-w-3xl">
        <div
          className={cn(
            "relative rounded-2xl border border-primary/25 p-5 ring-1 ring-white/5 sm:p-6",
            marketingCardMuted,
          )}
        >
          <Sparkles className="absolute right-5 top-5 h-5 w-5 text-primary/70" aria-hidden />
          <p className="pr-8 text-pretty text-lg leading-relaxed text-foreground">{page.answer}</p>
        </div>
        <div className="mt-7 flex flex-wrap justify-center gap-3">
          <Button
            asChild
            className={cn("h-12 rounded-full px-7 font-semibold", shadowPrimaryCta, "bg-primary text-primary-foreground")}
          >
            <Link href="/download" className="inline-flex items-center gap-2">
              {ctaPrimaryLabel}
              <ArrowRight className="h-4 w-4" aria-hidden />
            </Link>
          </Button>
          <Button
            asChild
            variant="outline"
            className="h-12 rounded-full border-white/20 bg-transparent px-7 font-semibold text-foreground hover:bg-white/5"
          >
            <Link href="/features">{ctaSecondaryLabel}</Link>
          </Button>
        </div>
      </section>

      {/* Why bullets */}
      <section className="mx-auto mt-12 max-w-3xl">
        <ul className="grid gap-3 sm:grid-cols-2">
          {page.bullets.map((line) => (
            <li
              key={line}
              className={cn("flex gap-3 rounded-xl border border-white/8 p-4 text-sm text-muted-foreground", marketingCardMuted)}
            >
              <Check className="mt-0.5 h-4 w-4 shrink-0 text-primary" aria-hidden />
              <span className="text-pretty">{line}</span>
            </li>
          ))}
        </ul>
      </section>

      {/* Comparison table */}
      {page.comparison ? (
        <section className="mx-auto mt-12 max-w-3xl">
          <div className={cn("overflow-hidden rounded-2xl border border-white/10", marketingCardMuted)}>
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b border-white/10 text-xs uppercase tracking-wider text-muted-foreground">
                  <th className="px-4 py-3 font-semibold" scope="col">
                    <span className="sr-only">Feature</span>
                  </th>
                  <th className="px-4 py-3 font-semibold text-primary" scope="col">
                    PulseVerse
                  </th>
                  <th className="px-4 py-3 font-semibold" scope="col">
                    {page.comparison.otherName}
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/6">
                {page.comparison.rows.map((row) => (
                  <tr key={row.label}>
                    <th scope="row" className="px-4 py-3 font-medium text-foreground">
                      {row.label}
                    </th>
                    <td className="px-4 py-3 text-foreground">{row.pulseverse}</td>
                    <td className="px-4 py-3 text-muted-foreground">{row.other}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      ) : null}

      {/* FAQ */}
      <section className="mx-auto mt-14 max-w-3xl">
        <h2 className="text-2xl font-bold tracking-tight text-foreground">FAQ</h2>
        <div className={cn("mt-5 rounded-2xl border border-white/10 p-4 ring-1 ring-white/4 sm:p-6", marketingCardMuted)}>
          <FaqAccordion items={page.faqs} />
        </div>
      </section>

      {/* Related */}
      {related.length > 0 ? (
        <section className="mx-auto mt-14 max-w-3xl">
          <h2 className="text-sm font-semibold uppercase tracking-wider text-[var(--accent)]">{relatedTitle}</h2>
          <ul className="mt-4 flex flex-wrap gap-3">
            {related.map((link) => (
              <li key={link.href}>
                <Link
                  href={link.href}
                  className={cn("inline-flex items-center gap-1 text-sm", marketingInlineLinkStrong)}
                >
                  {link.label}
                  <ArrowRight className="h-3.5 w-3.5" aria-hidden />
                </Link>
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      <div className="mt-16">
        <CtaSection
          title={page.ctaTitle}
          description={page.ctaDescription}
          primaryHref="/download"
          primaryLabel={ctaPrimaryLabel}
          secondaryHref="/contact"
          secondaryLabel={ctaSecondaryLabel}
        />
      </div>
    </>
  );
}
