import Image from "next/image";
import Link from "next/link";

import { SectionHeader } from "@/components/marketing/section-header";
import { MarketingDestinationLink } from "@/components/marketing/marketing-destination-link";
import { MarketingPageShell } from "@/components/marketing/marketing-page-shell";
import { Button } from "@/components/ui/button";
import { getDownloadPageCopy } from "@/lib/marketing-copy/download";
import { getMarketingLocale } from "@/lib/marketing-locale-server";
import { generateMarketingMetadata } from "@/lib/marketing-seo";
import { getAndroidOpenTestingUrl, getIosTestflightUrl } from "@/lib/site-constants";
import { marketingCardMuted, marketingInlineLink, shadowPrimaryCta } from "@/lib/ui-classes";
import { cn } from "@/lib/utils";

export const generateMetadata = () => generateMarketingMetadata("download");

export default async function DownloadPage() {
  const locale = await getMarketingLocale();
  const t = getDownloadPageCopy(locale);
  const iosUrl = getIosTestflightUrl();
  const androidUrl = getAndroidOpenTestingUrl();
  const showBetaHelp = Boolean(iosUrl || androidUrl);

  return (
    <MarketingPageShell width="medium" breadcrumbPath="/download">
      <div className="scroll-mt-24" id="beta">
        <SectionHeader eyebrow={t.eyebrow} title={t.title} description={t.description} />
      </div>

      <div className="mt-12 grid gap-12 lg:grid-cols-2 lg:items-center">
        <div className="relative mx-auto w-full max-w-[min(100%,340px)] lg:justify-self-start">
          <div
            className={cn(
              "relative aspect-[941/1672] overflow-hidden rounded-[2rem] border border-white/10 bg-[rgba(8,14,26,0.72)] ring-1 ring-white/[0.04] backdrop-blur-md",
              "shadow-[0_50px_140px_-36px_rgba(20,184,166,0.42),0_28px_70px_-24px_rgba(45,127,249,0.28)]",
            )}
          >
            <div
              aria-hidden
              className="pointer-events-none absolute inset-x-10 top-0 z-10 h-px bg-gradient-to-r from-transparent via-[var(--accent)]/70 to-transparent opacity-90"
            />
            <Image
              src="/marketing/shop-mobile-frame.png"
              alt="PulseVerse mobile Pulse Shop interface inside a phone frame with teal accent highlights."
              fill
              priority
              className="object-cover object-top"
              sizes="(max-width: 1024px) 72vw, 340px"
            />
          </div>
        </div>

        <div className={cn("rounded-2xl p-8", marketingCardMuted)}>
          <div className="flex flex-wrap gap-3">
            <Button size="lg" className={cn("bg-primary text-primary-foreground", shadowPrimaryCta)} asChild>
              <MarketingDestinationLink href="/contact" analyticsSource="download_request_invite">
                {t.requestInvite}
              </MarketingDestinationLink>
            </Button>
            {iosUrl ? (
              <Button size="lg" variant="outline" className="border-white/15 bg-white/[0.03]" asChild>
                <a href={iosUrl} target="_blank" rel="noopener noreferrer">
                  {t.iosBetaCta}
                </a>
              </Button>
            ) : (
              <Button size="lg" variant="outline" className="border-white/15" disabled>
                {t.appStoreSoon}
              </Button>
            )}
            {androidUrl ? (
              <Button size="lg" variant="outline" className="border-white/15 bg-white/[0.03]" asChild>
                <a href={androidUrl} target="_blank" rel="noopener noreferrer">
                  {t.androidBetaCta}
                </a>
              </Button>
            ) : (
              <Button size="lg" variant="outline" className="border-white/15" disabled>
                {t.playSoon}
              </Button>
            )}
          </div>

          {showBetaHelp ? (
            <div className="mt-10 border-t border-white/10 pt-8">
              <p className="text-sm font-semibold text-foreground">{t.betaStepsTitle}</p>
              <ol className="mt-4 list-decimal space-y-3 pl-5 text-sm leading-relaxed text-muted-foreground">
                {t.betaSteps.map((step) => (
                  <li key={step}>{step}</li>
                ))}
              </ol>
              <p className="mt-6 text-sm leading-relaxed text-muted-foreground">
                {t.faqHintBefore}{" "}
                <Link href="/faq" className={marketingInlineLink}>
                  {t.faqLinkLabel}
                </Link>{" "}
                {t.faqHintAfter}
              </p>
            </div>
          ) : null}

          <p className="mt-8 text-sm leading-relaxed text-muted-foreground">{t.footnote}</p>
        </div>
      </div>
    </MarketingPageShell>
  );
}
