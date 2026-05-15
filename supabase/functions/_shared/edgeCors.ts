/**
 * Optional tighter browser Origin for Edge Functions.
 * Set `EDGE_CORS_ALLOWLIST` to one origin (first wins if comma-separated); omit for `*` (React Native–friendly).
 * Matches Pulse Shop + Apple Music token helpers.
 */
export function edgeCorsAllowOrigin(): string {
  const raw = Deno.env.get("EDGE_CORS_ALLOWLIST")?.trim();
  if (!raw) return "*";
  const first = raw.split(",")[0]?.trim();
  return first && first.length > 0 ? first : "*";
}

/** Merge static headers with computed ACAO (+ `Vary: Origin` when not wildcard). */
export function edgeCorsHeaders(extra: Record<string, string>): Record<string, string> {
  const o = edgeCorsAllowOrigin();
  return {
    ...extra,
    "Access-Control-Allow-Origin": o,
    ...(o !== "*" ? { Vary: "Origin" } : {}),
  };
}
