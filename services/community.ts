import type { Community } from '@/types';
import { communitiesService } from './supabase';
import { supabase } from '@/lib/supabase';

export const communityService = {
  async getAll(): Promise<Community[]> {
    return communitiesService.getAll();
  },

  async getBySlug(slug: string): Promise<Community | undefined> {
    const live = await communitiesService.getBySlug(slug);
    return live ?? undefined;
  },

  async getById(id: string): Promise<Community | undefined> {
    const live = await communitiesService.getById(id);
    return live ?? undefined;
  },

  async getFeatured(): Promise<Community[]> {
    const all = await communitiesService.getAll();
    return all.filter((c) => c.memberCount >= 500).slice(0, 12);
  },

  async search(query: string): Promise<Community[]> {
    return communitiesService.search(query);
  },

  async toggleJoin(communityId: string): Promise<boolean> {
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return false;
    return communitiesService.toggleJoin(user.id, communityId);
  },
};
