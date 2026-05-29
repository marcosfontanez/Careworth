import { supabase } from '@/lib/supabase';
import type { RealtimeChannel } from '@supabase/supabase-js';
import {
  DEFAULT_CLIP_MARKER_DURATION,
  isClipMarkerDuration,
  normalizeClipMarkerDuration,
  type ClipMarkerDurationSeconds,
} from '@/lib/live/clipMarkerDuration';
import { liveClipMarkerDebug } from '@/lib/live/liveClipMarkerDebug';

export type { ClipMarkerDurationSeconds } from '@/lib/live/clipMarkerDuration';
export { DEFAULT_CLIP_MARKER_DURATION, CLIP_MARKER_DURATION_PRESETS } from '@/lib/live/clipMarkerDuration';

export type LiveClipMarkerStatus = 'pending' | 'submitted' | 'approved' | 'rejected';

export interface LiveClipMarker {
  id: string;
  streamId: string;
  recordingId: string | null;
  createdBy: string;
  hostId: string;
  markerTimeSeconds: number;
  startSeconds: number;
  endSeconds: number;
  clipDurationSeconds: ClipMarkerDurationSeconds | null;
  title: string;
  status: LiveClipMarkerStatus;
  createdAt: string;
}

interface LiveClipMarkerRow {
  id: string;
  stream_id: string;
  recording_id: string | null;
  created_by: string;
  host_id: string;
  marker_time_seconds: number;
  start_seconds: number;
  end_seconds: number;
  clip_duration_seconds: number | null;
  title: string;
  status: LiveClipMarkerStatus;
  created_at: string;
}

type CreateMarkerRpcResult = {
  ok?: boolean;
  code?: string;
  id?: string;
  recording_id?: string;
  status?: LiveClipMarkerStatus;
  marker_time_seconds?: number;
  start_seconds?: number;
  end_seconds?: number;
  clip_duration_seconds?: number | null;
  title?: string;
};

function rowToMarker(row: LiveClipMarkerRow): LiveClipMarker {
  return {
    id: row.id,
    streamId: row.stream_id,
    recordingId: row.recording_id,
    createdBy: row.created_by,
    hostId: row.host_id,
    markerTimeSeconds: row.marker_time_seconds,
    startSeconds: row.start_seconds,
    endSeconds: row.end_seconds,
    clipDurationSeconds: isClipMarkerDuration(row.clip_duration_seconds)
      ? row.clip_duration_seconds
      : null,
    title: row.title,
    status: row.status,
    createdAt: row.created_at,
  };
}

function isMissingTableError(message: string): boolean {
  const m = message.toLowerCase();
  return (
    m.includes('live_clip_markers') &&
    (m.includes('does not exist') || m.includes('schema cache') || m.includes('could not find'))
  );
}

function isMissingRpcError(message: string): boolean {
  const m = message.toLowerCase();
  return m.includes('create_live_clip_marker') && (m.includes('does not exist') || m.includes('schema cache'));
}

