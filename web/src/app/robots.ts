import type { MetadataRoute } from "next";

import { isVercelPreviewDeployment } from "@/lib/deployment-env";
import { getPublicSiteUrl } from "@/lib/site-url";

export default function robots(): MetadataRoute.Robots {
  if (isVercelPreviewDeployment()) {
    return { rules: { userAgent: "*", disallow: "/" } };
  }
  const base = getPublicSiteUrl();
  return {
    rules: {
      userAgent: "*",
      allow: "/",
      disallow: ["/admin/", "/admin", "/api/", "/api"],
    },
    sitemap: `${base}/sitemap.xml`,
  };
}
