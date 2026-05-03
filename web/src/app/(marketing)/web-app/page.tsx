import type { Metadata } from "next";

import Link from "next/link";

import { PulseverseWebDeviceFrame } from "@/components/marketing/pulseverse-web-device-frame";
import { getWebAppPageCopy } from "@/lib/marketing-copy/web-app";
import { getMarketingLocale } from "@/lib/marketing-locale-server";
import { marketingGutterX, marketingInlineLink } from "@/lib/ui-classes";
import { cn } from "@/lib/utils";

export async function generateMetadata(): Promise<Metadata> {
  const locale = await getMarketingLocale();
  const c = getWebAppPageCopy(locale);
  return {
    title: c.metaTitle,
    description: c.metaDescription,
    robots: process.env.NEXT_PUBLIC_EXPO_WEB_APP_URL?.trim() ? undefined : { index: false, follow: false },
  };
}

export default async function WebAppPage() {
  const locale = await getMarketingLocale();
  const c = getWebAppPageCopy(locale);
  const appUrl = process.env.NEXT_PUBLIC_EXPO_WEB_APP_URL?.trim() || null;

  return (
    <div className="relative isolate min-h-[calc(100dvh-5rem)] overflow-hidden bg-[#020617] pb-16 pt-8 sm:pt-10">
      <div
        className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_80%_60%_at_50%_-15%,rgba(20,184,166,0.12),transparent_52%),radial-gradient(ellipse_60%_45%_at_100%_50%,rgba(236,72,153,0.06),transparent_48%)]"
        aria-hidden
      />
      <div className={cn(marketingGutterX, "relative z-10 mx-auto max-w-3xl text-center")}>
        <p className="text-xs font-semibold uppercase tracking-[0.22em] text-primary/90">{c.kicker}</p>
        <h1 className="mt-3 text-balance font-heading text-3xl font-bold tracking-tight text-foreground sm:text-4xl">
          {c.title}
        </h1>
        <p className="mt-4 text-pretty text-base leading-relaxed text-muted-foreground sm:text-lg">{c.subtitle}</p>
        <p className="mt-4 text-pretty text-sm leading-relaxed text-muted-foreground">
          {c.accountCtaBefore}
          <Link href="/login" className={marketingInlineLink}>
            {c.accountCtaLink}
          </Link>
          {c.accountCtaAfter}
        </p>
      </div>

      <div className={cn(marketingGutterX, "relative z-10 mx-auto mt-10 max-w-6xl")}>
        <PulseverseWebDeviceFrame appUrl={appUrl} copy={c.frame} />
      </div>
    </div>
  );
}
