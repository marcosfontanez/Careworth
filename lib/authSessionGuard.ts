import { supabase } from '@/lib/supabase';

let NetInfo: { fetch: () => Promise<{ isConnected?: boolean | null }> } | null = null;
try {
  NetInfo = require('@react-native-community/netinfo')?.default;
} catch {
  NetInfo = null;
}

export type AuthSessionGuardResult = 'ok' | 'signed_out' | 'banned';

async function deviceLooksOnline(): Promise<boolean> {
  try {
    if (!NetInfo) return true;
    const s = await NetInfo.fetch();
    return Boolean(s.isConnected);
  } catch {
    return true;
  }
}

function isInvalidAuthSessionError(error: unknown): boolean {
  if (!error || typeof error !== 'object') return false;
  const e = error as { status?: number; message?: string; name?: string };
  const status = e.status;
  if (status === 401 || status === 403) return true;
  const name = String(e.name || '');
  if (name === 'AuthSessionMissingError' || name === 'AuthApiError') {
    const msg = String(e.message || '').toLowerCase();
    if (
      msg.includes('invalid jwt') ||
      msg.includes('jwt expired') ||
      msg.includes('invalid refresh token') ||
      msg.includes('refresh token') ||
      msg.includes('session expired') ||
      msg.includes('user not found') ||
      msg.includes('not authorized')
    ) {
      return true;
    }
    if (status === 400 && msg.includes('jwt')) return true;
  }
  return false;
}

/**
 * Re-validates the JWT with Supabase Auth and checks for an active `user_bans` row.
 * Use when the app foregrounds or on a timer so deleted / banned users cannot stay in-app
 * until the access token happens to expire.
 */
export async function validateServerAuthSession(): Promise<AuthSessionGuardResult> {
  const online = await deviceLooksOnline();
  if (!online) return 'ok';

  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();

  if (error && !user) {
    return isInvalidAuthSessionError(error) ? 'signed_out' : 'ok';
  }
  if (!user) return 'signed_out';

  const nowIso = new Date().toISOString();
  const { data: banRows, error: banErr } = await supabase
    .from('user_bans')
    .select('id')
    .eq('user_id', user.id)
    .or(`expires_at.is.null,expires_at.gt.${nowIso}`)
    .limit(1);

  if (banErr) {
    console.warn('[authSessionGuard] user_bans check failed', banErr.message);
    return 'ok';
  }
  if (banRows && banRows.length > 0) return 'banned';

  return 'ok';
}
