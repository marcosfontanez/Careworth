import type { UserProfile } from '@/types';
import { profilesService } from './supabase';

export const userService = {
  /**
   * Always resolves to `UserProfile | null`. Never `undefined` — TanStack Query v5
   * treats `undefined` from `queryFn` as “no settled value”, which can keep
   * `useUser` stuck pending / retrying and breaks creator gallery + profiles.
   */
  async getUserById(id: string): Promise<UserProfile | null> {
    if (!id) return null;
    return (await profilesService.getById(id)) ?? null;
  },

  async getUserByUsername(handle: string): Promise<UserProfile | null> {
    const h = handle.replace(/^@/, '').trim();
    if (!h) return null;
    return (await profilesService.getByUsername(h)) ?? null;
  },

  async searchUsers(query: string): Promise<UserProfile[]> {
    const q = query.trim();
    if (!q) return [];
    try {
      return await profilesService.search(q);
    } catch {
      return [];
    }
  },
};
