import { supabase } from '@/lib/supabase';
import type { CreatorSummary, LiveStream, StreamCategory } from '@/types';
import {
  profileRowToCreatorSummary,
  unknownCreatorSummary,
} from './profileRowMapper';

function hostFromRow(h: any): CreatorSummary {
  if (!h) return { ...unknownCreatorSummary(), displayName: 'Host' };
  return profileRowToCreatorSummary(h);
}

function rowToStream(row: any): LiveStream {
  return {
    id: row.id,
    hostId: row.host_id,
    host: hostFromRow(row.host),
    title: row.title,
    description: row.description ?? undefined,
    category: (row.category ?? 'other') as StreamCategory,
    thumbnailUrl: row.thumbnail_url ?? undefined,
    status: row.status,
    viewerCount: row.viewer_count ?? 0,
    peakViewerCount: row.peak_viewer_count ?? 0,
    startedAt: row.started_at ?? '',
    scheduledFor: row.scheduled_for ?? undefined,
    endedAt: row.ended_at ?? undefined,
    tags: row.tags ?? [],
    communityId: row.community_id ?? undefined,
  };
}

const STREAM_SELECT = `
  *,
  host:host_id(id, display_name, username, avatar_url, role, specialty, city, state, is_verified, pulse_tier, pulse_score_current)
`;

export const streamsLiveService = {
  async listLive(): Promise<LiveStream[]> {
    const { data, error } = await supabase
      .from('live_streams')
      .select(STREAM_SELECT)
      .eq('status', 'live')
      .order('viewer_count', { ascending: false });

    if (error) throw error;
    return (data ?? []).map(rowToStream);
  },

  async listScheduled(): Promise<LiveStream[]> {
    const { data, error } = await supabase
      .from('live_streams')
      .select(STREAM_SELECT)
      .eq('status', 'scheduled')
      .order('scheduled_for', { ascending: true });

    if (error) throw error;
    return (data ?? []).map(rowToStream);
  },

  async listByCategory(category: StreamCategory): Promise<LiveStream[]> {
    const { data, error } = await supabase
      .from('live_streams')
      .select(STREAM_SELECT)
      .eq('status', 'live')
      .eq('category', category)
      .order('viewer_count', { ascending: false });

    if (error) throw error;
    return (data ?? []).map(rowToStream);
  },

  async getById(id: string): Promise<LiveStream | null> {
    const { data, error } = await supabase.from('live_streams').select(STREAM_SELECT).eq('id', id).maybeSingle();
    if (error || !data) return null;
    return rowToStream(data);
  },

  /**
   * Create a new live stream row and mark it active. Returns the full stream
   * (with host hydrated) so the Go Live flow can push straight to the room.
   *
   * `status` defaults to `'live'` because PulseVerse streams are always
   * instantly live — we removed Upcoming Sessions from the product.
   */
  async createStream(input: {
    hostId: string;
    title: string;
    description?: string;
    category: StreamCategory;
    tags?: string[];
    thumbnailUrl?: string;
    communityId?: string;
  }): Promise<LiveStream | null> {
    if (!input.hostId || !input.title.trim()) return null;

    const payload = {
      host_id: input.hostId,
      title: input.title.trim().slice(0, 100),
      description: input.description?.trim().slice(0, 300) || null,
      category: input.category,
      tags: input.tags ?? [],
      thumbnail_url: input.thumbnailUrl ?? null,
      community_id: input.communityId ?? null,
      status: 'live' as const,
      started_at: new Date().toISOString(),
    };

    const { data, error } = await supabase
      .from('live_streams')
      .insert(payload)
      .select(STREAM_SELECT)
      .single();

    if (error) {
      if (__DEV__) console.warn('[streamsLive.createStream]', error.message);
      return null;
    }
    return rowToStream(data);
  },

  /**
   * End a stream. Flips `status` to `'ended'` and stamps `ended_at`. RLS
   * (from migration 006) guarantees only the host can do this.
   */
  async endStream(streamId: string): Promise<boolean> {
    if (!streamId) return false;
    const { error } = await supabase
      .from('live_streams')
      .update({ status: 'ended', ended_at: new Date().toISOString() })
      .eq('id', streamId);
    if (error) {
      if (__DEV__) console.warn('[streamsLive.endStream]', error.message);
      return false;
    }
    return true;
  },
};
