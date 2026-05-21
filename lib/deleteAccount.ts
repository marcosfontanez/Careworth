/**
 * Client helper for the `delete-account` Edge Function.
 * Hard-deletes auth.users (cascades to profiles and most app data).
 */

import { supabase } from '@/lib/supabase';

const PROJECT_FUNCTIONS = 'functions/v1';

export type DeleteAccountResult =
  | { ok: true }
  | { ok: false; code: string; message: string };

export async function invokeDeleteAccount(): Promise<DeleteAccountResult> {
  const { data: sessionData } = await supabase.auth.getSession();
  const token = sessionData.session?.access_token;
  if (!token) {
    return { ok: false, code: 'UNAUTHORIZED', message: 'Not signed in.' };
  }

  const base = process.env.EXPO_PUBLIC_SUPABASE_URL?.replace(/\/$/, '') ?? '';
  if (!base) {
    return {
      ok: false,
      code: 'SERVER_MISCONFIGURED',
      message: 'EXPO_PUBLIC_SUPABASE_URL is missing.',
    };
  }

  const anon = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY ?? '';
  const res = await fetch(`${base}/${PROJECT_FUNCTIONS}/delete-account`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
      apikey: anon,
    },
    body: JSON.stringify({}),
  });

  const json = (await res.json().catch(() => null)) as
    | { ok?: boolean; error?: string; code?: string }
    | null;

  if (res.ok && json?.ok === true) {
    return { ok: true };
  }

  const message =
    (typeof json?.error === 'string' && json.error) ||
    (res.status === 404
      ? 'Account deletion service is not deployed. Contact support@pulseverse.app.'
      : `Account deletion failed (HTTP ${res.status}).`);

  return {
    ok: false,
    code: typeof json?.code === 'string' ? json.code : 'DELETE_FAILED',
    message,
  };
}
