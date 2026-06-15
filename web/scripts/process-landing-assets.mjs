/**
 * Source PNGs → optimized AVIF + WebP in public/marketing/landing/
 * Demo MP4 → poster AVIF + 720w WebM + 720w MP4.
 *
 * Run: cd web && node scripts/process-landing-assets.mjs
 */
import { execSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

import sharp from "sharp";

const webRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const SRC = path.join(
  process.env.USERPROFILE ?? "",
  "OneDrive",
  "Desktop",
  "Pulseverse",
  "App store images",
);
const OUT = path.join(webRoot, "public", "marketing", "landing");

fs.mkdirSync(OUT, { recursive: true });

const images = [
  { src: "app store montage.png", out: "hero-real-stories-desktop", width: 2400, quality: 72 },
  { src: "ChatGPT Image Jun 14, 2026, 01_55_39 PM (1).png", out: "feature-feed", width: 1200, quality: 70 },
  { src: "ChatGPT Image Jun 14, 2026, 01_55_39 PM (2).png", out: "feature-circles-discover", width: 1200, quality: 70 },
  { src: "ChatGPT Image Jun 14, 2026, 01_55_39 PM (3).png", out: "feature-circles-conversation", width: 1200, quality: 70 },
  { src: "ChatGPT Image Jun 14, 2026, 01_55_39 PM (4).png", out: "feature-my-pulse", width: 1200, quality: 70 },
  { src: "ChatGPT Image Jun 14, 2026, 01_55_39 PM (5).png", out: "feature-creator-hub", width: 1200, quality: 70 },
  { src: "ChatGPT Image Jun 14, 2026, 01_56_58 PM.png", out: "feature-live", width: 1200, quality: 70 },
];

console.log("Processing still images →", OUT);
for (const { src, out, width, quality } of images) {
  const input = path.join(SRC, src);
  if (!fs.existsSync(input)) {
    console.warn("SKIP (missing):", input);
    continue;
  }
  const meta = await sharp(input).metadata();
  const h = meta.height && meta.width ? Math.round((width / meta.width) * meta.height) : undefined;
  const pipeline = sharp(input).resize(width, h, { fit: "inside", withoutEnlargement: true });
  await pipeline.clone().avif({ quality, effort: 4 }).toFile(path.join(OUT, `${out}.avif`));
  await pipeline.clone().webp({ quality: quality + 5 }).toFile(path.join(OUT, `${out}.webp`));
  const avifKb = Math.round(fs.statSync(path.join(OUT, `${out}.avif`)).size / 1024);
  const webpKb = Math.round(fs.statSync(path.join(OUT, `${out}.webp`)).size / 1024);
  console.log(`  ${out}: ${meta.width}x${meta.height} → AVIF ${avifKb}KB, WebP ${webpKb}KB`);
}

const demoSrc = path.join(SRC, "Tiktok vertical 9-16 (1080x1920).mp4");
const posterOut = path.join(OUT, "pulseverse-demo-poster.avif");
const webmOut = path.join(OUT, "pulseverse-demo-720w.webm");
const mp4Out = path.join(OUT, "pulseverse-demo-720w.mp4");

if (fs.existsSync(demoSrc)) {
  console.log("Processing demo video…");
  const framePng = path.join(OUT, "_poster-frame.png");
  execSync(`ffmpeg -y -ss 2 -i "${demoSrc}" -frames:v 1 -q:v 2 "${framePng}"`, { stdio: "inherit" });
  await sharp(framePng).resize(720, undefined, { fit: "inside" }).avif({ quality: 65 }).toFile(posterOut);
  fs.unlinkSync(framePng);
  execSync(
    `ffmpeg -y -i "${demoSrc}" -vf "scale=720:-2" -c:v libvpx-vp9 -crf 45 -b:v 0 -an -row-mt 1 -deadline good -cpu-used 2 "${webmOut}"`,
    { stdio: "inherit" },
  );
  execSync(
    `ffmpeg -y -i "${demoSrc}" -vf "scale=720:-2" -c:v libx264 -crf 28 -preset slow -an -movflags +faststart "${mp4Out}"`,
    { stdio: "inherit" },
  );
  console.log(
    "  poster:",
    Math.round(fs.statSync(posterOut).size / 1024),
    "KB | webm:",
    Math.round(fs.statSync(webmOut).size / 1024),
    "KB | mp4:",
    Math.round(fs.statSync(mp4Out).size / 1024),
    "KB",
  );
} else {
  console.warn("Demo MP4 not found:", demoSrc);
}

console.log("Done.");
