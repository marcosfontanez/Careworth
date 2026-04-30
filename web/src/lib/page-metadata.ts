import type { Metadata } from "next";

import { getPublicSiteUrl } from "@/lib/site-url";

/** Absolute canonical URL for a path (no trailing slash on base). */
export function canonical(path: string): NonNullable<Metadata["alternates"]> {
  const base = getPublicSiteUrl();
  const p = path.startsWith("/") ? path : `/${path}`;
  return { canonical: `${base}${p}` };
}
