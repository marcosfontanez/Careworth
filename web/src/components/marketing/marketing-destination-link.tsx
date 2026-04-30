"use client";

import Link from "next/link";
import { track } from "@vercel/analytics";
import { Suspense, useMemo } from "react";
import { useSearchParams } from "next/navigation";

import { MARKETING_EVENTS } from "@/lib/marketing-analytics";

const UTM_PREFIX = "utm_";

const PRESERVE_PATH_PREFIXES = ["/download", "/contact"];

function mergeUtmIntoHref(href: string, search: URLSearchParams): string {
  if (!PRESERVE_PATH_PREFIXES.some((p) => href === p || href.startsWith(`${p}?`) || href.startsWith(`${p}/`)))
    return href;

  const base =
    typeof window !== "undefined"
      ? window.location.origin
      : process.env.NEXT_PUBLIC_SITE_URL?.replace(/\/$/, "") || "https://pulseverse.app";

  let u: URL;
  try {
    u = new URL(href, `${base}/`);
  } catch {
    return href;
  }

  search.forEach((value, key) => {
    if (key.startsWith(UTM_PREFIX)) {
      u.searchParams.set(key, value);
    }
  });

  return `${u.pathname}${u.search}${u.hash}`;
}

export type MarketingDestinationLinkProps = Omit<React.ComponentProps<typeof Link>, "href"> & {
  href: string;
  /** When set, logs `marketing_cta_click` for /download and /contact destinations. */
  analyticsSource?: string;
};

function MarketingDestinationLinkInner({ href, analyticsSource, onClick, ...props }: MarketingDestinationLinkProps) {
  const search = useSearchParams();
  const mergedHref = useMemo(() => mergeUtmIntoHref(href, search), [href, search]);

  return (
    <Link
      href={mergedHref}
      onClick={(e) => {
        onClick?.(e);
        if (
          analyticsSource &&
          (mergedHref === "/download" ||
            mergedHref.startsWith("/download?") ||
            mergedHref === "/contact" ||
            mergedHref.startsWith("/contact?"))
        ) {
          track(MARKETING_EVENTS.ctaClick, { href: mergedHref, source: analyticsSource });
        }
      }}
      {...props}
    />
  );
}

/** Preserves `utm_*` query params on `/download` and `/contact` links for campaign attribution. */
export function MarketingDestinationLink({ href, analyticsSource, ...rest }: MarketingDestinationLinkProps) {
  return (
    <Suspense fallback={<Link href={href} {...rest} />}>
      <MarketingDestinationLinkInner href={href} analyticsSource={analyticsSource} {...rest} />
    </Suspense>
  );
}
