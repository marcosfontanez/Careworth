/** Human-readable extract from Supabase PostgREST / Storage errors */
export function supabaseMessage(err: unknown): string {
  if (!err || typeof err !== 'object') return String(err ?? 'Unknown error');
  const e = err as { message?: string; details?: string; hint?: string; code?: string };
  const raw = [e.message, e.details, e.hint].filter(Boolean).join(' · ');
  if (/banner_url|total_shares/i.test(raw)) {
    return `${raw}\n\nIf this mentions a missing column, apply the latest Supabase migrations (banner & shares).`;
  }
  return raw || 'Something went wrong';
}
