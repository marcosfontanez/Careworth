"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useState } from "react";

import { MarketingSecondaryLink } from "@/components/marketing/marketing-cta";
import { Button } from "@/components/ui/button";
import type { DownloadPageCopy } from "@/lib/marketing-copy/download";
import { getAndroidOpenTestingUrl, getIosTestflightUrl } from "@/lib/site-constants";
import { getPublicSiteUrl } from "@/lib/site-url";
import { marketingCtaPrimaryClasses, marketingCtaSecondaryClasses, marketingInlineLink } from "@/lib/ui-classes";
import { cn } from "@/lib/utils";

type Props = {
  copy: DownloadPageCopy;
  showRequestInvite?: boolean;
  className?: string;
};

function detectDeviceHint(copy: DownloadPageCopy): string {
  if (typeof navigator === "undefined") return copy.deviceHintDesktop;
  const ua = navigator.userAgent;
  if (/iPad|iPhone|iPod/.test(ua)) return copy.deviceHintIos;
  if (/Android/.test(ua)) return copy.deviceHintAndroid;
  return copy.deviceHintDesktop;
}

/** iOS TestFlight + Android open testing + web beta — shared on /download and support. */
export function DownloadAccessPanel({ copy, showRequestInvite = false, className }: Props) {
  const iosUrl = getIosTestflightUrl();
  const androidUrl = getAndroidOpenTestingUrl();
  const downloadUrl = `${getPublicSiteUrl()}/download`;
  const [deviceHint, setDeviceHint] = useState(copy.deviceHintDesktop);

  useEffect(() => {
    setDeviceHint(detectDeviceHint(copy));
  }, [copy]);

  return (
    <div className={cn("flex flex-col gap-6", className)}>
      <p className="text-center text-sm leading-relaxed text-muted-foreground">{deviceHint}</p>

      <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:justify-center">
        {showRequestInvite ? (
          <Button size="lg" className={marketingCtaPrimaryClasses} asChild>
            <Link href="/contact">{copy.requestInvite}</Link>
          </Button>
        ) : null}
        <Button size="lg" variant="outline" className={marketingCtaSecondaryClasses} asChild>
          <a href={iosUrl} target="_blank" rel="noopener noreferrer">
            {copy.iosBetaCta}
          </a>
        </Button>
        <Button size="lg" variant="outline" className={marketingCtaSecondaryClasses} asChild>
          <a href={androidUrl} target="_blank" rel="noopener noreferrer">
            {copy.androidBetaCta}
          </a>
        </Button>
        <MarketingSecondaryLink href="/web-app" prefetch={false}>
          {copy.webBetaCta}
        </MarketingSecondaryLink>
      </div>

      <div className="mx-auto grid w-full max-w-md gap-4 rounded-2xl border border-white/10 bg-[rgba(12,21,36,0.55)] p-5 ring-1 ring-white/4 sm:grid-cols-[auto_1fr] sm:items-center sm:gap-5">
        <div className="mx-auto shrink-0 rounded-xl border border-white/10 bg-white p-2 shadow-[0_0_40px_-12px_rgba(20,184,166,0.35)]">
          <Image
            src="/marketing/download-qr.png"
            alt={`QR code for ${downloadUrl}`}
            width={160}
            height={160}
            className="h-36 w-36"
          />
        </div>
        <div className="text-center sm:text-left">
          <p className="text-sm font-semibold text-foreground">{copy.qrTitle}</p>
          <p className="mt-1 text-xs leading-relaxed text-muted-foreground">{copy.qrHint}</p>
        </div>
      </div>

      <p className="text-center text-sm text-muted-foreground">
        <Link href="/support" className={cn(marketingInlineLink, "font-semibold")}>
          {copy.supportLinkLabel}
        </Link>
      </p>
    </div>
  );
}
