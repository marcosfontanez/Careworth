import { filterActiveLiveStreams } from '@/lib/live/activeLiveStreams';
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
    videoProvider: row.video_provider ?? 'livekit',
    livekitRoomName: row.livekit_room_name ?? undefined,
    broadcastStartedAt: row.broadcast_started_at ?? undefined,
    hostLastSeenAt: row.host_last_seen_at ?? undefined,
    recordingEnabled: Boolean(row.recording_enabled),
  };
}

export type EndStreamResult =
  | { ok: true; reason?: 'already_ended' }
  | { ok: false; reason: string };

function parseEndStreamRpc(data: unknown): EndStreamResult {
  if (data && typeof data === 'object' && 'ok' in data) {
    const row = data as { ok?: boolean; reason?: string };
    if (row.ok) {
      return row.reason === 'already_ended'
        ? { ok: true, reason: 'already_ended' }
        : { ok: true };
    }
    return { ok: false, reason: row.reason ?? 'unknown' };
  }
  return { ok: false, reason: 'invalid_response' };
}

async function endStreamDirect(streamId: string): Promise<EndStreamResult> {
  const endedAt = new Date().toISOString();
  const { data, error } = await supabase
    .from('live_streams')
    .update({ status: 'ended', ended_at: endedAt, viewer_count: 0 })
    .eq('id', streamId)
    .eq('status', 'live')
    .select('id')
    .maybeSingle();

  if (error) {
    if (__DEV__) console.warn('[streamsLive.endStreamDirect]', error.message);
    return { ok: false, reason: error.message };
  }
  if (data) return { ok: true };

  const { data: existing } = await supabase
    .from('live_streams')
    .select('status')
    .eq('id', streamId)
    .maybeSingle();
  if (existing?.status === 'ended') return { ok: true, reason: 'already_ended' };
  return { ok: false, reason: 'not_updated' };
}

