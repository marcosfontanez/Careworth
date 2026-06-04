import type { MetadataRoute } from "next";

import { isVercelPreviewDeployment } from "@/lib/deployment-env";
import { answerPagePath, getAnswerSlugs } from "@/lib/marketing-copy/answer-pages";
import { getPublicSiteUrl } from "@/lib/site-url";

const staticPaths = [
  "/",
  "/about",
  "/advertisers",
  "/changelog",
  "/child-safety",
  "/community-guidelines",
  "/compare",
  "/contact",
  "/download",
  "/faq",
  "/features",
  "/features/circles",
  "/features/feed",
  "/features/live",
  "/features/my-pulse",
  "/features/pulse-page",
  "/for",
  "/partners",
  "/support",
  "/trust",
  "/privacy",
  "/terms",
];

const answerPaths = [
  ...getAnswerSlugs("compare").map((slug) => answerPagePath("compare", slug)),
  ...getAnswerSlugs("for").map((slug) => answerPagePath("for", slug)),
];

const paths = [...staticPaths, ...answerPaths];

export default function sitemap(): MetadataRoute.Sitemap {
  if (isVercelPreviewDeployment()) {
    return [];
  }
  const base = getPublicSiteUrl();
  const lastModified = new Date();
  return paths.map((path) => ({
    url: `${base}${path}`,
    lastModified,
    changeFrequency: path === "/" ? ("daily" as const) : ("weekly" as const),
    priority: path === "/" ? 1 : 0.7,
  }));
}
