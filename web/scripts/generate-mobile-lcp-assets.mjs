/**
 * Mobile LCP assets — hero montage + download/advertisers posters.
 * Run: cd web && node scripts/generate-mobile-lcp-assets.mjs
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

import sharp from "sharp";

const webRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const landing = path.join(webRoot, "public", "marketing", "landing");
const marketing = path.join(webRoot, "public", "marketing");

const heroIn = path.join(landing, "hero-real-stories-desktop.avif");
const meta = await sharp(heroIn).metadata();
const mw = 828;
const mh = Math.round((mw / meta.width) * meta.height);
await sharp(heroIn)
  .resize(mw, mh, { fit: "inside" })
  .avif({ quality: 66, effort: 4 })
  .toFile(path.join(landing, "hero-real-stories-mobile.avif"));
await sharp(heroIn)
  .resize(mw, mh, { fit: "inside" })
  .webp({ quality: 72 })
  .toFile(path.join(landing, "hero-real-stories-mobile.webp"));
console.log(
  "hero mobile",
  `${mw}x${mh}`,
  "AVIF",
  `${Math.round(fs.statSync(path.join(landing, "hero-real-stories-mobile.avif")).size / 1024)}KB`,
);

for (const name of ["marketing-download-early-access", "marketing-advertisers-ad-solutions"]) {
  const png = path.join(marketing, `${name}.png`);
  const avifOut = path.join(marketing, `${name}.avif`);
  const webpOut = path.join(marketing, `${name}.webp`);
  const pipeline = sharp(png).resize(1024, undefined, { fit: "inside", withoutEnlargement: true });
  await pipeline.clone().avif({ quality: 64, effort: 4 }).toFile(avifOut);
  await pipeline.clone().webp({ quality: 72 }).toFile(webpOut);
  console.log(name, "AVIF", `${Math.round(fs.statSync(avifOut).size / 1024)}KB`);
}

console.log("Done.");
