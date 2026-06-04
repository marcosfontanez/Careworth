import Link from "next/link";
import {
  ArrowRight,
  BarChart3,
  BookOpen,
  Clock,
  Headphones,
  Mail,
  MessageCircle,
  Shield,
  Sparkles,
} from "lucide-react";

import { MarketingBreadcrumbs } from "@/components/marketing/marketing-breadcrumbs";
import { NewsletterSignup } from "@/components/marketing/newsletter-signup";
import { SupportFaqAccordion } from "@/components/marketing/support-faq-accordion";
import { SupportHelpSearch } from "@/components/marketing/support-help-search";
import { Button } from "@/components/ui/button";
import { MarketingPageShell } from "@/components/marketing/marketing-page-shell";
import type { Locale } from "@/lib/i18n";
import { getMarketingFaqItems } from "@/lib/marketing-copy/faq";
import { getSupportCenterCopy } from "@/lib/marketing-copy/support-center";
import { getSupportEmail } from "@/lib/site-constants";
import {
  marketingEyebrow,
  marketingFocusRing,
  marketingGradientFrame,
  marketingGradientFrameInner,
  marketingGutterX,
  marketingInlineLinkStrong,
  marketingSurfaceTile,
} from "@/lib/ui-classes";
import { cn } from "@/lib/utils";

const helpIcons = [BookOpen, Shield, MessageCircle, Sparkles, BarChart3, Headphones] as const;
const contactIcons = [Headphones, Mail, Clock] as const;
const blurbIcons = [Shield, BookOpen, Sparkles] as const;

