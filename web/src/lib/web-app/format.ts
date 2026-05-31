/** Shared, locale-agnostic formatting helpers for the native PulseVerse Web surfaces. */

/** Compact count, e.g. 1234 → "1.2K", 2_000_000 → "2M". */
export function formatCount(n: number): string {
  const v = Number.isFinite(n) ? n : 0;
  if (v >= 1_000_000) return `${(v / 1_000_000).toFixed(v % 1_000_000 === 0 ? 0 : 1)}M`;
  if (v >= 1_000) return `${(v / 1_000).toFixed(v % 1_000 === 0 ? 0 : 1)}K`;
  return String(v);
}

/** Short relative time, e.g. "now", "5m", "3h", "2d", "4w", else a locale date. */
export function relativeTime(iso: string | null): string | null {
  if (!iso) return null;
  const then = new Date(iso).getTime();
  if (Number.isNaN(then)) return null;
  const diff = Date.now() - then;
  const min = Math.floor(diff / 60_000);
  if (min < 1) return "now";
  if (min < 60) return `${min}m`;
  const hr = Math.floor(min / 60);
  if (hr < 24) return `${hr}h`;
  const day = Math.floor(hr / 24);
  if (day < 7) return `${day}d`;
  const wk = Math.floor(day / 7);
  if (wk < 5) return `${wk}w`;
  return new Date(iso).toLocaleDateString();
}

/** Coerce a URL to https (upgrades bare http) or null. */
export function toHttps(url: unknown): string | null {
  if (typeof url !== "string") return null;
  const s = url.trim();
  if (!s) return null;
  if (s.startsWith("http://")) return `https://${s.slice(7)}`;
  return s;
}

/** True for video-ish post/thread media types. */
export function isVideoType(type: unknown): boolean {
  const t = String(type ?? "").toLowerCase();
  return t.includes("video") || t.includes("clip") || t === "live";
}
