import Link from "next/link";
import { MarketingLogo } from "@/components/marketing/marketing-logo";
import { MarketingLocaleSwitcher } from "@/components/marketing/marketing-locale-switcher";
import { NewsletterSignup } from "@/components/marketing/newsletter-signup";
import { site } from "@/lib/design-tokens";
import type { Locale } from "@/lib/i18n";
import { getFooterCopy } from "@/lib/marketing-copy/footer";
import { getSiteMarketingDescription } from "@/lib/marketing-copy/site";
import { legalDocumentsLastUpdatedDisplay } from "@/lib/site-constants";
import { marketingGutterX, marketingInlineLink } from "@/lib/ui-classes";
import { cn } from "@/lib/utils";

export function MarketingFooter({ locale }: { locale: Locale }) {
  const c = getFooterCopy(locale);
  const legalLine = c.legalBlurb.replace("{date}", legalDocumentsLastUpdatedDisplay);

  return (
    <footer className="border-t border-[rgba(148,163,184,0.1)] bg-[#030712]">
      <div className={cn(marketingGutterX, "py-14 sm:py-16")}>
        <div className="grid gap-12 sm:grid-cols-2 lg:grid-cols-6">
          <div className="sm:col-span-2 lg:col-span-2">
            <MarketingLogo />
            <p className="mt-4 max-w-xs text-sm leading-relaxed text-muted-foreground">
              {getSiteMarketingDescription(locale)}
            </p>
          </div>
          {c.columns.map((col) => {
            const navId = `footer-nav-${col.title.replace(/\s+/g, "-").toLowerCase()}`;
            return (
              <div key={col.title} className="lg:col-span-1">
                <p id={navId} className="text-sm font-semibold text-foreground">
                  {col.title}
                </p>
                <nav className="mt-4" aria-labelledby={navId}>
                  <ul className="space-y-2.5">
                    {col.links.map((l) => (
                      <li key={`${col.title}-${l.label}`}>
                        <Link href={l.href} className="text-sm text-muted-foreground transition hover:text-primary">
                          {l.label}
                        </Link>
                      </li>
                    ))}
                  </ul>
                </nav>
              </div>
            );
          })}
          <div className="sm:col-span-2 lg:col-span-2">
            <p className="text-sm font-semibold text-foreground">{c.stayConnectedTitle}</p>
            <p className="mt-2 text-sm text-muted-foreground">{c.stayConnectedBlurb}</p>
            <div role="group" aria-label="Newsletter signup">
              <NewsletterSignup source="footer" locale={locale} />
            </div>
          </div>
        </div>
        <div className="mt-14 flex flex-col items-center justify-between gap-4 border-t border-white/10 pt-8 text-center text-sm text-muted-foreground sm:flex-row sm:text-left">
          <div className="max-w-3xl space-y-2">
            <p>
              <strong className="font-medium text-foreground">{c.phiLead}</strong> {site.name} {c.phiBody}{" "}
              <Link href="/faq" className={marketingInlineLink}>
                {c.phiFaq}
              </Link>{" "}
              {c.phiBetween}{" "}
              <Link href="/community-guidelines" className={marketingInlineLink}>
                {c.phiGuidelines}
              </Link>
              .
            </p>
            <p className="text-xs text-muted-foreground/90">{legalLine}</p>
          </div>
          <div className="flex flex-col gap-4 sm:items-end">
            <div className="flex flex-wrap items-center justify-center gap-4 sm:justify-end">
              <MarketingLocaleSwitcher locale={locale} />
              <div className="flex gap-8">
                <Link href="/privacy" className={marketingInlineLink}>
                  {c.privacy}
                </Link>
                <Link href="/terms" className={marketingInlineLink}>
                  {c.terms}
                </Link>
              </div>
            </div>
            <p className="text-xs sm:text-right">
              © {new Date().getFullYear()} {site.name}. {c.rights}
            </p>
          </div>
        </div>
      </div>
    </footer>
  );
}
