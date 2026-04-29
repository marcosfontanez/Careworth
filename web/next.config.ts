import path from "node:path";
import type { NextConfig } from "next";

const webRoot = path.join(__dirname);
const webNodeModules = path.join(webRoot, "node_modules");

const securityHeaders = [
  { key: "X-DNS-Prefetch-Control", value: "on" },
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=()" },
];

const nextConfig: NextConfig = {
  poweredByHeader: false,
  async headers() {
    return [
      {
        source: "/(.*)",
        headers: securityHeaders,
      },
    ];
  },
  // Monorepo: Repo root uses Tailwind v3 (Expo); this app uses Tailwind v4. Without an explicit
  // alias, Turbopack resolves `tailwindcss` from the parent folder and loads v3, which breaks
  // `@import "tailwindcss"` in globals.css.
  turbopack: {
    root: webRoot,
    resolveAlias: {
      tailwindcss: path.join(webNodeModules, "tailwindcss"),
      "tw-animate-css": path.join(webNodeModules, "tw-animate-css"),
    },
  },
};

export default nextConfig;
