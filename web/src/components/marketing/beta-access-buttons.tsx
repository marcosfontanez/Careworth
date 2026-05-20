import { MarketingDestinationLink } from "@/components/marketing/marketing-destination-link";
import { Button } from "@/components/ui/button";
import type { Locale } from "@/lib/i18n";
import { getDownloadPageCopy } from "@/lib/marketing-copy/download";
import { getAndroidOpenTestingUrl, getIosTestflightUrl } from "@/lib/site-constants";
import { shadowPrimaryCta } from "@/lib/ui-classes";
import { cn } from "@/lib/utils";

type BetaAccessButtonsProps = {
  locale: Locale;
  /** Show the primary “Request invite” button (download page only). */
  showRequestInvite?: boolean;
  className?: string;
  /** Passed to MarketingDestinationLink when request invite is shown. */
  requestInviteAnalyticsSource?: string;
};

/**
 * iOS TestFlight + Google Play open testing CTAs — shared on /download, home, support.
 */
export function BetaAccessButtons({
  locale,
  showRequestInvite = false,
  className,
  requestInviteAnalyticsSource = "download_request_invite",
}: BetaAccessButtonsProps) {
  const t = getDownloadPageCopy(locale);
  const iosUrl = getIosTestflightUrl();
  const androidUrl = getAndroidOpenTestingUrl();

  return (
    <div className={cn("flex flex-wrap justify-center gap-3", className)}>
      {showRequestInvite ? (
        <Button size="lg" className={cn("bg-primary text-primary-foreground", shadowPrimaryCta)} asChild>
          <MarketingDestinationLink href="/contact" analyticsSource={requestInviteAnalyticsSource}>
            {t.requestInvite}
          </MarketingDestinationLink>
        </Button>
      ) : null}
      <Button size="lg" variant="outline" className="border-white/15 bg-white/3" asChild>
        <a href={iosUrl} target="_blank" rel="noopener noreferrer">
          {t.iosBetaCta}
        </a>
      </Button>
      <Button size="lg" variant="outline" className="border-white/15 bg-white/3" asChild>
        <a href={androidUrl} target="_blank" rel="noopener noreferrer">
          {t.androidBetaCta}
        </a>
      </Button>
    </div>
  );
}
