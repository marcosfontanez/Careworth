import path from "node:path";
import { createRequire } from "node:module";
import type { NextConfig } from "next";

import { marketingContentSecurityPolicy } from "./src/lib/content-security-policy";
import { webAppEmbedPermissionsPolicy } from "./src/lib/web-app-embed-policy";

const webRoot = path.join(__dirname);
const webNodeModules = path.join(webRoot, "node_modules");

const moduleAliases: Record<string, string> = {
  tailwindcss: path.join(webNodeModules, "tailwindcss"),
  "tw-animate-css": path.join(webNodeModules, "tw-animate-css"),
};

function securityHeaders(mode: "default" | "webAppEmbed"): { key: string; value: string }[] {
  const permissionsPolicy =
    mode === "webAppEmbed"
      ? webAppEmbedPermissionsPolicy()
      : "camera=(), microphone=(), geolocation=()";

  const base = [
    { key: "X-DNS-Prefetch-Control", value: "on" },
    { key: "X-Content-Type-Options", value: "nosniff" },
    { key: "X-Frame-Options", value: "DENY" },
    { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
    { key: "Permissions-Policy", value: permissionsPolicy },
  ];
  if (process.env.NODE_ENV === "production") {
    base.push({ key: "Content-Security-Policy", value: marketingContentSecurityPolicy() });
  }
  return base;
}

const nextConfig: NextConfig = {
  images: {
    dangerouslyAllowSVG: true,
    contentDispositionType: "attachment",
    contentSecurityPolicy: "default-src 'self'; script-src 'none'; sandbox;",
    /* AVIF first (≈30–50% smaller than WebP for these screenshots), WebP fallback.
       The marketing source PNGs are 1.5–2 MB; the optimizer delivers a fraction of
       that at the requested width, which directly improves LCP. */
    formats: ["image/avif", "image/webp"],
    /* Cache optimized variants on the CDN for 30 days so repeat/real-user visits
       skip re-optimization (faster image TTFB). */
    minimumCacheTTL: 60 * 60 * 24 * 30,
  },
  /*
   * Monorepo: default `next dev` uses Turbopack; CSS `@import "tailwindcss"` still resolves from the
   * repo root (Expo’s Tailwind v3). Webpack + explicit aliases fixes dev. Production build may use
   * either bundler — keep aliases in both `webpack` and `turbopack`.
   */
  webpack: (config) => {
    const resolve = config.resolve ?? {};
    config.resolve = {
      ...resolve,
      alias: {
        ...(typeof resolve.alias === "object" && resolve.alias && !Array.isArray(resolve.alias)
          ? resolve.alias
          : {}),
        ...moduleAliases,
      },
    };
    return config;
  },
  poweredByHeader: false,
  /** Legacy staff URLs from before `/admin/merchandising` consolidation. */
  async redirects() {
    return [
      {
        source: "/admin/shop-catalog",
        destination: "/admin/merchandising?section=shop",
        permanent: true,
      },
      {
        source: "/admin/avatar-borders",
        destination: "/admin/merchandising?section=frames",
        permanent: true,
      },
      { source: "/circles", destination: "/features/circles", permanent: true },
      { source: "/live", destination: "/features/live", permanent: true },
      { source: "/creator-hub", destination: "/features", permanent: false },
    ];
  },
  async headers() {
    return [
      {
        source: "/(.*)",
        headers: securityHeaders("default"),
      },
      {
        source: "/web-app",
        headers: securityHeaders("webAppEmbed"),
      },
    ];
  },
  // Monorepo: Repo root uses Tailwind v3 (Expo); this app uses Tailwind v4. Without an explicit
  // alias, Turbopack resolves `tailwindcss` from the parent folder and loads v3, which breaks
  // `@import "tailwindcss"` in globals.css.
  turbopack: {
    root: webRoot,
    resolveAlias: moduleAliases,
  },
};

/* Bundle analysis: run `ANALYZE=true npm run build` (or `npm run analyze`) to emit
   the per-route client/server bundle treemaps. The dependency is only required
   when analyzing, so normal builds never load it. */
const withBundleAnalyzer =
  process.env.ANALYZE === "true"
    ? createRequire(import.meta.url)("@next/bundle-analyzer")({ enabled: true })
    : (config: NextConfig) => config;

export default withBundleAnalyzer(nextConfig);
