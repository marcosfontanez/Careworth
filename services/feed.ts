import type { Post, FeedType } from '@/types';
import { postsService } from './supabase';

export const feedService = {
  async getFeed(type: FeedType, userId?: string): Promise<Post[]> {
    return postsService.getFeed(type, userId);
  },

  /**
   * Returns `null` (not `undefined`) on miss or error. React Query
   * treats `undefined` as "no data yet", which would keep `isPending`
   * true and throw a "Query data cannot be undefined" error for any
   * `useQuery` that resolves a deleted / not-found post. `null` is a
   * valid cache value that lets consumers branch cleanly.
   */
  async getPostById(id: string, viewerId?: string | null): Promise<Post | null> {
    try {
      return (await postsService.getById(id, viewerId)) ?? null;
    } catch {
      return null;
    }
  },

  async getCommunityPosts(communityId: string, viewerId?: string | null): Promise<Post[]> {
    try {
      return await postsService.getByCommunity(communityId, viewerId);
    } catch {
      return [];
    }
  },

  async getUserPosts(userId: string, viewerId?: string | null): Promise<Post[]> {
    try {
      return await postsService.getByUser(userId, viewerId);
    } catch {
      return [];
    }
  },
};
