import { supabase } from '@/lib/supabase';

/**
 * Calls Edge Function when deployed. Requires OPENAI_API_KEY on the function.
 * Until configured, returns a graceful fallback — creators can paste transcript for PHI scan.
 */
export async function requestVideoTranscription(_videoUri: string): Promise<{
  text: string | null;
  message: string;
}> {
  const base = (process.env.EXPO_PUBLIC_SUPABASE_URL ?? '').replace(/\/$/, '');
  if (!base || base.includes('invalid.localhost')) {
    return { text: null, message: 'Supabase URL not configured.' };
  }

  const { data: sessionData } = await supabase.auth.getSession();
  const token = sessionData.session?.access_token;
  if (!token) {
    return { text: null, message: 'Sign in to use captions beta.' };
  }

  try {
    const res = await fetch(`${base}/functions/v1/transcribe-creator-audio`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ stub: true }),
    });
    const json = (await res.json().catch(() => ({}))) as { text?: string; message?: string };
    if (!res.ok) {
      return { text: null, message: json.message ?? `Captions unavailable (${res.status})` };
    }
    return { text: json.text?.trim() || null, message: json.message ?? 'OK' };
  } catch (e) {
    return { text: null, message: e instanceof Error ? e.message : 'Network error' };
  }
}
