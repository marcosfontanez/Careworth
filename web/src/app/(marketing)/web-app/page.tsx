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
      {/* Layered cinematic backdrop — matches premium visual system. */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 -z-10 bg-[radial-gradient(ellipse_75%_55%_at_15%_-10%,rgba(20,184,166,0.12),transparent_55%),radial-gradient(ellipse_60%_45%_at_95%_30%,rgba(45,127,249,0.10),transparent_50%),radial-gradient(ellipse_60%_45%_at_50%_120%,rgba(13,28,55,0.65),transparent_60%)]"
      />
      <div
        aria-hidden
        className="pointer-events-none absolute -left-24 top-24 -z-10 h-[420px] w-[420px] rounded-full bg-primary/10 blur-[110px]"
      />
      <div
        aria-hidden
        className="pointer-events-none absolute -right-32 top-44 -z-10 h-[360px] w-[360px] rounded-full bg-[var(--accent)]/10 blur-[110px]"
      />

      <div className={cn(marketingGutterX, "relative z-10 mx-auto max-w-3xl text-center")}>
        <span className="inline-flex items-center gap-2 rounded-full border border-[var(--accent)]/25 bg-[var(--accent)]/10 px-3 py-1 text-[10px] font-bold uppercase tracking-[0.18em] text-[var(--accent)]">
          {c.kicker}
        </span>
        <h1 className="mt-4 text-balance font-heading text-3xl font-bold tracking-tight text-foreground sm:text-4xl lg:text-[2.65rem] lg:leading-[1.08]">
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
        {/* Subtle glow halo behind the iPhone frame to seat it on the page. */}
        <div className="relative">
          <div
            aria-hidden
            className="pointer-events-none absolute inset-x-1/4 top-12 -z-10 h-[80%] rounded-[3rem] bg-[radial-gradient(ellipse_70%_55%_at_50%_45%,rgba(20,184,166,0.18),transparent_60%)] blur-2xl"
          />
          <PulseverseWebDeviceFrame appUrl={appUrl} copy={c.frame} />
        </div>
      </div>
    </div>
  );
}
