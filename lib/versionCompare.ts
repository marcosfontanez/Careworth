/**
 * Lightweight semver-style comparison for native app version strings (e.g. "1.0.12").
 * Non-numeric suffixes are stripped from each segment so "1.0.1-rc" compares as 1.0.1.
 */
export function parseVersionParts(version: string): number[] {
  const core = String(version || '')
    .trim()
    .split(/[-+]/)[0]
    .split('.')
    .map((s) => parseInt(s.replace(/\D/g, ''), 10));
  return core.map((n) => (Number.isFinite(n) ? n : 0));
}

/** True when `current` is strictly lower than `minimum` (same length padded with zeros). */
export function isVersionBelowMinimum(current: string, minimum: string): boolean {
  const a = parseVersionParts(current);
  const b = parseVersionParts(minimum);
  const len = Math.max(a.length, b.length, 3);
  for (let i = 0; i < len; i += 1) {
    const da = a[i] ?? 0;
    const db = b[i] ?? 0;
    if (da < db) return true;
    if (da > db) return false;
  }
  return false;
}
