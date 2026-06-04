/**
 * Canonical circles/communities API for the mobile app.
 * Wraps `communitiesService` with auth-aware helpers (`toggleJoin`, alerts).
 * Prefer `import { communityService } from '@/services'` (not direct `@/services/supabase` imports)
 * unless you need raw rows without session helpers.
 */
import type { Community } from '@/types';
import { communitiesService } from './supabase';
import { supabase } from '@/lib/supabase';

export const communityService = {
  async getAll(): Promise<Community[]> {
    return communitiesService.getAll();
  },

  /** Use `null` for missing rows — TanStack Query must not settle `undefined` from `queryFn`. */
  async getBySlug(slug: string): Promise<Community | null> {
    const live = await communitiesService.getBySlug(slug);
    return live ?? null;
  },

  async getById(id: string): Promise<Community | null> {
    const live = await communitiesService.getById(id);
    return live ?? null;
  },

  async getFeatured(): Promise<Community[]> {
    const all = await communitiesService.getAll();
    return all.filter((c) => c.memberCount >= 500).slice(0, 12);
  },

  async search(query: string): Promise<Community[]> {
    return communitiesService.search(query);
  },

  async toggleJoin(communityId: string, options?: { notifyNewPosts?: boolean }): Promise<boolean> {
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return false;
    return communitiesService.toggleJoin(user.id, communityId, options);
  },

  /** Authoritative membership check for the signed-in user (bypasses cached joined-ids). */
  async isMember(communityId: string): Promise<boolean> {
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return false;
    return communitiesService.isMember(user.id, communityId);
  },

  async setCirclePostAlerts(communityId: string, enabled: boolean): Promise<void> {
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) throw new Error('Not signed in');
    await communitiesService.setMemberNotifyNewPosts(user.id, communityId, enabled);
  },

  async getCirclePostAlerts(communityId: string): Promise<boolean | null> {
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return null;
    return communitiesService.getMemberNotifyNewPosts(user.id, communityId);
  },
};
