/**
 * Radial profile of the Class of 2026 border so we can size the avatar photo to
 * sit snugly against the gold ring. For radius bands (fraction of half-width) we
 * report the % of the ring that is opaque (alpha>128) and the mean luminance of
 * those opaque pixels — revealing the transparent hole, any dark inner bezel, and
 * where the bright gold ring begins.
 *
 * Run: node scripts/measure-class-of-2026-opening.mjs
 */
import { readFileSync } from 'fs';
import { loadSharp } from './load-sharp.mjs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = join(__dirname, '..');
const TARGET = join(root, 'assets/images/pulse-rings/class-of-2026-border.png');

async function main() {
  const sharp = await loadSharp();
  const { data, info } = await sharp(readFileSync(TARGET)).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  const w = info.width;
  const h = info.height;
  const buf = Buffer.from(data);
  const ch = 4;
  const cx = w / 2;
  const cy = h / 2;
  const half = Math.min(w, h) / 2;

  const bands = 28;
  const op = new Array(bands).fill(0);
  const tot = new Array(bands).fill(0);
  const lumSum = new Array(bands).fill(0);

  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const dx = x - cx;
      const dy = y - cy;
      const r = Math.sqrt(dx * dx + dy * dy) / half; // 0..~1
      if (r >= 1) continue;
      const bi = Math.min(bands - 1, Math.floor(r * bands));
      const o = (y * w + x) * ch;
      tot[bi]++;
      if (buf[o + 3] > 128) {
        op[bi]++;
        lumSum[bi] += (buf[o] + buf[o + 1] + buf[o + 2]) / 3;
      }
    }
  }

  console.log('band  rFrac(diam)  opaque%   meanLum(opaque)');
  for (let i = 0; i < bands; i++) {
    const rEdge = ((i + 1) / bands).toFixed(3);
    const diamFrac = (((i + 0.5) / bands) * 1).toFixed(3); // radius frac; *2 for diameter below
    const pct = tot[i] ? (100 * op[i]) / tot[i] : 0;
    const lum = op[i] ? lumSum[i] / op[i] : 0;
    const diam = (((i + 0.5) / bands) * 2).toFixed(3);
    console.log(
      `${String(i).padStart(2)}   r<=${rEdge}  diam~${diam}   ${pct.toFixed(1).padStart(5)}%   ${lum.toFixed(0).padStart(4)}`,
    );
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
