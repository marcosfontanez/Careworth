import { streamsLiveService } from '@/services/supabase';
import type { LiveStream, StreamCategory } from '@/types';

export const streamsService = {
  async getLiveStreams(): Promise<LiveStream[]> {
    try {
      return await streamsLiveService.listLive();
    } catch {
      return [];
    }
  },

  async getScheduledStreams(): Promise<LiveStream[]> {
    try {
      return await streamsLiveService.listScheduled();
    } catch {
      return [];
    }
  },

  async getStreamsByCategory(category: StreamCategory): Promise<LiveStream[]> {
    try {
      return await streamsLiveService.listByCategory(category);
    } catch {
      return [];
    }
  },

  async getStreamById(id: string): Promise<LiveStream | null> {
    try {
      return await streamsLiveService.getById(id);
    } catch {
      return null;
    }
  },

  async getAllStreams(): Promise<{ live: LiveStream[]; scheduled: LiveStream[] }> {
    const [live, scheduled] = await Promise.all([this.getLiveStreams(), this.getScheduledStreams()]);
    return { live, scheduled };
  },
};
