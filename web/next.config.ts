import path from "node:path";
import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Monorepo: avoid Next inferring the parent folder (repo root + Expo lockfile) as the app root,
  // which can confuse tooling on Vercel and locally.
  turbopack: {
    root: path.join(__dirname),
  },
};

export default nextConfig;
