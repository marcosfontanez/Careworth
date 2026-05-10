/**
 * Remove checkerboard + hole from Pride border PNG; resize to 1024².
 * Uses 8-connected flood fill so diagonal checker tiles connect; then cleans
 * remaining light pixels inside the estimated inner circle.
 */
import sharp from 'sharp';
import { readFileSync, writeFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = join(__dirname, '..');
const TARGET = join(root, 'assets/images/pulse-rings/pride-month-2026-border.png');
const OUTPUT_SIZE = 1024;

/**
 * Checkerboard “transparency” grids use light + dark neutral tiles. The old
 * heuristic required lum ≥ 110, so darker gray squares (~40–100) stayed opaque
 * and blocked the flood-fill → visible dot grid in the shipped PNG.
 */
function isLikelyBg(r, g, b) {
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  const delta = max - min;
  const lum = (r + g + b) / 3;
  if (lum >= 245 && delta <= 32) return true;
  // Full neutral band: white ↔ dark gray checker cells
  if (delta <= 52 && lum >= 22 && lum <= 252) return true;
  // Nearly white pastels sometimes used in export
  if (lum >= 232 && delta <= 40) return true;
  return false;
}

/** Stricter neutral — for growing transparency into halos without eating pastel rainbow. */
function isNeutralResidual(r, g, b) {
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  const delta = max - min;
  const lum = (r + g + b) / 3;
  return delta <= 44 && lum >= 18 && lum <= 252;
}

/** 8-neighbor BFS; only steps on isLikelyBg RGB. */
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
  const maxR = Math.min(w, h) * 0.42;
  for (let r = 0; r <= maxR; r += 1) {
    for (let dy = -r; dy <= r; dy++) {
      for (let dx = -r; dx <= r; dx++) {
        if (Math.abs(dx) !== r && Math.abs(dy) !== r) continue;
        const x = cx + dx;
        const y = cy + dy;
        if (x < 0 || x >= w || y < 0 || y >= h) continue;
        const o = (y * w + x) * ch;
        if (isLikelyBg(buf[o], buf[o + 1], buf[o + 2])) return [x, y];
      }
    }
  }
  return [cx, cy];
}

/** Remove leftover bg-colored specks inside inner disk (checker islands). */
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

/** Median distance from center to inner edge of opaque ring (4 rays). */
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
  if (rs.length === 0) return 0.58;
  rs.sort((a, b) => a - b);
  const med = rs[rs.length >> 1];
  return (2 * med) / w;
}

async function main() {
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

  /* Islands of checker / anti-alias stuck between colorful ring samples */
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

  /* ~92% of half-width: inside ring’s inner opening; only strips isLikelyBg stragglers */
  scrubInnerDisk(buf, w, h, 0.48);

  const frac = measureInnerOpeningFrac(buf, w, h);
  console.log('Measured inner hole diameter / width ≈', frac.toFixed(3), '— set RASTER_PRIDE_MONTH_2026_INNER_OPENING_FRAC to this');

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
