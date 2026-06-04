import 'react-native-url-polyfill/auto';
import { Platform } from 'react-native';
import { createClient, processLock } from '@supabase/supabase-js';
import type { Database } from './database.types';
import { supabaseAuthStorage } from './authStorage';

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL?.trim() ?? '';
const supabaseAnonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY?.trim() ?? '';

if (!supabaseUrl || !supabaseAnonKey) {
  console.error(
    '[supabase] Missing EXPO_PUBLIC_SUPABASE_URL or EXPO_PUBLIC_SUPABASE_ANON_KEY — check .env and restart Metro.',
  );
}

/**
 * Valid-looking placeholders keep the client constructible when env is misconfigured;
 * `getSession()` still resolves and auth UI can load instead of hanging forever.
 */
export const SUPABASE_URL = supabaseUrl || 'https://invalid.localhost.supabase.co';
export const SUPABASE_ANON_KEY = supabaseAnonKey || 'invalid-anon-key';

const resolvedUrl = SUPABASE_URL;
const resolvedKey = SUPABASE_ANON_KEY;

export const supabase = createClient<Database>(resolvedUrl, resolvedKey, {
  auth: {
    storage: supabaseAuthStorage as any,
    /**
     * Use Supabase's in-memory `processLock` on every platform.
     *
     * On web, supabase-js defaults to the browser `navigator.locks` API, whose
     * holder is force-"stolen" after ~5s. During cold boot we fire the profile
     * row + 5 satellite reads + token auto-refresh, all of which acquire the
     * single exclusive auth-token lock. On a slow/flaky network the refresh
     * holds the lock past 5s, the lock is stolen, and the in-flight queries
     * abort with "Lock broken by another request with the 'steal' option" —
     * which stalled profile hydrate past the 18s timeout and left My Pulse
     * stuck loading. `processLock` queues instead of stealing, so the holder
     * finishes and queued reads resolve in order. (Native already uses
     * processLock by default; this only changes web behavior.)
     */
    lock: processLock,
    autoRefreshToken: true,
    /**
     * Session JSON (access + refresh token) lives in AsyncStorage / localStorage
     * via `supabaseAuthStorage`. Users stay signed in across kills and upgrades
     * until they tap Sign out, refresh token expires/revokes, or the server
     * session guard signs them out (banned / invalid JWT).
     */
    persistSession: true,
    /** Browser: pick up tokens from magic-link / OAuth redirects in the hash/query. Native uses deep links + callback screen. */
    detectSessionInUrl: Platform.OS === 'web',
  },
});
