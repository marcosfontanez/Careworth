import Link from "next/link";

import { MarketingSecondaryLink } from "@/components/marketing/marketing-cta";
import { Button } from "@/components/ui/button";
import type { Locale } from "@/lib/i18n";
import { getHomeLandingCopy } from "@/lib/marketing-copy/home-landing";
import { getAndroidOpenTestingUrl, getIosTestflightUrl } from "@/lib/site-constants";
import {
  marketingCtaSecondaryClasses,
  marketingGradientFrame,
  marketingGradientFrameInner,
  marketingGutterX,
  marketingSection,
} from "@/lib/ui-classes";
import { cn } from "@/lib/utils";

export function HomeDownloadCta({ locale }: { locale: Locale }) {
  const c = getHomeLandingCopy(locale).download;
  const iosUrl = getIosTestflightUrl();
  const androidUrl = getAndroidOpenTestingUrl();

  return (
    <section className={cn(marketingSection, "pb-20 sm:pb-24")}>
      <div className={marketingGutterX}>
        <div className={marketingGradientFrame}>
          <div className={cn(marketingGradientFrameInner, "px-6 py-10 text-center sm:px-12 sm:py-14")}>
            <div
              aria-hidden
              className="pointer-events-none absolute inset-0 opacity-50"
              style={{
                background:
                  "radial-gradient(ellipse 70% 60% at 50% 0%, rgba(45,127,249,0.35), transparent 55%), radial-gradient(ellipse 50% 50% at 80% 100%, rgba(20,184,166,0.18), transparent 55%)",
              }}
            />
            <div className="relative">
              <h2 className="font-heading text-[2rem] font-bold tracking-tight text-foreground sm:text-[2.5rem]">
                {c.headline}
              </h2>
              <p className="mx-auto mt-4 max-w-2xl text-pretty text-base leading-relaxed text-muted-foreground">
                {c.body}
              </p>
              <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row sm:flex-wrap">
                <Button size="lg" variant="outline" className={marketingCtaSecondaryClasses} asChild>
                  <a href={iosUrl} target="_blank" rel="noopener noreferrer">
                    {c.iosCta}
                  </a>
                </Button>
                <Button size="lg" variant="outline" className={marketingCtaSecondaryClasses} asChild>
                  <a href={androidUrl} target="_blank" rel="noopener noreferrer">
                    {c.androidCta}
                  </a>
                </Button>
                <MarketingSecondaryLink href="/web-app" prefetch={false}>
                  {c.webBetaCta}
                </MarketingSecondaryLink>
              </div>
              <p className="mx-auto mt-6 max-w-xl text-xs leading-relaxed text-muted-foreground/90">
                {c.webBetaNote}
              </p>
              <p className="mt-6 text-sm text-muted-foreground">
                <Link href="/contact" className="font-semibold text-sky-300 underline-offset-4 hover:underline">
                  Need help getting access?
                </Link>
              </p>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
