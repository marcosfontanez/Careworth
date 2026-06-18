/**
 * Dev-only: warn when onboarding WIP runs against hosted production Supabase
 * (migrations 286–303 may not exist there yet).
 */
export function warnOnboardingWipProductionSupabaseTarget(url: string): void {
  if (typeof __DEV__ === 'undefined' || !__DEV__) return;

  const trimmed = url.trim();
  if (!trimmed) return;

  try {
    const { hostname } = new URL(trimmed);
    if (
      hostname === 'localhost' ||
      hostname === '127.0.0.1' ||
      hostname.startsWith('192.168.') ||
      hostname.startsWith('10.') ||
      hostname.endsWith('.local')
    ) {
      return;
    }

    if (hostname.endsWith('.supabase.co')) {
      console.warn(
        '[onboarding] WIP onboarding requires local or staging Supabase with migrations 286–303 applied. ' +
          'A hosted *.supabase.co URL is configured — onboarding profile columns may be missing. ' +
          'Override EXPO_PUBLIC_SUPABASE_URL in .env.local (simulator: http://127.0.0.1:54321; ' +
          'physical device: http://<your-computer-LAN-IP>:54321). Restart Metro with --clear after changing env.',
      );
    }
  } catch {
    /* ignore malformed URL */
  }
}
