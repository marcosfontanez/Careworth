/**
 * Admin metric formatting — K/M suffix rules kept in sync with the mobile
 * app's `utils/format.ts` `formatCount`.
 *
 * Why this is inlined instead of re-exported from the repo root:
 *   The Next.js / Turbopack build resolves modules relative to the `web/`
 *   project root and refuses imports that escape it (e.g. `../../../../utils/format`).
 *   The function is five lines, has no transitive deps, and rarely changes —
 *   inlining keeps the build green without adding bundler aliases.
 */
export function formatCount(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`;
  return n.toString();
}
