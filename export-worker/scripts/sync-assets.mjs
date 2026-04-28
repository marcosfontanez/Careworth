/**
 * Copies bundled media from the mobile repo into export-worker/bundled/ for Docker builds.
 * Run from repo root: node export-worker/scripts/sync-assets.mjs
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(__dirname, '..', '..');
const bundled = path.resolve(__dirname, '..', 'bundled');

const pairs = [
  [path.join(repoRoot, 'assets', 'video', 'pulseverse-endcard.mp4'), 'pulseverse-endcard.mp4'],
  [path.join(repoRoot, 'assets', 'images', 'pulseverse-logo.png'), 'pulseverse-logo.png'],
  [path.join(repoRoot, 'assets', 'images', 'pulseverse-watermark.png'), 'pulseverse-watermark.png'],
];

fs.mkdirSync(bundled, { recursive: true });
for (const [src, name] of pairs) {
  const dest = path.join(bundled, name);
  if (!fs.existsSync(src)) {
    console.warn(`[sync-assets] skip missing: ${src}`);
    continue;
  }
  fs.copyFileSync(src, dest);
  console.log(`[sync-assets] ${name}`);
}
