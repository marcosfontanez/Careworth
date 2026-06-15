"use client";

import Link from "next/link";

import { MarketingSecondaryLink } from "@/components/marketing/marketing-cta";
import { Button } from "@/components/ui/button";
import { MARKETING_EVENTS } from "@/lib/marketing-analytics";
import { trackHomepageConversion } from "@/lib/marketing-conversion-tracking";
import type { HomeLandingCopy } from "@/lib/marketing-copy/home-landing";
import { getAndroidOpenTestingUrl, getIosTestflightUrl } from "@/lib/site-constants";
import {
  marketingCtaSecondaryClasses,
  marketingGradientFrame,
  marketingGradientFrameInner,
  marketingGutterX,
  marketingSection,
} from "@/lib/ui-classes";
import { cn } from "@/lib/utils";

type Props = {
  copy: HomeLandingCopy["download"];
};

export function HomeDownloadCta({ copy }: Props) {
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
                {copy.headline}
              </h2>
              <p className="mx-auto mt-4 max-w-2xl text-pretty text-base leading-relaxed text-muted-foreground">
                {copy.body}
              </p>
              <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row sm:flex-wrap">
                <Button size="lg" variant="outline" className={marketingCtaSecondaryClasses} asChild>
                  <a
                    href={iosUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    onClick={() =>
                      trackHomepageConversion(MARKETING_EVENTS.homepageIosBetaClick, {
                        section: "download_band",
                        cta_label: copy.iosCta,
                        destination: iosUrl,
                      })
                    }
                  >
                    {copy.iosCta}
                  </a>
                </Button>
                <Button size="lg" variant="outline" className={marketingCtaSecondaryClasses} asChild>
                  <a
                    href={androidUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    onClick={() =>
                      trackHomepageConversion(MARKETING_EVENTS.homepageAndroidBetaClick, {
                        section: "download_band",
                        cta_label: copy.androidCta,
                        destination: androidUrl,
                      })
                    }
                  >
                    {copy.androidCta}
                  </a>
                </Button>
                <MarketingSecondaryLink
                  href="/web-app"
                  prefetch={false}
                  onClick={() =>
                    trackHomepageConversion(MARKETING_EVENTS.homepageWebBetaClick, {
                      section: "download_band",
                      cta_label: copy.webBetaCta,
                      destination: "/web-app",
                    })
                  }
                >
                  {copy.webBetaCta}
                </MarketingSecondaryLink>
              </div>
              <p className="mx-auto mt-6 max-w-xl text-xs leading-relaxed text-muted-foreground/90">
                {copy.webBetaNote}
              </p>
              <p className="mt-6 text-sm text-muted-foreground">
                <Link
                  href="/support"
                  onClick={() =>
                    trackHomepageConversion(MARKETING_EVENTS.supportCtaClick, {
                      section: "download_band",
                      cta_label: copy.supportLinkLabel,
                      destination: "/support",
                    })
                  }
                  className="font-semibold text-sky-300 underline-offset-4 hover:underline"
                >
                  {copy.supportLinkLabel}
                </Link>
              </p>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
