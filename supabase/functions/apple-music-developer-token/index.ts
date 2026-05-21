// Deploy: npx supabase functions deploy apple-music-developer-token
//
// Requires a valid logged-in Supabase session:
//   Authorization: Bearer <user access token>
// plus project apikey (sent automatically by supabase.functions.invoke).
//
// Secrets: APPLE_TEAM_ID, APPLE_KEY_ID, APPLE_P8_KEY (see README.txt)
// Optional: EDGE_CORS_ALLOWLIST — single origin for browser callers.

import { SignJWT, importPKCS8 } from 'npm:jose@5';
import { createClient } from 'npm:@supabase/supabase-js@2';

import { edgeCorsHeaders } from '../_shared/edgeCors.ts';
import {
  getSupabasePublishableKey,
  getSupabaseUrl,
  isProjectApiKey,
} from '../_shared/supabaseEnv.ts';

function corsHeaders(): Record<string, string> {
  return edgeCorsHeaders({
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  });
}

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders(), 'Content-Type': 'application/json' },
  });
}

/** Supabase clients send this — blocks drive-by traffic that isn’t using your project. */
function hasProjectApiKey(req: Request): boolean {
  return isProjectApiKey(req);
}

async function getAuthedUserId(
  supabaseUrl: string,
  anonKey: string,
  authHeader: string | null,
): Promise<string | null> {
  if (!authHeader?.startsWith('Bearer ')) return null;
  const sb = createClient(supabaseUrl, anonKey, {
    global: { headers: { Authorization: authHeader } },
  });
  const { data, error } = await sb.auth.getUser();
  if (error || !data.user?.id) return null;
  return data.user.id;
}

/** Best-effort per-isolate cap so one account cannot hammer Apple token minting. */
const RL_WINDOW_MS = 60_000;
const RL_MAX_PER_WINDOW = 30;
const rlBuckets = new Map<string, number[]>();

function rateLimitAllow(userId: string): boolean {
  const now = Date.now();
  const cutoff = now - RL_WINDOW_MS;
  const next = (rlBuckets.get(userId) ?? []).filter((t) => t > cutoff);
  if (next.length >= RL_MAX_PER_WINDOW) {
    rlBuckets.set(userId, next);
    return false;
  }
  next.push(now);
  rlBuckets.set(userId, next);
  return true;
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders() });
  }

  const supabaseUrl = getSupabaseUrl();
  const publishableKey = getSupabasePublishableKey();
  if (!supabaseUrl || !publishableKey) {
    return json({ error: 'Server misconfigured.' }, 503);
  }

  if (!hasProjectApiKey(req)) {
    return json({ error: 'Forbidden' }, 403);
  }

  const authHeader = req.headers.get('Authorization');
  const userId = await getAuthedUserId(supabaseUrl, publishableKey, authHeader);
  if (!userId) {
    return json({ error: 'Unauthorized', hint: 'Sign in required.' }, 401);
  }

  if (!rateLimitAllow(userId)) {
    return json({ error: 'Too many requests', retry_after_seconds: Math.ceil(RL_WINDOW_MS / 1000) }, 429);
  }

  try {
    const teamId = Deno.env.get('APPLE_TEAM_ID');
    const keyId = Deno.env.get('APPLE_KEY_ID');
    let p8 = Deno.env.get('APPLE_P8_KEY');

    if (!teamId || !keyId || !p8) {
      return json({ error: 'Apple Music is not configured on the server.' }, 503);
    }

    p8 = p8.replace(/\\n/g, '\n').trim();
    const key = await importPKCS8(p8, 'ES256');

    const token = await new SignJWT({})
      .setProtectedHeader({ alg: 'ES256', kid: keyId })
      .setIssuer(teamId)
      .setIssuedAt()
      .setExpirationTime('150d')
      .sign(key);

    return json({ token, expires_in: 12_960_000 });
  } catch (e) {
    const message = e instanceof Error ? e.message : String(e);
    return json({ error: message }, 500);
  }
});
