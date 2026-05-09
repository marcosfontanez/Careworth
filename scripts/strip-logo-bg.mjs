/**
 * 1) Edge flood: outer checker / white → transparent.
 * 2) Flood from frame edge through {transparent ∪ non-ink pixels}; "ink" = black outlines + saturated
 *    colors. Trapped flat whites (letter counters, inside orbit loops) never get reached → removed.
 */
import sharp from 'sharp';

const src = process.argv[2];
const dest = process.argv[3];
if (!src || !dest) {
  console.error('Usage: node strip-logo-bg.mjs <input.png> <output.png>');
  process.exit(1);
}

function isBgLike(r, g, b) {
  const maxC = Math.max(r, g, b);
  const minC = Math.min(r, g, b);
  const sat = maxC - minC;
  return maxC >= 245 && sat <= 18;
}

function isBgLikeFringe(r, g, b) {
  const maxC = Math.max(r, g, b);
  const minC = Math.min(r, g, b);
  const sat = maxC - minC;
  return maxC >= 235 && sat <= 28;
}

/** Flat white / light gray (fills to remove when unreachable from outside). */
function isHoleCandidate(r, g, b) {
  const maxC = Math.max(r, g, b);
  const minC = Math.min(r, g, b);
  const sat = maxC - minC;
  return maxC >= 228 && sat <= 38;
}

function lum(r, g, b) {
  return 0.299 * r + 0.587 * g + 0.114 * b;
}
function sat(r, g, b) {
  return Math.max(r, g, b) - Math.min(r, g, b);
}

/**
 * Pixels the exterior flood cannot walk through — keeps the flood *outside* letter shells
 * so white trapped inside counters/orbits stays unreachable.
 */
function isBarrierPixel(p, data, stride) {
  const a = data[p + 3];
  if (a < 30) return false;
  const r = data[p];
  const g = data[p + 1];
  const b = data[p + 2];
  const L = lum(r, g, b);
  const S = sat(r, g, b);
  if (L < 100) return true;
  if (S > 44 && L < 215) return true;
  return false;
}

function passableExterior(p, data, stride) {
  const a = data[p + 3];
  if (a < 30) return true;
  return !isBarrierPixel(p, data, stride);
}

const { data, info } = await sharp(src).ensureAlpha().raw().toBuffer({ resolveWithObject: true });

const { width, height, channels } = info;
const stride = channels;
const idx = (x, y) => (y * width + x) * stride;

// --- Pass 1: edge-connected bright background → transparent
const visited = new Uint8Array(width * height);
const queue = [];

function tryPushP1(x, y, fringe) {
  if (x < 0 || y < 0 || x >= width || y >= height) return;
  const i = y * width + x;
  if (visited[i]) return;
  const p = idx(x, y);
  const r = data[p];
  const g = data[p + 1];
  const b = data[p + 2];
  const ok = fringe ? isBgLikeFringe(r, g, b) : isBgLike(r, g, b);
  if (!ok) return;
  visited[i] = 1;
  queue.push(x, y);
}

for (let x = 0; x < width; x++) {
  tryPushP1(x, 0, false);
  tryPushP1(x, height - 1, false);
}
for (let y = 0; y < height; y++) {
  tryPushP1(0, y, false);
  tryPushP1(width - 1, y, false);
}

while (queue.length) {
  const y = queue.pop();
  const x = queue.pop();
  const p = idx(x, y);
  data[p + 3] = 0;
  tryPushP1(x + 1, y, true);
  tryPushP1(x - 1, y, true);
  tryPushP1(x, y + 1, true);
  tryPushP1(x, y - 1, true);
}

// --- Pass 2: exterior connectivity (cannot cross black / saturated “ink”)
const reach = new Uint8Array(width * height);
/** `extraSeeds`: optional baseline row indices (0…width-1) to treat as exterior — fixes exports
 *  where the bottom row is solid white matting so border flood never touches true transparency. */
const extraSeeds = new Set();
if (process.env.LOGO_BASELINE_ROW) {
  const r = Number(process.env.LOGO_BASELINE_ROW);
  if (Number.isFinite(r) && r >= 0 && r < height) {
    for (let x = 0; x < width; x++) extraSeeds.add(r * width + x);
  }
}

const q2 = [];
function seed(x, y) {
  const i = y * width + x;
  if (reach[i]) return;
  const p = idx(x, y);
  if (!passableExterior(p, data, stride)) return;
  reach[i] = 1;
  q2.push(x, y);
}

for (let x = 0; x < width; x++) {
  seed(x, 0);
  seed(x, height - 1);
}
for (let y = 0; y < height; y++) {
  seed(0, y);
  seed(width - 1, y);
}

for (const i of extraSeeds) {
  const y = Math.floor(i / width);
  const x = i - y * width;
  seed(x, y);
}

while (q2.length) {
  const y = q2.pop();
  const x = q2.pop();
  const nbs = [
    [x + 1, y],
    [x - 1, y],
    [x, y + 1],
    [x, y - 1],
  ];
  for (const [nx, ny] of nbs) {
    if (nx < 0 || ny < 0 || nx >= width || ny >= height) continue;
    const ni = ny * width + nx;
    if (reach[ni]) continue;
    const p = idx(nx, ny);
    if (passableExterior(p, data, stride)) {
      reach[ni] = 1;
      q2.push(nx, ny);
    }
  }
}

for (let y = 0; y < height; y++) {
  for (let x = 0; x < width; x++) {
    const i = y * width + x;
    const p = idx(x, y);
    const a = data[p + 3];
    if (a < 30) continue;
    const r = data[p];
    const g = data[p + 1];
    const b = data[p + 2];
    if (isHoleCandidate(r, g, b) && !reach[i]) data[p + 3] = 0;
  }
}

await sharp(data, { raw: { width, height, channels: 4 } })
  .png({ compressionLevel: 9 })
  .toFile(dest);

console.log('Wrote', dest, `${width}x${height}`);