export function SupportCenterContent({ locale }: { locale: Locale }) {
  const supportEmail = getSupportEmail();
  const faqItems = getMarketingFaqItems(locale);
  const c = getSupportCenterCopy(locale, faqItems, supportEmail);

  return (
    <>
      <MarketingBreadcrumbs path="/support" />
      <section className="relative overflow-hidden pb-16 pt-8 sm:pt-12">
        <div className="pointer-events-none absolute -right-20 top-0 h-80 w-80 rounded-full bg-primary/10 blur-[90px]" />
        <div className={cn(marketingGutterX, "relative grid gap-12 lg:grid-cols-2 lg:items-center")}>
          <div>
            <p className={marketingEyebrow}>{c.eyebrow}</p>
            <h1 className="mt-4 text-4xl font-bold leading-tight tracking-tight text-foreground sm:text-5xl">
              {c.heroTitleBefore}{" "}
              <span className="bg-linear-to-r from-accent to-primary bg-clip-text text-transparent">
                {c.heroTitleAccent}
              </span>
            </h1>
            <SupportHelpSearch
              placeholder={c.searchPlaceholder}
              searchButton={c.searchButton}
              popularLabel={c.popularLabel}
              popularLinks={c.popularLinks}
              faqItems={faqItems}
              helpTiles={c.helpTiles}
              resultsTitle={c.searchResultsTitle}
              noResults={c.searchNoResults}
            />
          </div>
          <div className="relative flex justify-center lg:justify-end">
            <div className="relative h-56 w-56 rounded-3xl border border-white/10 bg-linear-to-br from-slate-900/80 to-primary/20 shadow-[0_24px_80px_-24px_rgba(45,127,249,0.45)] ring-1 ring-primary/25 sm:h-72 sm:w-72">
              <div className="absolute inset-6 rounded-2xl bg-[rgba(5,10,20,0.85)] ring-1 ring-white/10" />
              <MessageCircle className="absolute left-1/2 top-1/2 h-16 w-16 -translate-x-1/2 -translate-y-1/2 text-[var(--accent)] opacity-90" />
            </div>
          </div>
        </div>
      </section>

      <MarketingPageShell className="py-0! pb-20">
        <h2 className="text-2xl font-bold text-foreground">{c.sectionHelpTitle}</h2>
        <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {c.helpTiles.map((tile, i) => {
            const Icon = helpIcons[i] ?? BookOpen;
            return (
              <div key={tile.title} className={cn("rounded-2xl p-6", marketingSurfaceTile)}>
                <div className="flex h-11 w-11 items-center justify-center rounded-full border border-primary/30 bg-primary/10 text-primary">
                  <Icon className="h-5 w-5" />
                </div>
                <h3 className="mt-4 font-semibold text-foreground">{tile.title}</h3>
                <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{tile.body}</p>
                <Link
                  href={tile.href}
                  className={cn("mt-4 inline-flex items-center gap-1 text-sm", marketingInlineLinkStrong, marketingFocusRing, "rounded-md")}
                >
                  {tile.linkLabel}
                  <ArrowRight className="h-4 w-4" />
                </Link>
              </div>
            );
          })}
        </div>

        <div className="mt-16 grid gap-10 lg:grid-cols-[minmax(0,280px)_1fr] lg:gap-14">
          <div>
            <p className={marketingEyebrow}>{c.faqEyebrow}</p>
            <h2 className="mt-2 text-2xl font-bold text-foreground">{c.faqTitle}</h2>
            <Button asChild variant="outline" className="mt-6 border-white/15 bg-transparent">
              <Link href="/faq" className={marketingFocusRing}>
                {c.faqBrowseAll}
              </Link>
            </Button>
          </div>
          <SupportFaqAccordion items={c.faqItemsSubset} />
        </div>

        <div className="mt-20">
          <h2 className="text-2xl font-bold text-foreground">{c.stillTitle}</h2>
          <p className="mt-2 text-muted-foreground">{c.stillBody}</p>
          <div className="mt-8 grid gap-4 md:grid-cols-3">
            {c.contactCards.map((card, i) => {
              const Icon = contactIcons[i] ?? Headphones;
              const inner = (
                <div className={cn("h-full rounded-2xl p-6 transition duration-200 group-hover:border-primary/45", marketingSurfaceTile)}>
                  <Icon className="h-8 w-8 text-primary" />
                  <h3 className="mt-4 font-semibold text-foreground">{card.title}</h3>
                  <p className="mt-2 text-sm text-muted-foreground">{card.body}</p>
                  {card.badge ? (
                    <span className="mt-3 inline-block rounded-full border border-emerald-500/30 bg-emerald-500/10 px-2 py-0.5 text-[10px] font-semibold text-emerald-200">
                      {card.badge}
                    </span>
                  ) : null}
                  <span className="mt-4 inline-flex items-center gap-1 text-sm font-semibold text-primary">
                    {card.cta}
                    <ArrowRight className="h-4 w-4" />
                  </span>
                </div>
              );
              return card.href.startsWith("mailto") ? (
                <a key={card.title} href={card.href} className={cn("group block rounded-2xl", marketingFocusRing)}>
                  {inner}
                </a>
              ) : (
                <Link key={card.title} href={card.href} className={cn("group block rounded-2xl", marketingFocusRing)}>
                  {inner}
                </Link>
              );
            })}
          </div>
        </div>

        <div className="mt-20 grid gap-6 md:grid-cols-3">
          {c.blurbs.map((b, i) => {
            const Icon = blurbIcons[i] ?? Shield;
            return (
              <div key={b.title} className={cn("rounded-2xl p-6", marketingSurfaceTile)}>
                <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl border border-primary/25 bg-primary/10">
                  <Icon className="h-7 w-7 text-primary" />
                </div>
                <h3 className="mt-4 text-center text-lg font-semibold text-foreground">{b.title}</h3>
                <p className="mt-2 text-center text-sm text-muted-foreground">{b.body}</p>
                <Link
                  href={b.href}
                  className={cn("mt-4 block text-center text-sm", marketingInlineLinkStrong, marketingFocusRing, "rounded-md")}
                >
                  {b.linkCta}
                </Link>
              </div>
            );
          })}
        </div>

        <div className={cn(marketingGradientFrame, "mt-16")}>
          <div className={cn(marketingGradientFrameInner, "p-6 sm:p-8")}>
            <h3 className="text-lg font-bold text-foreground">{c.subscribeTitle}</h3>
            <p className="mt-1 text-sm text-muted-foreground">{c.subscribeBody}</p>
            <div className="mt-4 max-w-md">
              <NewsletterSignup source="support" locale={locale} />
            </div>
          </div>
        </div>
      </MarketingPageShell>
    </>
  );
}
