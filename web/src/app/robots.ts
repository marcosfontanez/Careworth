import type { MetadataRoute } from "next";

import { isVercelPreviewDeployment } from "@/lib/deployment-env";
import { getPublicSiteUrl } from "@/lib/site-url";

const BLOCKED_PATHS = ["/admin/", "/admin", "/api/", "/api"];

/**
 * AI answer-engine crawlers. Listing them explicitly (all allowed, same as `*`)
 * signals intent and keeps PulseVerse eligible for ChatGPT / Perplexity / Gemini /
 * Claude citations and training discovery.
 */
const AI_CRAWLERS = [
  "GPTBot", // OpenAI training crawler
  "OAI-SearchBot", // ChatGPT search index
  "ChatGPT-User", // ChatGPT live browsing on a user's behalf
  "PerplexityBot", // Perplexity index
  "Perplexity-User", // Perplexity live fetch
  "ClaudeBot", // Anthropic crawler
  "Claude-User", // Claude live browsing
  "anthropic-ai",
  "Google-Extended", // Gemini / Vertex training
  "Applebot-Extended", // Apple Intelligence
  "Amazonbot",
  "Bytespider",
  "CCBot", // Common Crawl (feeds many models)
];

export default function robots(): MetadataRoute.Robots {
  if (isVercelPreviewDeployment()) {
    return { rules: { userAgent: "*", disallow: "/" } };
  }
  const base = getPublicSiteUrl();
  return {
    rules: [
      { userAgent: "*", allow: "/", disallow: BLOCKED_PATHS },
      { userAgent: AI_CRAWLERS, allow: "/", disallow: BLOCKED_PATHS },
    ],
    sitemap: `${base}/sitemap.xml`,
  };
}
