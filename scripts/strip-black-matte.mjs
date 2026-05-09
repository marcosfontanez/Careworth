/**
 * Knock out flat black matting (RGB ~0,0,0) → transparent.
 * New circle lockups are often delivered as “trans” JPEG-style PNGs that are
 * still fully opaque black outside the art.
 */
import sharp from 'sharp';

const src = process.argv[2];
const dest = process.argv[3];
const tol = Number(process.env.BLACK_MATTE_TOL ?? 4); // max channel value treated as background

if (!src || !dest) {
  console.error('Usage: node strip-black-matte.mjs <input.png> <output.png>');
  process.exit(1);
}

const { data, info } = await sharp(src).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
const { width, height, channels } = info;

for (let i = 0; i < data.length; i += 4) {
  const r = data[i];
  const g = data[i + 1];
  const b = data[i + 2];
  if (r <= tol && g <= tol && b <= tol) data[i + 3] = 0;
}

await sharp(data, { raw: { width, height, channels: 4 } })
  .png({ compressionLevel: 9 })
  .toFile(dest);

let t = 0;
for (let i = 3; i < data.length; i += 4) if (data[i] < 10) t++;
console.log('Wrote', dest, `${width}x${height}`, 'transparent%', Math.round((100 * t) / (data.length / 4)));
