/**
 * Class of 2026 graduation border — remove the solid black matte (background) and
 * the inner profile-photo hole, leaving a clean transparent PNG fitted to wrap a
 * circular avatar. Resizes to 1024² for the bundled pulse-ring overlay.
 *
 * Run in-place after dropping the raw art at the TARGET path:
 *   node scripts/process-class-of-2026-border.mjs
 *
 * Purple/gold art note: the cap, heart gems, plaque, and flowers are saturated
 * (high channel delta) so they survive the "is background" test — only near-black,
 * low-saturation pixels (the matte + center hole) are knocked transparent.
 */
import { readFileSync, writeFileSync } from 'fs';
import { loadSharp } from './load-sharp.mjs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = join(__dirname, '..');
const TARGET = join(root, 'assets/images/pulse-rings/class-of-2026-border.png');
const OUTPUT_SIZE = 1024;

/** Outer matte + inner hole are near-black / dark neutral. Saturated art is kept. */
function isLikelyBg(r, g, b) {
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  const delta = max - min;
  const lum = (r + g + b) / 3;
  if (lum <= 44 && delta <= 30) return true;
  if (lum <= 60 && delta <= 18) return true;
  return false;
}

function isNeutralResidual(r, g, b) {
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  const delta = max - min;
  const lum = (r + g + b) / 3;
  return delta <= 34 && lum <= 70;
}

function floodMask(buf, w, h, seeds) {
  const ch = 4;
  const n = w * h;
  const vis = new Uint8Array(n);
  const q = [];
  const tryPush = (sx, sy) => {
    if (sx < 0 || sx >= w || sy < 0 || sy >= h) return;
    const i = sy * w + sx;
    if (vis[i]) return;
    const o = i * ch;
    // already-transparent OR background-colored both flood
    if (buf[o + 3] > 24 && !isLikelyBg(buf[o], buf[o + 1], buf[o + 2])) return;
    vis[i] = 1;
    q.push(i);
  };
  for (const [sx, sy] of seeds) tryPush(sx, sy);
  const dirs = [
    [1, 0], [-1, 0], [0, 1], [0, -1], [1, 1], [1, -1], [-1, 1], [-1, -1],
  ];
  while (q.length) {
    const i = q.pop();
    const x = i % w;
    const y = (i / w) | 0;
    for (const [dx, dy] of dirs) tryPush(x + dx, y + dy);
  }
  return vis;
}

function scrubInnerDisk(buf, w, h, radiusFrac) {
  const ch = 4;
  const cx = w / 2;
  const cy = h / 2;
  const rMax = Math.min(w, h) * 0.5 * radiusFrac;
  const r2 = rMax * rMax;
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const dx = x - cx;
      const dy = y - cy;
      if (dx * dx + dy * dy > r2) continue;
      const o = (y * w + x) * ch;
      if (isLikelyBg(buf[o], buf[o + 1], buf[o + 2])) buf[o + 3] = 0;
    }
  }
}

function measureInnerOpeningFrac(buf, w, h) {
  const ch = 4;
  const cx = (w / 2) | 0;
  const cy = (h / 2) | 0;
  const rays = [[1, 0], [-1, 0], [0, 1], [0, -1]];
  const rs = [];
  for (const [dx, dy] of rays) {
    for (let t = 1; t < Math.min(w, h) / 2; t++) {
      const x = cx + dx * t;
      const y = cy + dy * t;
      if (x < 0 || x >= w || y < 0 || y >= h) break;
      const o = (y * w + x) * ch;
      if (buf[o + 3] > 128) {
        rs.push(t);
        break;
      }
    }
  }
  if (rs.length === 0) return 0.55;
  rs.sort((a, b) => a - b);
  const med = rs[rs.length >> 1];
  return (2 * med) / w;
}

async function main() {
  const sharp = await loadSharp();
  const { data, info } = await sharp(readFileSync(TARGET))
    .ensureAlpha()
    .resize(OUTPUT_SIZE, OUTPUT_SIZE, { fit: 'fill', kernel: sharp.kernel.lanczos3 })
    .raw()
    .toBuffer({ resolveWithObject: true });

  const w = info.width;
  const h = info.height;
  const buf = Buffer.from(data);
  const ch = 4;
  const n = w * h;

  // Sample to report what we're working with.
  const corner = [buf[0], buf[1], buf[2], buf[3]];
  const center = (() => {
    const o = (((h / 2) | 0) * w + ((w / 2) | 0)) * ch;
    return [buf[o], buf[o + 1], buf[o + 2], buf[o + 3]];
  })();
  console.log('Source', w + 'x' + h, 'corner RGBA', corner, 'center RGBA', center);

  const edgeSeeds = [];
  for (let x = 0; x < w; x++) edgeSeeds.push([x, 0], [x, h - 1]);
  for (let y = 0; y < h; y++) edgeSeeds.push([0, y], [w - 1, y]);

  const outer = floodMask(buf, w, h, edgeSeeds);
  const inner = floodMask(buf, w, h, [[(w / 2) | 0, (h / 2) | 0]]);
  for (let i = 0; i < n; i++) {
    if (outer[i] || inner[i]) buf[i * ch + 3] = 0;
  }

  const dirs8 = [
    [1, 0], [-1, 0], [0, 1], [0, -1], [1, 1], [1, -1], [-1, 1], [-1, -1],
  ];
  function spreadTransparentIntoNeutral(maxPasses) {
    for (let pass = 0; pass < maxPasses; pass++) {
      let changed = 0;
      const kill = [];
      for (let y = 0; y < h; y++) {
        for (let x = 0; x < w; x++) {
          const i = y * w + x;
          const o = i * ch;
          if (buf[o + 3] < 16) continue;
          if (!isNeutralResidual(buf[o], buf[o + 1], buf[o + 2])) continue;
          let nearHole = false;
          for (const [dx, dy] of dirs8) {
            const nx = x + dx;
            const ny = y + dy;
            if (nx < 0 || nx >= w || ny < 0 || ny >= h) {
              nearHole = true;
              break;
            }
            if (buf[(ny * w + nx) * ch + 3] < 16) {
              nearHole = true;
              break;
            }
          }
          if (nearHole) {
            kill.push(i);
            changed++;
          }
        }
      }
      for (const i of kill) buf[i * ch + 3] = 0;
      if (changed === 0) break;
    }
  }
  spreadTransparentIntoNeutral(48);

  scrubInnerDisk(buf, w, h, 0.42);

  const frac = measureInnerOpeningFrac(buf, w, h);
  console.log(
    'Measured inner hole diameter / width ≈',
    frac.toFixed(3),
    '— set CLASS_OF_2026_INNER_OPENING_FRAC to this',
  );

  const out = await sharp(buf, { raw: { width: w, height: h, channels: 4 } })
    .png({ compressionLevel: 9, effort: 10 })
    .toBuffer();

  writeFileSync(TARGET, out);
  console.log('Wrote', TARGET);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
