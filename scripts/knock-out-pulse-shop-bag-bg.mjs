/**
 * Removes opaque black / near-black matting from pulse-shop-bag-icon.png
 * so the bag sits on the card gradient inside the circular frame.
 *
 * Re-run after replacing the source PNG: `node scripts/knock-out-pulse-shop-bag-bg.mjs`
 */
import { Jimp } from 'jimp';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const path = join(__dirname, '../assets/images/pulse-shop-bag-icon.png');

const img = await Jimp.read(path);
img.scan(0, 0, img.bitmap.width, img.bitmap.height, function (x, y, idx) {
  const r = this.bitmap.data[idx];
  const g = this.bitmap.data[idx + 1];
  const b = this.bitmap.data[idx + 2];
  const a = this.bitmap.data[idx + 3];
  if (a === 0) return;
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  /** Pure dark / neutral mat + dark halo (no strong chroma). */
  const knock =
    max < 34 || (max <= 48 && max - min <= 20);
  if (knock) {
    this.bitmap.data[idx + 3] = 0;
  }
});
await img.write(path);
console.log('Wrote', path, `${img.bitmap.width}x${img.bitmap.height}`);
