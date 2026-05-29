/**
 * Remove solid black matting + inner profile hole from Father's Day border PNG;
 * resize to 1024² for bundled pulse-ring overlay.
 */
import { readFileSync, writeFileSync } from 'fs';
import { loadSharp } from './load-sharp.mjs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = join(__dirname, '..');
const TARGET = join(root, 'assets/images/pulse-rings/fathers-day-2026-border.png');
const OUTPUT_SIZE = 1024;

/** Outer mat + inner hole are near-black / dark neutral in source art. */
function isLikelyBg(r, g, b) {
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  const delta = max - min;
  const lum = (r + g + b) / 3;
  if (lum <= 42 && delta <= 36) return true;
  if (lum <= 58 && delta <= 22) return true;
  return false;
}

function isNeutralResidual(r, g, b) {
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  const delta = max - min;
  const lum = (r + g + b) / 3;
  return delta <= 40 && lum <= 72;
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
    if (!isLikelyBg(buf[o], buf[o + 1], buf[o + 2])) return;
    vis[i] = 1;
    q.push(i);
  };

  for (const [sx, sy] of seeds) tryPush(sx, sy);

  const dirs = [
    [1, 0],
    [-1, 0],
    [0, 1],
    [0, -1],
    [1, 1],
    [1, -1],
    [-1, 1],
    [-1, -1],
  ];

  while (q.length) {
    const i = q.pop();
    const x = i % w;
    const y = (i / w) | 0;
    for (const [dx, dy] of dirs) tryPush(x + dx, y + dy);
  }
  return vis;
}

function findInnerSeed(buf, w, h) {
  const ch = 4;
  const cx = (w / 2) | 0;
  const cy = (h / 2) | 0;
  return [cx, cy];
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
  const rays = [
    [1, 0],
    [-1, 0],
    [0, 1],
    [0, -1],
  ];
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
  if (rs.length === 0) return 0.65;
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

  const edgeSeeds = [];
  for (let x = 0; x < w; x++) {
    edgeSeeds.push([x, 0], [x, h - 1]);
  }
  for (let y = 0; y < h; y++) {
    edgeSeeds.push([0, y], [w - 1, y]);
  }

  const outer = floodMask(buf, w, h, edgeSeeds);
  const [ix, iy] = findInnerSeed(buf, w, h);
  const inner = floodMask(buf, w, h, [[ix, iy]]);

  for (let i = 0; i < n; i++) {
    if (outer[i] || inner[i]) buf[i * ch + 3] = 0;
  }

  const dirs8 = [
    [1, 0],
    [-1, 0],
    [0, 1],
    [0, -1],
    [1, 1],
    [1, -1],
    [-1, 1],
    [-1, -1],
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
            const ni = ny * w + nx;
            if (buf[ni * ch + 3] < 16) {
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

  scrubInnerDisk(buf, w, h, 0.46);

  const frac = measureInnerOpeningFrac(buf, w, h);
  console.log(
    'Measured inner hole diameter / width ≈',
    frac.toFixed(3),
    '— set RASTER_FATHERS_DAY_2026_INNER_OPENING_FRAC to this',
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
