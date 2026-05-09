import 'react-native-url-polyfill/auto';
import { Platform } from 'react-native';
import { createClient } from '@supabase/supabase-js';
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
const resolvedUrl = supabaseUrl || 'https://invalid.localhost.supabase.co';
const resolvedKey = supabaseAnonKey || 'invalid-anon-key';

export const supabase = createClient<Database>(resolvedUrl, resolvedKey, {
  auth: {
    storage: supabaseAuthStorage as any,
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
