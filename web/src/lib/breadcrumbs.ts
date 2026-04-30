import { getPublicSiteUrl } from "@/lib/site-url";

/** Human labels for URL segments (marketing site). */
export const MARKETING_SEGMENT_LABELS: Record<string, string> = {
  about: "About",
  advertisers: "Advertisers",
  changelog: "Changelog",
  contact: "Contact",
  "community-guidelines": "Community guidelines",
  download: "Download",
  faq: "FAQ",
  features: "Features",
  feed: "Feed",
  circles: "Circles",
  live: "Live",
  "pulse-page": "Pulse Page",
  "my-pulse": "My Pulse",
  partners: "Partners",
  privacy: "Privacy",
  support: "Support",
  terms: "Terms",
  trust: "Trust & safety",
};

export type BreadcrumbItem = { name: string; href: string };

/** Build Home-first trail for a pathname (no query string). */
export function buildBreadcrumbs(pathname: string): BreadcrumbItem[] {
  const normalized = pathname.startsWith("/") ? pathname : `/${pathname}`;
  if (normalized === "/" || normalized === "") {
    return [{ name: "Home", href: "/" }];
  }

  const segments = normalized.split("/").filter(Boolean);
  const items: BreadcrumbItem[] = [{ name: "Home", href: "/" }];
  let acc = "";
  for (const seg of segments) {
    acc += `/${seg}`;
    const label = MARKETING_SEGMENT_LABELS[seg] ?? seg.replace(/-/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
    items.push({ name: label, href: acc });
  }
  return items;
}

/** Absolute URL for JSON-LD / canonical checks. */
export function absoluteUrl(path: string): string {
  const base = getPublicSiteUrl().replace(/\/$/, "");
  const p = path.startsWith("/") ? path : `/${path}`;
  return `${base}${p}`;
}