function isMissingRpcError(message: string): boolean {
  const m = message.toLowerCase();
  return m.includes('does not exist') || m.includes('could not find the function');
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
      .is('ended_at', null)
      .not('broadcast_started_at', 'is', null)
      .order('viewer_count', { ascending: false });

    if (error) throw error;
    return filterActiveLiveStreams((data ?? []).map(rowToStream));
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
      .is('ended_at', null)
      .not('broadcast_started_at', 'is', null)
      .eq('category', category)
      .order('viewer_count', { ascending: false });

    if (error) throw error;
    return filterActiveLiveStreams((data ?? []).map(rowToStream));
  },

  async getById(id: string): Promise<LiveStream | null> {
    const { data, error } = await supabase.from('live_streams').select(STREAM_SELECT).eq('id', id).maybeSingle();
    if (error || !data) return null;
    return rowToStream(data);
  },

  /**
   * Create a stream row — either instant (`live`, broadcast pending) or `scheduled`.
   * LiveKit room name is assigned by DB trigger when omitted.
   */
  async createStream(input: {
    hostId: string;
    title: string;
    description?: string;
    category: StreamCategory;
    tags?: string[];
    thumbnailUrl?: string;
    communityId?: string;
    /** ISO timestamp — when set, creates a scheduled session instead of going live immediately. */
    scheduledFor?: string | null;
  }): Promise<LiveStream | null> {
    if (!input.hostId || !input.title.trim()) return null;

    const scheduled = Boolean(input.scheduledFor);
    const payload: Record<string, unknown> = {
      host_id: input.hostId,
      title: input.title.trim().slice(0, 100),
      description: input.description?.trim().slice(0, 300) || null,
      category: input.category,
      tags: input.tags ?? [],
      thumbnail_url: input.thumbnailUrl ?? null,
      community_id: input.communityId ?? null,
      video_provider: 'livekit',
      status: scheduled ? 'scheduled' : 'live',
      started_at: scheduled ? null : new Date().toISOString(),
      scheduled_for: scheduled ? input.scheduledFor : null,
      broadcast_started_at: null,
    };

    const { data, error } = await (supabase.from('live_streams') as any)
      .insert(payload)
      .select(STREAM_SELECT)
      .single();

    if (error) {
      if (__DEV__) console.warn('[streamsLive.createStream]', error.message);
      return null;
    }
    return rowToStream(data);
  },

  /** Host: flip scheduled → live when opening the broadcast (before LiveKit connects). */
  async promoteScheduledToLive(streamId: string): Promise<boolean> {
    if (!streamId) return false;
    const { error } = await supabase
      .from('live_streams')
      .update({
        status: 'live',
        started_at: new Date().toISOString(),
      })
      .eq('id', streamId)
      .eq('status', 'scheduled');
    if (error) {
      if (__DEV__) console.warn('[streamsLive.promoteScheduledToLive]', error.message);
      return false;
    }
    return true;
  },

  /** Host: first successful LiveKit publish — makes the stream discoverable as live. */
  async markBroadcastStarted(streamId: string): Promise<boolean> {
    if (!streamId) return false;
    const now = new Date().toISOString();
    const { error } = await (supabase.from('live_streams') as any)
      .update({ broadcast_started_at: now, host_last_seen_at: now })
      .eq('id', streamId)
      .eq('status', 'live');
    if (error) {
      if (__DEV__) console.warn('[streamsLive.markBroadcastStarted]', error.message);
      return false;
    }
    return true;
  },

  /**
   * Host bailout — ends a row that never reached LiveKit broadcast (or abandons a scheduled row).
   */
  async abortUnbroadcastStream(streamId: string): Promise<boolean> {
    if (!streamId) return false;
    const { error } = await (supabase.from('live_streams') as any)
      .update({
        status: 'ended',
        ended_at: new Date().toISOString(),
      })
      .eq('id', streamId)
      .is('broadcast_started_at', null);

    if (error) {
      if (__DEV__) console.warn('[streamsLive.abortUnbroadcastStream]', error.message);
      return false;
    }
    return true;
  },

  /** Host-only liveness ping while broadcasting (stale-stream cleanup). */
  async touchHostHeartbeat(streamId: string): Promise<boolean> {
    if (!streamId) return false;
    const { data, error } = await (supabase.rpc as any)('live_host_touch_heartbeat', {
      p_stream_id: streamId,
    });
    if (error) {
      if (isMissingRpcError(error.message)) {
        const { error: upErr } = await (supabase.from('live_streams') as any)
          .update({ host_last_seen_at: new Date().toISOString() })
          .eq('id', streamId)
          .eq('status', 'live');
        return !upErr;
      }
      if (__DEV__) console.warn('[streamsLive.touchHostHeartbeat]', error.message);
      return false;
    }
    return data === true;
  },

  /**
   * Periodic viewer heartbeat — updates `viewer_count` / `peak_viewer_count` via SECURITY DEFINER RPC.
   */
  async touchAttendance(streamId: string): Promise<number | null> {
    if (!streamId) return null;
    const { data, error } = await (supabase.rpc as any)('live_touch_stream_attendance', {
      p_stream_id: streamId,
    });
    if (error) {
      if (__DEV__) console.warn('[streamsLive.touchAttendance]', error.message);
      return null;
    }
    return typeof data === 'number' ? data : Number(data);
  },

  async listMyReminderStreamIds(): Promise<Set<string>> {
    const { data: userData } = await supabase.auth.getUser();
    const uid = userData.user?.id;
    if (!uid) return new Set();

    const { data, error } = await (supabase as any)
      .from('live_stream_reminders')
      .select('stream_id')
      .eq('user_id', uid);

    if (error) {
      if (__DEV__) console.warn('[streamsLive.listMyReminderStreamIds]', error.message);
      return new Set();
    }
    return new Set((data ?? []).map((r: { stream_id: string }) => r.stream_id));
  },

  async hasReminder(streamId: string): Promise<boolean> {
    const { data: userData } = await supabase.auth.getUser();
    const uid = userData.user?.id;
    if (!uid || !streamId) return false;

    const { data, error } = await (supabase as any)
      .from('live_stream_reminders')
      .select('stream_id')
      .eq('user_id', uid)
      .eq('stream_id', streamId)
      .maybeSingle();

    if (error) {
      if (__DEV__) console.warn('[streamsLive.hasReminder]', error.message);
      return false;
    }
    return !!data;
  },

  /** Persist reminder — push scheduling is still a separate pipeline (see Live hub toast copy). */
  async addReminder(streamId: string): Promise<boolean> {
    const { data: userData } = await supabase.auth.getUser();
    const uid = userData.user?.id;
    if (!uid || !streamId) return false;

    const { error } = await (supabase as any).from('live_stream_reminders').upsert(
      { user_id: uid, stream_id: streamId },
      { onConflict: 'user_id,stream_id' },
    );
    if (error) {
      if (__DEV__) console.warn('[streamsLive.addReminder]', error.message);
      return false;
    }
    return true;
  },

  async removeReminder(streamId: string): Promise<boolean> {
    const { data: userData } = await supabase.auth.getUser();
    const uid = userData.user?.id;
    if (!uid || !streamId) return false;

    const { error } = await (supabase as any)
      .from('live_stream_reminders')
      .delete()
      .eq('user_id', uid)
      .eq('stream_id', streamId);

    if (error) {
      if (__DEV__) console.warn('[streamsLive.removeReminder]', error.message);
      return false;
    }
    return true;
  },

  /** @returns next reminder-on state, or `null` if the write failed. */
  async toggleReminder(streamId: string): Promise<boolean | null> {
    const on = await streamsLiveService.hasReminder(streamId);
    if (on) {
      const ok = await streamsLiveService.removeReminder(streamId);
      return ok ? false : null;
    }
    const ok = await streamsLiveService.addReminder(streamId);
    return ok ? true : null;
  },

  /**
   * End a stream atomically via RPC (status, ended_at, viewer_count, polls).
   * Retries once; falls back to direct update if RPC is not deployed yet.
   */
  async endStream(streamId: string): Promise<EndStreamResult> {
    if (!streamId) return { ok: false, reason: 'missing_stream_id' };

    const tryRpc = async (): Promise<EndStreamResult | 'missing_rpc'> => {
      const { data, error } = await (supabase.rpc as any)('end_live_stream', {
        p_stream_id: streamId,
      });
      if (error) {
        if (isMissingRpcError(error.message)) return 'missing_rpc';
        if (__DEV__) console.warn('[streamsLive.endStream]', error.message);
        return { ok: false, reason: error.message };
      }
      return parseEndStreamRpc(data);
    };

    let result = await tryRpc();
    if (result === 'missing_rpc') {
      return endStreamDirect(streamId);
    }
    if (!result.ok) {
      await new Promise((r) => setTimeout(r, 800));
      const retry = await tryRpc();
      if (retry === 'missing_rpc') {
        return endStreamDirect(streamId);
      }
      result = retry;
    }
    return result;
  },

  /**
   * Subscribe to `live_streams` UPDATE events (status, broadcast_started_at, ended_at).
   * Used for near-instant ended-state propagation without polling.
   */
  subscribeStatus(
    streamId: string,
    onUpdate: (row: { status?: string; broadcast_started_at?: string | null; ended_at?: string | null }) => void,
  ): () => void {
    if (!streamId) return () => {};

    const channel = supabase
      .channel(`live_streams:${streamId}`)
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'live_streams',
          filter: `id=eq.${streamId}`,
        },
        (payload) => {
          const row = payload.new as Record<string, unknown>;
          onUpdate({
            status: typeof row.status === 'string' ? row.status : undefined,
            broadcast_started_at:
              row.broadcast_started_at === null || typeof row.broadcast_started_at === 'string'
                ? (row.broadcast_started_at as string | null)
                : undefined,
            ended_at:
              row.ended_at === null || typeof row.ended_at === 'string'
                ? (row.ended_at as string | null)
                : undefined,
          });
        },
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  },
};
