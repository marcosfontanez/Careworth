import { supabase } from '@/lib/supabase';
import { parseOAuthCallbackParams } from '@/lib/oauthNative';

export type RecoverySessionErrorCode =
  | 'missing_token'
  | 'expired'
  | 'invalid'
  | 'error';

export type RecoverySessionResult =
  | { ok: true }
  | { ok: false; code: RecoverySessionErrorCode; message: string };

function decodeAuthErrorMessage(params: Record<string, string>): string | null {
  const raw =
    params.error_description?.replace(/\+/g, ' ') ||
    params.error?.replace(/\+/g, ' ') ||
    '';
  const trimmed = raw.trim();
  return trimmed.length > 0 ? trimmed : null;
}

function mapSupabaseAuthError(message: string): RecoverySessionErrorCode {
  const lower = message.toLowerCase();
  if (lower.includes('expired') || lower.includes('otp_expired')) return 'expired';
  if (lower.includes('invalid') || lower.includes('jwt') || lower.includes('token')) return 'invalid';
  return 'error';
}

/**
 * Parse a Supabase password-recovery deep link (`pulseverse://auth/reset-password?…#…`)
 * and establish a short-lived recovery session before `updateUser({ password })`.
 */
export async function establishRecoverySessionFromUrl(url: string): Promise<RecoverySessionResult> {
  const params = parseOAuthCallbackParams(url);
  const authError = decodeAuthErrorMessage(params);
  if (authError) {
    return {
      ok: false,
      code: mapSupabaseAuthError(authError),
      message: authError,
    };
  }

  if (params.code) {
    const { error } = await supabase.auth.exchangeCodeForSession(params.code);
    if (error) {
      return {
        ok: false,
        code: mapSupabaseAuthError(error.message),
        message: error.message,
      };
    }
  } else {
    const access = params.access_token;
    const refresh = params.refresh_token;
    if (!access || !refresh) {
      return {
        ok: false,
        code: 'missing_token',
        message: 'This reset link is missing a recovery token. Request a new password reset email.',
      };
    }
    const { error } = await supabase.auth.setSession({
      access_token: access,
      refresh_token: refresh,
    });
    if (error) {
      return {
        ok: false,
        code: mapSupabaseAuthError(error.message),
        message: error.message,
      };
    }
  }

  const {
    data: { session },
    error: sessionError,
  } = await supabase.auth.getSession();

  if (sessionError || !session?.user) {
    return {
      ok: false,
      code: 'missing_token',
      message: sessionError?.message ?? 'Could not start a recovery session. Request a new reset email.',
    };
  }

  return { ok: true };
}
