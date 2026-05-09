import { AppState, Platform } from 'react-native';
import { supabase } from '@/lib/supabase';

/**
 * Supabase JS pauses JWT auto-refresh while the RN app is backgrounded.
 * Without an explicit foreground restart, the access token can stay stale until
 * the next manual network call — then `onAuthStateChange` + our profile hydrate
 * can blank the UI. Official RN guidance: toggle auto-refresh with AppState.
 *
 * @see https://supabase.com/docs/reference/javascript/auth-startautorefresh
 */
export function attachSupabaseAuthAutoRefreshToAppState(): () => void {
  if (Platform.OS === 'web') {
    return () => {};
  }

  const sync = (state: string) => {
    if (state === 'active') {
      void supabase.auth.startAutoRefresh();
    } else {
      void supabase.auth.stopAutoRefresh();
    }
  };

  sync(AppState.currentState);
  const sub = AppState.addEventListener('change', sync);
  return () => sub.remove();
}
