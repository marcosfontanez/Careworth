import type { MetadataRoute } from "next";

import { getPublicSiteUrl } from "@/lib/site-url";

const paths = [
  "/",
  "/about",
  "/advertisers",
  "/community-guidelines",
  "/contact",
  "/download",
  "/faq",
  "/features",
  "/features/circles",
  "/features/feed",
  "/features/live",
  "/features/my-pulse",
  "/features/pulse-page",
  "/partners",
  "/support",
  "/privacy",
  "/terms",
];

export default function sitemap(): MetadataRoute.Sitemap {
  const base = getPublicSiteUrl();
  const lastModified = new Date();
  return paths.map((path) => ({
    url: `${base}${path}`,
    lastModified,
    changeFrequency: path === "/" ? ("daily" as const) : ("weekly" as const),
    priority: path === "/" ? 1 : 0.7,
  }));
}
