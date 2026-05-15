/**
 * Sharp is intentionally not in package.json — it breaks EAS `npm ci` on some images
 * when native prebuilds do not apply. Install locally when running asset scripts:
 *   npm install sharp --save-dev
 */
export async function loadSharp() {
  try {
    const m = await import('sharp');
    return m.default;
  } catch {
    console.error(
      'This script needs sharp. From the repo root run:\n' +
        '  npm install sharp --save-dev\n',
    );
    process.exit(1);
  }
}
