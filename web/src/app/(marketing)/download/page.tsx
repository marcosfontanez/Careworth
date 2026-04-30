import { SectionHeader } from "@/components/marketing/section-header";
import { MarketingDestinationLink } from "@/components/marketing/marketing-destination-link";
import { MarketingPageShell } from "@/components/marketing/marketing-page-shell";
import { Button } from "@/components/ui/button";
import { getDownloadPageCopy } from "@/lib/marketing-copy/download";
import { getMarketingLocale } from "@/lib/marketing-locale-server";
import { generateMarketingMetadata } from "@/lib/marketing-seo";
import { marketingCardMuted, shadowPrimaryCta } from "@/lib/ui-classes";
import { cn } from "@/lib/utils";

export const generateMetadata = () => generateMarketingMetadata("download");

export default async function DownloadPage() {
  const locale = await getMarketingLocale();
  const t = getDownloadPageCopy(locale);

  return (
    <MarketingPageShell width="medium" breadcrumbPath="/download">
      <SectionHeader eyebrow={t.eyebrow} title={t.title} description={t.description} />
      <div className={cn("mt-12 rounded-2xl p-8", marketingCardMuted)}>
        <div className="flex flex-wrap gap-3">
          <Button size="lg" className={cn("bg-primary text-primary-foreground", shadowPrimaryCta)} asChild>
            <MarketingDestinationLink href="/contact" analyticsSource="download_request_invite">
              {t.requestInvite}
            </MarketingDestinationLink>
          </Button>
          <Button size="lg" variant="outline" className="border-white/15" disabled>
            {t.appStoreSoon}
          </Button>
          <Button size="lg" variant="outline" className="border-white/15" disabled>
            {t.playSoon}
          </Button>
        </div>
        <p className="mt-8 text-sm leading-relaxed text-muted-foreground">{t.footnote}</p>
      </div>
    </MarketingPageShell>
  );
}
