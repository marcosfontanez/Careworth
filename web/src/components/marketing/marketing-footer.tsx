import Link from "next/link";

import { MarketingLogo } from "@/components/marketing/marketing-logo";
import { MarketingLocaleSwitcher } from "@/components/marketing/marketing-locale-switcher";
import { NewsletterSignup } from "@/components/marketing/newsletter-signup";
import { site } from "@/lib/design-tokens";
import type { Locale } from "@/lib/i18n";
import { getFooterCopy } from "@/lib/marketing-copy/footer";
import { getSiteMarketingDescription } from "@/lib/marketing-copy/site";
import {
  getAndroidOpenTestingUrl,
  getIosTestflightUrl,
  legalDocumentsLastUpdatedDisplay,
} from "@/lib/site-constants";
import { marketingFocusRing, marketingGutterX, marketingInlineLink } from "@/lib/ui-classes";
import { cn } from "@/lib/utils";

export function MarketingFooter({ locale }: { locale: Locale }) {
  const c = getFooterCopy(locale);
  const legalLine = c.legalBlurb.replace("{date}", legalDocumentsLastUpdatedDisplay);
  const iosUrl = getIosTestflightUrl();
  const androidUrl = getAndroidOpenTestingUrl();

  return (
    <footer className="overflow-x-clip border-t border-[rgba(148,163,184,0.1)] bg-pv-navy-deep">
      <div className={cn(marketingGutterX, "py-10 sm:py-14")}>
        <div className="grid gap-10 lg:grid-cols-[minmax(0,1.15fr)_repeat(4,minmax(0,1fr))] lg:gap-x-8 lg:gap-y-10">
          <div className="min-w-0 lg:max-w-sm">
            <MarketingLogo variant="footer" />
            <p className="mt-3 text-sm leading-relaxed text-muted-foreground">{getSiteMarketingDescription(locale)}</p>
          </div>
          {c.columns.map((col) => {
            const navId = `footer-nav-${col.title.replace(/\s+/g, "-").toLowerCase()}`;
            return (
              <div key={col.title} className="min-w-0">
                <p id={navId} className="text-sm font-semibold text-foreground">
                  {col.title}
                </p>
                <nav className="mt-3" aria-labelledby={navId}>
                  <ul className="space-y-2">
                    {col.links.map((l) => (
                      <li key={`${col.title}-${l.label}`}>
                        <Link
                          href={l.href}
                          prefetch={l.href.startsWith("/web-app") ? false : undefined}
                          className={cn(
                            "text-sm text-muted-foreground transition hover:text-primary",
                            marketingFocusRing,
                            "rounded-sm",
                          )}
                        >
                          {l.label}
                        </Link>
                      </li>
                    ))}
                  </ul>
                </nav>
              </div>
            );
          })}
        </div>

        <div className="mt-10 grid gap-8 border-t border-white/10 pt-10 lg:grid-cols-[minmax(0,1fr)_auto] lg:items-start lg:gap-12">
          <div className="min-w-0">
            <p className="text-sm font-semibold text-foreground">{c.stayConnectedTitle}</p>
            <p className="mt-1.5 text-sm text-muted-foreground">{c.stayConnectedBlurb}</p>
            <div role="group" aria-label="Newsletter signup">
              <NewsletterSignup source="footer" locale={locale} />
            </div>
          </div>
          <div className="min-w-0 lg:max-w-xs">
            <p className="text-sm font-semibold text-foreground">{c.getAppTitle}</p>
            <div className="mt-3 flex flex-col gap-2 sm:flex-row lg:flex-col">
              <a
                href={iosUrl}
                target="_blank"
                rel="noopener noreferrer"
                className={cn(
                  "inline-flex items-center justify-center rounded-full border border-white/15 bg-white/4 px-4 py-2.5 text-sm font-semibold text-foreground transition hover:border-accent/40 hover:text-accent",
                  marketingFocusRing,
                )}
              >
                {c.iosBeta}
              </a>
              <a
                href={androidUrl}
                target="_blank"
                rel="noopener noreferrer"
                className={cn(
                  "inline-flex items-center justify-center rounded-full border border-white/15 bg-white/4 px-4 py-2.5 text-sm font-semibold text-foreground transition hover:border-accent/40 hover:text-accent",
                  marketingFocusRing,
                )}
              >
                {c.androidBeta}
              </a>
              <Link
                href="/download"
                className={cn("text-center text-xs text-muted-foreground hover:text-accent lg:text-left", marketingFocusRing, "rounded-sm")}
              >
                {c.viewDownloadPage}
              </Link>
            </div>
          </div>
        </div>

        <div className="mt-10 flex flex-col gap-6 border-t border-white/10 pt-8 lg:flex-row lg:items-start lg:justify-between">
          <div className="min-w-0 max-w-3xl space-y-3 text-center lg:text-left">
            <p className="text-sm leading-relaxed text-muted-foreground">{c.phiBody}</p>
            <p className="text-xs text-muted-foreground/90">{legalLine}</p>
          </div>
          <div className="flex shrink-0 flex-col items-center gap-4 lg:items-end">
            <MarketingLocaleSwitcher locale={locale} />
            <div className="flex flex-wrap items-center justify-center gap-x-6 gap-y-2 lg:justify-end">
              <Link href="/privacy" className={marketingInlineLink}>
                {c.privacy}
              </Link>
              <Link href="/terms" className={marketingInlineLink}>
                {c.terms}
              </Link>
            </div>
            <p className="text-xs text-muted-foreground">
              © {new Date().getFullYear()} {site.name}. {c.rights}
            </p>
          </div>
        </div>
      </div>
    </footer>
  );
}
