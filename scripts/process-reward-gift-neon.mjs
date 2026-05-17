/**
 * Keys near-black PNG mats to transparency.
 *
 * Usage:
 *   node scripts/process-reward-gift-neon.mjs <src> <dst> [<src> <dst> ...]
 *
 * Example:
 *   node scripts/process-reward-gift-neon.mjs ./closed.png ./assets/images/reward-gift-neon-closed.png
 */
import { access } from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';
import { Jimp } from 'jimp';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.join(__dirname, '..');

async function assertReadable(filePath) {
  await access(filePath);
}

function keyNearBlack(image, { maxChannel = 44, maxSpread = 18 } = {}) {
  image.scan(0, 0, image.bitmap.width, image.bitmap.height, function (x, y, idx) {
    const r = this.bitmap.data[idx];
    const g = this.bitmap.data[idx + 1];
    const b = this.bitmap.data[idx + 2];
    const mx = Math.max(r, g, b);
    const mn = Math.min(r, g, b);
    if (mx <= maxChannel && mx - mn <= maxSpread) {
      this.bitmap.data[idx + 3] = 0;
    }
  });
}

async function main() {
  const pairs = process.argv.slice(2);
  if (pairs.length < 2 || pairs.length % 2 !== 0) {
    console.error('Usage: node scripts/process-reward-gift-neon.mjs <src> <dst> [<src> <dst> ...]');
    process.exit(1);
  }

  for (let i = 0; i < pairs.length; i += 2) {
    const src = path.resolve(pairs[i]);
    const dst = path.resolve(pairs[i + 1]);
    await assertReadable(src);
    const image = await Jimp.read(src);
    keyNearBlack(image);
    await image.write(dst);
    console.log('wrote', path.relative(ROOT, dst));
  }
}

await main().catch((e) => {
  console.error(e);
  process.exit(1);
});
