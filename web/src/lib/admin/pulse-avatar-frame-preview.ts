/**
 * Static previews for admin catalog — matches mobile {@link resolvePulseRingRaster} / podium tiers.
 * Assets live under `web/public/pulse-rings/` (copied from repo `assets/images/pulse-rings/`).
 */
export function pulseAvatarFramePreviewPath(slug: string, prizeTier: string): string | null {
  const s = String(slug ?? "")
    .trim()
    .toLowerCase();
  const t = String(prizeTier ?? "")
    .trim()
    .toLowerCase();

  if (s === "pride-month-2026-border") return "/pulse-rings/pride-month-2026-border.png";
  if (s === "beta-tester-border") return "/pulse-rings/beta-tester-border.png";

  if (t === "gold") return "/pulse-rings/podium-gold.png";
  if (t === "silver") return "/pulse-rings/podium-silver.png";
  if (t === "bronze") return "/pulse-rings/podium-bronze.png";

  return null;
}
