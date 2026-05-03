import path from "node:path";
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

export default nextConfig;
