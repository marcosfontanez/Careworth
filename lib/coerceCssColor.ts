/**
 * Avoid passing empty strings (or whitespace) into native color parsers.
 * PostgREST may return `""` for nullable text columns — `?? '#fallback'` does not catch those,
 * and some native bridges can crash when building UIColor arrays for gradients.
 */
export function coerceCssColor(raw: unknown, fallback: string): string {
  const s = raw != null ? String(raw).trim() : '';
  return s.length > 0 ? s : fallback;
}
