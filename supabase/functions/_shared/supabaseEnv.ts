/**
 * Resolve Supabase API keys for Edge Functions.
 * Prefers SUPABASE_PUBLISHABLE_KEYS / SUPABASE_SECRET_KEYS (current),
 * falls back to legacy SUPABASE_ANON_KEY / SUPABASE_SERVICE_ROLE_KEY.
 *
 * @see https://supabase.com/docs/guides/functions/secrets
 */

function parseKeyDictionary(raw: string | undefined): Record<string, string> {
  if (!raw?.trim()) return {};
  try {
    const parsed = JSON.parse(raw) as unknown;
    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) return {};
    const out: Record<string, string> = {};
    for (const [k, v] of Object.entries(parsed)) {
      if (typeof v === "string" && v.trim()) out[k] = v.trim();
    }
    return out;
  } catch {
    return {};
  }
}

function pickFromDictionary(dict: Record<string, string>, keyName = "default"): string | null {
  const named = dict[keyName]?.trim();
  if (named) return named;
  for (const value of Object.values(dict)) {
    if (value.trim()) return value.trim();
  }
  return null;
}

/** Publishable (RLS-respecting) key — replaces legacy anon key. */
export function getSupabasePublishableKey(keyName = "default"): string | null {
  const fromDict = pickFromDictionary(
    parseKeyDictionary(Deno.env.get("SUPABASE_PUBLISHABLE_KEYS")),
    keyName,
  );
  if (fromDict) return fromDict;
  return Deno.env.get("SUPABASE_ANON_KEY")?.trim() ?? null;
}

/** Secret (service) key — replaces legacy service_role key. Edge Functions only. */
export function getSupabaseSecretKey(keyName = "default"): string | null {
  const fromDict = pickFromDictionary(
    parseKeyDictionary(Deno.env.get("SUPABASE_SECRET_KEYS")),
    keyName,
  );
  if (fromDict) return fromDict;
  return Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")?.trim() ?? null;
}

/** True when `apikey` header matches project publishable or legacy anon key. */
export function isProjectApiKey(req: Request): boolean {
  const apikey = req.headers.get("apikey");
  if (!apikey) return false;

  const publishable = getSupabasePublishableKey();
  if (publishable && apikey === publishable) return true;

  const legacyAnon = Deno.env.get("SUPABASE_ANON_KEY")?.trim();
  if (legacyAnon && apikey === legacyAnon) return true;

  const dict = parseKeyDictionary(Deno.env.get("SUPABASE_PUBLISHABLE_KEYS"));
  return Object.values(dict).some((k) => k === apikey);
}

export function getSupabaseUrl(): string | null {
  return Deno.env.get("SUPABASE_URL")?.trim() ?? null;
}
