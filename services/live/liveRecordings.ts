import { supabase } from '@/lib/supabase';
import { liveRecordingDebug } from '@/lib/live/liveRecordingDebug';

export type LiveRecordingStatus =
  | 'pending'
  | 'recording'
  | 'completed'
  | 'failed'
  | 'stopped';

export type LiveRecordingRow = {
  id: string;
  streamId: string;
  hostId: string;
  roomName: string;
  egressId: string | null;
  storagePath: string | null;
  status: LiveRecordingStatus;
  startedAt: string | null;
  endedAt: string | null;
  durationSeconds: number | null;
  errorMessage: string | null;
  createdAt: string;
};

type EgressInvokeResponse = {
  ok?: boolean;
  skipped?: boolean;
  recordingId?: string;
  egressId?: string | null;
  roomName?: string;
  storagePath?: string;
  status?: LiveRecordingStatus;
  durationSeconds?: number | null;
  error?: string;
  warning?: string;
  reason?: string;
  code?: string;
};

async function edgeFunctionPayload(error: {
  message: string;
  context?: Response;
}): Promise<EgressInvokeResponse | null> {
  try {
    const ctx = error.context;
    if (ctx && typeof ctx.json === 'function') {
      return (await ctx.json()) as EgressInvokeResponse;
    }
  } catch {
    // Ignore parse errors.
  }
  return null;
}

/**
 * Starts server-side LiveKit room-composite egress. Never throws — recording failure must not break live.
 */
export async function startLiveRecording(streamId: string): Promise<void> {
  const id = streamId.trim();
  if (!id) return;

  liveRecordingDebug.startRequested(id);

  try {
    const { data, error } = await supabase.functions.invoke<EgressInvokeResponse>('livekit-egress', {
      body: { action: 'start', streamId: id },
    });

    if (error) {
      const body = await edgeFunctionPayload(error);
      const reason = body?.error ?? error.message ?? 'invoke_failed';
      liveRecordingDebug.startFailed(id, reason);
      return;
    }

    liveRecordingDebug.startResult(id, {
      ok: data?.ok ?? false,
      skipped: data?.skipped ?? false,
      recordingId: data?.recordingId ?? null,
      egressId: data?.egressId ?? null,
      status: data?.status ?? null,
      code: data?.code ?? null,
    });
  } catch (err) {
    const reason = err instanceof Error ? err.message : 'unknown';
    liveRecordingDebug.startFailed(id, reason);
  }
}

/**
 * Stops active egress for a stream. Never throws — stop failure must not block end stream.
 */
export async function stopLiveRecording(streamId: string): Promise<void> {
  const id = streamId.trim();
  if (!id) return;

  liveRecordingDebug.stopRequested(id);

  try {
    const { data, error } = await supabase.functions.invoke<EgressInvokeResponse>('livekit-egress', {
      body: { action: 'stop', streamId: id },
    });

    if (error) {
      const body = await edgeFunctionPayload(error);
      const reason = body?.error ?? error.message ?? 'invoke_failed';
      liveRecordingDebug.stopFailed(id, reason);
      return;
    }

    liveRecordingDebug.stopResult(id, {
      ok: data?.ok ?? false,
      skipped: data?.skipped ?? false,
      recordingId: data?.recordingId ?? null,
      status: data?.status ?? null,
      warning: data?.warning ?? null,
    });
  } catch (err) {
    const reason = err instanceof Error ? err.message : 'unknown';
    liveRecordingDebug.stopFailed(id, reason);
  }
}
