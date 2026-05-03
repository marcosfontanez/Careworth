import type { User } from '@supabase/supabase-js';

/** True when the account can set a Supabase password (email / password sign-in). */
export function userHasEmailPasswordIdentity(user: User | null | undefined): boolean {
  return Boolean(user?.identities?.some((i) => i.provider === 'email'));
}
