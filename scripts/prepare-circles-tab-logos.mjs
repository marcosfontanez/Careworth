/**
 * Build Circles tab header asset: PulseVerse + Circles lockup on black matte → transparent PNG.
 */
import sharp from 'sharp';
import { mkdirSync } from 'fs';
import { dirname } from 'path';

const SRC =
  process.argv[2] ||
  'C:/Users/marco/.cursor/projects/c-Users-marco-CareWorth/assets/c__Users_marco_AppData_Roaming_Cursor_User_workspaceStorage_b9a68b78cf3811a4f96ba3ccece53ea2_images_circles_logo-427eae60-e8e6-44ac-bc41-1c7154a31cae.png';

const OUT = 'assets/images/circles-header-lockup.png';

async function stripBlackMatte(input, output, tol = Number(process.env.BLACK_MATTE_TOL ?? 4)) {
  const { data, info } = await sharp(input).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  const { width, height } = info;
  for (let i = 0; i < data.length; i += 4) {
    if (data[i] <= tol && data[i + 1] <= tol && data[i + 2] <= tol) data[i + 3] = 0;
  }
  mkdirSync(dirname(output), { recursive: true });
  await sharp(data, { raw: { width, height, channels: 4 } })
    .png({ compressionLevel: 9 })
    .toFile(output);
}

await stripBlackMatte(SRC, OUT);

console.log('Wrote', OUT);
