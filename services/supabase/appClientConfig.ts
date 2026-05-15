import { supabase } from '@/lib/supabase';

/** Singleton row (id=1): bump `min_app_version` in Supabase to force older builds to update. */
export async function fetchMinSupportedAppVersion(): Promise<string | null> {
  const { data, error } = await supabase
    .from('app_client_config')
    .select('min_app_version')
    .eq('id', 1)
    .maybeSingle();

  if (error || !data) return null;
  const v = typeof (data as { min_app_version?: unknown }).min_app_version === 'string'
    ? String((data as { min_app_version: string }).min_app_version).trim()
    : '';
  return v.length ? v : null;
}
