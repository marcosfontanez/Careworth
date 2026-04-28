import path from "node:path";
import type { NextConfig } from "next";

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
  // Monorepo: avoid Next inferring the parent folder (repo root + Expo lockfile) as the app root,
  // which can confuse tooling on Vercel and locally.
  turbopack: {
    root: path.join(__dirname),
  },
};

export default nextConfig;
