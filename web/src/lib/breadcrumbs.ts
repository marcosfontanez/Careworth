import { getPublicSiteUrl } from "@/lib/site-url";

/** Human labels for URL segments (marketing site). */
export const MARKETING_SEGMENT_LABELS: Record<string, string> = {
  about: "About",
  advertisers: "Advertisers",
  changelog: "Changelog",
  "child-safety": "Child safety",
  contact: "Contact",
  communities: "Circles",
  "community-guidelines": "Community guidelines",
  compare: "Compare",
  download: "Download",
  faq: "FAQ",
  features: "Features",
  feed: "Feed",
  for: "For professionals",
  circles: "Circles",
  live: "Live",
  "pulse-page": "Pulse Page",
  "my-pulse": "My Pulse",
  partners: "Partners",
  post: "Post",
  privacy: "Privacy",
  support: "Support",
  terms: "Terms",
  trust: "Trust & safety",
  // Answer-page slugs (compare + for) — readable breadcrumb leaves.
  "pulseverse-vs-tiktok": "PulseVerse vs TikTok",
  "pulseverse-vs-instagram": "PulseVerse vs Instagram",
  "pulseverse-vs-facebook-groups": "PulseVerse vs Facebook groups",
  "pulseverse-vs-doximity": "PulseVerse vs Doximity",
  nurses: "Nurses",
  doctors: "Doctors",
  "medical-students": "Medical students",
  "healthcare-workers": "Healthcare workers",
};

export type BreadcrumbItem = { name: string; href: string; linkable?: boolean };

/**
 * URL segments that are grouping prefixes only — they have no standalone index
 * page (e.g. `/post`, `/communities`). They must appear in the visual trail but
 * must NOT render as links: a linked crumb gets prefetched by Next and 404s.
 */
const NON_PAGE_SEGMENTS = new Set(["post", "communities"]);

/** Build Home-first trail for a pathname (no query string). */
export function buildBreadcrumbs(pathname: string): BreadcrumbItem[] {
  const normalized = pathname.startsWith("/") ? pathname : `/${pathname}`;
  if (normalized === "/" || normalized === "") {
    return [{ name: "Home", href: "/" }];
  }

  const segments = normalized.split("/").filter(Boolean);
  const items: BreadcrumbItem[] = [{ name: "Home", href: "/" }];
  let acc = "";
  const isCircleThreadPath =
    segments.length >= 4 && segments[0] === "communities" && segments[2] === "thread";

  for (let i = 0; i < segments.length; i++) {
    const seg = segments[i];
    acc += `/${seg}`;
    const label = isCircleThreadPath && i === segments.length - 1
      ? "Discussion"
      : MARKETING_SEGMENT_LABELS[seg] ?? seg.replace(/-/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
    const isIntermediate = i < segments.length - 1;
    const linkable = !(isIntermediate && NON_PAGE_SEGMENTS.has(seg));
    items.push({ name: label, href: acc, linkable });
  }
  return items;
}

/** Absolute URL for JSON-LD / canonical checks. */
export function absoluteUrl(path: string): string {
  const base = getPublicSiteUrl().replace(/\/$/, "");
  const p = path.startsWith("/") ? path : `/${path}`;
  return `${base}${p}`;
}
