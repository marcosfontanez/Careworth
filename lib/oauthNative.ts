import * as WebBrowser from 'expo-web-browser';
import { makeRedirectUri } from 'expo-auth-session';
import { Platform } from 'react-native';
import { supabase } from '@/lib/supabase';

export type NativeOAuthProvider = 'google' | 'apple';

/**
 * Must match **every** value you add in Supabase → Authentication → URL Configuration → **Redirect URLs**.
 *
 * - **Web (HTTPS):** `https://your-app-host/auth/callback` (current origin + path).
 * - **Production native:** `pulseverse://auth/callback`
 *
 * Expo Go / Metro can emit `exp://…/--/auth/callback` — add that exact URI too while testing.
 */
export function getNativeOAuthRedirectUri(): string {
  if (Platform.OS === 'web' && typeof window !== 'undefined' && window.location?.origin) {
    return `${window.location.origin}/auth/callback`;
  }
  return makeRedirectUri({
    scheme: 'pulseverse',
    path: 'auth/callback',
  });
}

/** Parse `pulseverse://auth/callback?...#...` from in-app browser / deep link. */
export function parseOAuthCallbackParams(url: string): Record<string, string> {
  const out: Record<string, string> = {};
  const ingest = (segment: string) => {
    const s0 = segment.trim();
    if (!s0) return;
    try {
      new URLSearchParams(s0).forEach((v, k) => {
        out[k] = v;
      });
    } catch {
      /* non-fatal */
    }
  };

  const q = url.indexOf('?');
  const h = url.indexOf('#');
  if (h !== -1) {
    ingest(url.slice(h + 1));
  }
  if (q !== -1) {
    const end = h !== -1 && h > q ? h : url.length;
    ingest(url.slice(q + 1, end));
  }
  return out;
}

/** Exchange OAuth callback URL (query or hash) for a Supabase session. */
export async function completeSupabaseOAuthFromUrl(callbackUrl: string): Promise<{ error: Error | null }> {
  const params = parseOAuthCallbackParams(callbackUrl);

  if (params.error && params.error !== 'null') {
    const desc = params.error_description ?? params.error;
    return { error: new Error(decodeURIComponent(desc.replace(/\+/g, ' '))) };
  }

  if (params.code) {
    const { error: x } = await supabase.auth.exchangeCodeForSession(params.code);
    return { error: x ? new Error(x.message) : null };
  }

  const access = params.access_token;
  const refresh = params.refresh_token;
  if (access && refresh) {
    const { error: x } = await supabase.auth.setSession({ access_token: access, refresh_token: refresh });
    return { error: x ? new Error(x.message) : null };
  }

  return {
    error: new Error(
      'Could not read auth from callback (expected code or access_token). Check Supabase redirect URL list.',
    ),
  };
}

/**
 * Run OAuth in the system browser / ASWebAuthenticationSession and complete the Supabase session.
 */
export async function signInWithOAuthNative(provider: NativeOAuthProvider): Promise<{ error: Error | null }> {
  const redirectTo = getNativeOAuthRedirectUri();

  if (__DEV__) {
    // One-line copy for Supabase Redirect URLs if Google returns redirect_uri_mismatch / invalid_request.
    console.info('[oauth] Supabase redirectTo for this build:', redirectTo);
  }

  const { data, error: linkError } = await supabase.auth.signInWithOAuth({
    provider,
    options: {
      redirectTo,
      skipBrowserRedirect: true,
    },
  });

  if (linkError) return { error: new Error(linkError.message) };
  if (!data?.url) return { error: new Error('No OAuth URL from Supabase') };

  const result = await WebBrowser.openAuthSessionAsync(data.url, redirectTo);

  if (result.type === 'cancel' || result.type === 'dismiss') {
    return { error: null };
  }

  if (result.type !== 'success' || !result.url) {
    return { error: new Error('Sign-in was not completed') };
  }

  return completeSupabaseOAuthFromUrl(result.url);
}
