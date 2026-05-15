/**
 * Builds assets/images/pulseverse-logo.png as a 1024×1024 App Store / Expo icon:
 * original artwork from git, scaled with "contain" on #0A1628 (same as android adaptiveIcon).
 *
 * Run: node scripts/build-app-icon.cjs
 */
const { execSync } = require('node:child_process');
const { writeFileSync, unlinkSync, existsSync } = require('node:fs');
const { join } = require('node:path');
const { Jimp, rgbaToInt } = require('jimp');

const ROOT = join(__dirname, '..');
const OUT = join(ROOT, 'assets', 'images', 'pulseverse-logo.png');
const GIT_BLOB = '855f740:assets/images/pulseverse-logo.png';
const SIZE = 1024;
/** #0A1628 — matches app.json android.adaptiveIcon.backgroundColor */
const BG = rgbaToInt(10, 22, 40, 255);

async function main() {
  let buf;
  try {
    buf = execSync(`git show ${GIT_BLOB}`, {
      cwd: ROOT,
      encoding: null,
      maxBuffer: 20 * 1024 * 1024,
    });
  } catch {
    console.error('[build-app-icon] git show failed — run from repo root with full git history');
    process.exit(1);
  }

  const tmp = join(ROOT, 'assets', 'images', '.pulseverse-logo-git-source.bin');
  writeFileSync(tmp, buf);

  try {
    const src = await Jimp.read(tmp);
    unlinkSync(tmp);
    const w = src.bitmap.width;
    const h = src.bitmap.height;
    const scale = Math.min(SIZE / w, SIZE / h);
    const tw = Math.max(1, Math.round(w * scale));
    const th = Math.max(1, Math.round(h * scale));
    src.resize({ w: tw, h: th });
    const canvas = new Jimp({ width: SIZE, height: SIZE, color: BG });
    const x = Math.floor((SIZE - tw) / 2);
    const y = Math.floor((SIZE - th) / 2);
    canvas.composite(src, x, y);
    await canvas.write(OUT);
    console.log('[build-app-icon] wrote', OUT);
  } catch (e) {
    if (existsSync(tmp)) unlinkSync(tmp);
    console.error(e);
    process.exit(1);
  }
}

main();
