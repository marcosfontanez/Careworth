import Link from "next/link";

import { BetaAccessButtons } from "@/components/marketing/beta-access-buttons";
import { SectionHeader } from "@/components/marketing/section-header";
import { MarketingPageShell } from "@/components/marketing/marketing-page-shell";
import { PosterFrame } from "@/components/marketing/website-visuals";
import { getDownloadPageCopy } from "@/lib/marketing-copy/download";
import { getMarketingLocale } from "@/lib/marketing-locale-server";
import { generateMarketingMetadata } from "@/lib/marketing-seo";
import { marketingElevatedFrame, marketingFocusRing, marketingInlineLink } from "@/lib/ui-classes";
import { cn } from "@/lib/utils";

export const generateMetadata = () => generateMarketingMetadata("download");

export default async function DownloadPage() {
  const locale = await getMarketingLocale();
  const t = getDownloadPageCopy(locale);

  return (
    <MarketingPageShell width="medium" breadcrumbPath="/download">
      <div className="scroll-mt-24" id="beta">
        <SectionHeader eyebrow={t.eyebrow} title={t.title} description={t.description} />
      </div>

      <div className="mt-8 sm:mt-10">
        <PosterFrame
          src="/marketing/marketing-download-early-access.png"
          alt={t.earlyAccessHeroAlt}
          width={1024}
          height={576}
          priority
          glow="cyan"
          tag={{ label: t.eyebrow, tone: "cyan" }}
          sizes="(max-width: 768px) 100vw, min(1024px, 92vw)"
          cornerTrace={false}
        />
      </div>

      <div className={cn("mx-auto mt-10 max-w-2xl rounded-2xl p-6 sm:p-8", marketingElevatedFrame)}>
        <BetaAccessButtons locale={locale} showRequestInvite className="justify-center" />

        <div className="mt-10 border-t border-white/10 pt-8">
          <p className="text-sm font-semibold text-foreground">{t.betaStepsTitle}</p>
          <ol className="mt-4 list-decimal space-y-3 pl-5 text-sm leading-relaxed text-muted-foreground">
            {t.betaSteps.map((step) => (
              <li key={step}>{step}</li>
            ))}
          </ol>
          <p className="mt-6 text-sm leading-relaxed text-muted-foreground">
            {t.faqHintBefore}{" "}
            <Link href="/faq" className={cn(marketingInlineLink, marketingFocusRing, "rounded-sm")}>
              {t.faqLinkLabel}
            </Link>{" "}
            {t.faqHintAfter}
          </p>
        </div>

        <p className="mt-8 text-center text-sm leading-relaxed text-muted-foreground">{t.footnote}</p>
      </div>
    </MarketingPageShell>
  );
}
