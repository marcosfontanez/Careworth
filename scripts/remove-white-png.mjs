/**
 * Makes near-white / low-saturation pixels transparent (PNG export cleanup).
 * Usage: node scripts/remove-white-png.mjs [input.png] [output.png]
 *
 * Requires `sharp` on the machine that runs this script (not used by EAS / mobile builds):
 *   npm install sharp --save-dev
 */
let sharp;
try {
  const m = await import('sharp');
  sharp = m.default;
} catch {
  console.error(
    'This script needs sharp. From the repo root run:\n  npm install sharp --save-dev\n' +
      'Then run this script again.',
  );
  process.exit(1);
}
import { Buffer } from 'node:buffer';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.join(__dirname, '..');

const input =
  process.argv[2] ?? path.join(root, 'assets/images/pulseverse-creator-hub-banner.png');
const outputArg = process.argv[3];
const tmp =
  outputArg ?? path.join(root, 'assets/images/pulseverse-creator-hub-banner.tmp.png');
const finalOut = outputArg ?? input;

const { data, info } = await sharp(input).ensureAlpha().raw().toBuffer({ resolveWithObject: true });

if (info.channels !== 4) {
  throw new Error(`Expected 4 channels (RGBA), got ${info.channels}`);
}

const px = new Uint8ClampedArray(data);
const w = info.width;
const h = info.height;

/** Bright, almost-gray pixels → background. Keeps saturated teals/blues. */
for (let i = 0; i < px.length; i += 4) {
  const r = px[i];
  const g = px[i + 1];
  const b = px[i + 2];
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  const lum = (r + g + b) / 3;
  const sat = max < 1 ? 0 : (max - min) / max;

  let a = 255;
  if (lum >= 252) {
    a = 0;
  } else if (lum >= 238 && sat < 0.07) {
    a = 0;
  } else if (lum >= 228 && sat < 0.045) {
    const t = (lum - 228) / (238 - 228);
    a = Math.max(0, Math.round(255 * (1 - t * 0.95)));
  }

  if (a < px[i + 3]) {
    px[i + 3] = a;
  }
}

await sharp(Buffer.from(px), {
  raw: { width: w, height: h, channels: 4 },
})
  .png({ compressionLevel: 9 })
  .toFile(tmp);

if (!outputArg && tmp !== finalOut) {
  const fs = await import('node:fs/promises');
  await fs.rename(tmp, finalOut);
}

console.log(`Wrote transparent PNG (${w}×${h}) → ${finalOut}`);
