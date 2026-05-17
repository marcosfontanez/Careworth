/**
 * Static previews for admin catalog — matches mobile {@link resolvePulseRingRaster} / podium tiers.
 * Assets live under `web/public/pulse-rings/` (copied from repo `assets/images/pulse-rings/`).
 * Gold/silver/bronze use June 2026 Solstice art when the viewer's calendar is June 2026 (matches app).
 */
/** True during June 2026 — matches mobile {@link isSummerSolstice2026PulseCollectionActive}. */
function webJune2026SolsticeActive(): boolean {
  const d = new Date();
  return d.getFullYear() === 2026 && d.getMonth() === 5;
}

export function pulseAvatarFramePreviewPath(slug: string, prizeTier: string): string | null {
  const s = String(slug ?? "")
    .trim()
    .toLowerCase();
  const t = String(prizeTier ?? "")
    .trim()
    .toLowerCase();

  if (s === "pride-month-2026-border") return "/pulse-rings/pride-month-2026-border.png";
  if (s === "beta-tester-border") return "/pulse-rings/beta-tester-border.png";
  if (s === "mothers-day-2026-border") return "/pulse-rings/mothers-day-2026-border.png";
  if (s === "juneteenth-2026-border") return "/pulse-rings/juneteenth-2026-border.png";
  if (s === "emerald-renewal-may-2026-border") return "/pulse-rings/emerald-renewal-may-2026-border.png";

  const solstice = webJune2026SolsticeActive();
  if (t === "gold") return solstice ? "/pulse-rings/summer-solstice-2026-gold.png" : "/pulse-rings/podium-gold.png";
  if (t === "silver") return solstice ? "/pulse-rings/summer-solstice-2026-silver.png" : "/pulse-rings/podium-silver.png";
  if (t === "bronze") return solstice ? "/pulse-rings/summer-solstice-2026-bronze.png" : "/pulse-rings/podium-bronze.png";

  return null;
}