export const streamClipMarkersService = {
  async isBackendReady(): Promise<boolean> {
    try {
      const { error } = await supabase.from(
        'live_clip_markers',
      )
        .select('id')
        .limit(1);
      if (error) return !isMissingTableError(error.message);
      return true;
    } catch {
      return false;
    }
  },

  /** Host-only — RLS on live_recordings. */
  async hasActiveRecording(streamId: string): Promise<boolean> {
    if (!streamId) return false;
    try {
      const { data, error } = await supabase.from(
        'live_recordings',
      )
        .select('id')
        .eq('stream_id', streamId)
        .eq('status', 'recording')
        .limit(1)
        .maybeSingle();
      if (error) {
        if (__DEV__) console.warn('[streamClipMarkers.hasActiveRecording]', error.message);
        return false;
      }
      return Boolean(data?.id);
    } catch {
      return false;
    }
  },

  async listForHost(streamId: string, limit = 60): Promise<LiveClipMarker[]> {
    if (!streamId) return [];
    try {
      const { data, error } = await supabase.from(
        'live_clip_markers',
      )
        .select('*')
        .eq('stream_id', streamId)
        .order('created_at', { ascending: false })
        .limit(limit);

      if (error) {
        if (__DEV__ && !isMissingTableError(error.message)) {
          console.warn('[streamClipMarkers.listForHost]', error.message);
        }
        return [];
      }
      const rows = (data ?? []).map((r) => rowToMarker(r as LiveClipMarkerRow));
      liveClipMarkerDebug.markersLoaded(streamId, rows.length);
      return rows;
    } catch (err) {
      if (__DEV__) console.warn('[streamClipMarkers.listForHost]', err);
      return [];
    }
  },

  async createMarker(
    streamId: string,
    role: 'host' | 'viewer',
    durationSeconds: ClipMarkerDurationSeconds = DEFAULT_CLIP_MARKER_DURATION,
  ): Promise<{
    ok: boolean;
    code?: string;
    marker?: LiveClipMarker;
  }> {
    if (!streamId) return { ok: false, code: 'invalid_stream' };

    const duration = normalizeClipMarkerDuration(durationSeconds);
    liveClipMarkerDebug.createRequested(streamId, role, duration);

    try {
      const { data, error } = await (supabase.rpc as (name: string, args: object) => ReturnType<typeof supabase.rpc>)(
        'create_live_clip_marker',
        { p_stream_id: streamId, p_duration_seconds: duration },
      );

      if (error) {
        const code = isMissingRpcError(error.message) ? 'migration_required' : 'rpc_failed';
        liveClipMarkerDebug.createFailed(streamId, error.message, { durationSeconds: duration });
        return { ok: false, code };
      }

      const row = data as CreateMarkerRpcResult | null;
      if (!row?.ok) {
        liveClipMarkerDebug.createResult(streamId, {
          ok: false,
          code: row?.code ?? 'unknown',
          durationSeconds: duration,
        });
        return { ok: false, code: row?.code ?? 'unknown' };
      }

      const storedDuration = isClipMarkerDuration(row.clip_duration_seconds)
        ? row.clip_duration_seconds
        : duration;

      const marker: LiveClipMarker = {
        id: String(row.id),
        streamId,
        recordingId: row.recording_id ?? null,
        createdBy: '',
        hostId: '',
        markerTimeSeconds: row.marker_time_seconds ?? 0,
        startSeconds: row.start_seconds ?? 0,
        endSeconds: row.end_seconds ?? 0,
        clipDurationSeconds: storedDuration,
        title: row.title ?? 'Live moment',
        status: row.status ?? (role === 'host' ? 'submitted' : 'pending'),
        createdAt: new Date().toISOString(),
      };

      liveClipMarkerDebug.createResult(streamId, {
        ok: true,
        id: marker.id,
        status: marker.status,
        markerTimeSeconds: marker.markerTimeSeconds,
        startSeconds: marker.startSeconds,
        endSeconds: marker.endSeconds,
        clipDurationSeconds: marker.clipDurationSeconds,
      });

      return { ok: true, marker };
    } catch (err) {
      const reason = err instanceof Error ? err.message : 'unknown';
      liveClipMarkerDebug.createFailed(streamId, reason, { durationSeconds: duration });
      return { ok: false, code: 'unknown' };
    }
  },

  async reviewMarker(
    markerId: string,
    decision: 'approved' | 'rejected',
  ): Promise<{ ok: boolean; code?: string }> {
    if (!markerId) return { ok: false, code: 'invalid' };
    try {
      const { data, error } = await (supabase.rpc as (name: string, args: object) => ReturnType<typeof supabase.rpc>)(
        'review_live_clip_marker',
        { p_marker_id: markerId, p_decision: decision },
      );
      if (error) return { ok: false, code: 'rpc_failed' };
      const row = data as { ok?: boolean; code?: string } | null;
      return row?.ok ? { ok: true } : { ok: false, code: row?.code ?? 'unknown' };
    } catch {
      return { ok: false, code: 'unknown' };
    }
  },

  subscribe(streamId: string, onChange: () => void, channelScope = 'default'): () => void {
    if (!streamId) return () => {};

    const channel: RealtimeChannel = supabase
      .channel(`live_clip_markers:${channelScope}:${streamId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'live_clip_markers',
          filter: `stream_id=eq.${streamId}`,
        },
        () => onChange(),
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  },
};
