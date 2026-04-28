import type { UserProfile } from '@/types';
import { profilesService } from './supabase';

export const userService = {
  async getUserById(id: string): Promise<UserProfile | undefined> {
    if (!id) return undefined;
    const live = await profilesService.getById(id);
    return live ?? undefined;
  },

  async getUserByUsername(handle: string): Promise<UserProfile | undefined> {
    const h = handle.replace(/^@/, '').trim();
    if (!h) return undefined;
    const live = await profilesService.getByUsername(h);
    return live ?? undefined;
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
