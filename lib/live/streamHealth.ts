import { liveSceneLabel, type LiveSceneMode } from '@/lib/live/liveSceneMode';

export type HealthLevel = 'good' | 'warn' | 'bad' | 'neutral';

export type LiveKitHealthStatus =
  | 'connected'
  | 'connecting'
  | 'reconnecting'
  | 'disconnected'
  | 'error'
  | 'not_available';

export type MicHealthStatus =
  | 'publishing'
  | 'muted'
  | 'permission_missing'
  | 'error'
  | 'not_available';

export type CameraHealthStatus =
  | 'publishing'
  | 'off'
  | 'permission_missing'
  | 'error'
  | 'not_available';

export type StreamDbHealthStatus =
  | 'active'
  | 'live_pre_broadcast'
  | 'ending'
  | 'ended'
  | 'stale_risk';

export type RealtimeHealthStatus =
  | 'connected'
  | 'partial'
  | 'waiting'
  | 'error'
  | 'not_available';

export type StreamHealthSnapshot = {
  liveKitEnabled: boolean;
  liveKitStatus: LiveKitHealthStatus;
  liveKitError?: string | null;
  micStatus: MicHealthStatus;
  cameraStatus: CameraHealthStatus;
  viewerCount: number;
  streamDbStatus: StreamDbHealthStatus;
  realtimeStatus: RealtimeHealthStatus;
  sceneMode: LiveSceneMode;
  lastHeartbeatAt?: string | null;
  lastLocalHeartbeatAt?: string | null;
  realtimeChannels: {
    chat: boolean;
    polls: boolean;
    pins: boolean;
    gifts: boolean;
    stream: boolean;
    questions?: boolean;
  };
  /** ISO timestamp when snapshot was built (for refresh display). */
  capturedAt: string;
};

export type StreamHealthInput = {
  liveKitEnabled: boolean;
  liveKitRoomConnected: boolean;
  liveKitReconnecting: boolean;
  liveKitSessionActive: boolean;
  liveKitError?: string | null;
  micMuted: boolean;
  micPublished?: boolean | null;
  micPermissionDenied: boolean;
  cameraPermissionGranted?: boolean | null;
  cameraPublishing: boolean;
  sceneMode: LiveSceneMode;
  viewerCount: number;
  streamStatus: string;
  broadcastLive: boolean;
  endingStream: boolean;
  hostLastSeenAt?: string | null;
  lastLocalHeartbeatAt?: string | null;
  realtimeChannels: StreamHealthSnapshot['realtimeChannels'];
  qnaBackendReady?: boolean;
};

const STALE_WARN_MS = 90_000;

function parseMs(iso?: string | null): number | null {
  if (!iso?.trim()) return null;
  const ms = Date.parse(iso);
  return Number.isFinite(ms) ? ms : null;
}

function heartbeatAgeMs(iso?: string | null): number | null {
  const ms = parseMs(iso);
  if (ms == null) return null;
  return Date.now() - ms;
}

export function deriveLiveKitStatus(input: StreamHealthInput): LiveKitHealthStatus {
  if (!input.liveKitEnabled) return 'not_available';
  if (input.liveKitError) return 'error';
  if (input.liveKitReconnecting) return 'reconnecting';
  if (input.liveKitRoomConnected && input.liveKitSessionActive) return 'connected';
  if (input.liveKitSessionActive) return 'connecting';
  return 'disconnected';
}

export function deriveMicStatus(input: StreamHealthInput): MicHealthStatus {
  if (!input.liveKitEnabled) return 'not_available';
  if (input.micPermissionDenied) return 'permission_missing';
  if (input.micMuted) return 'muted';
  if (input.micPublished === false) return 'error';
  if (input.micPublished === true) return 'publishing';
  if (input.liveKitRoomConnected) return 'publishing';
  return 'not_available';
}

export function deriveCameraStatus(input: StreamHealthInput): CameraHealthStatus {
  if (!input.liveKitEnabled) return 'not_available';
  if (input.cameraPermissionGranted === false) return 'permission_missing';
  if (input.cameraPublishing) return 'publishing';
  if (input.sceneMode === 'live' || input.sceneMode === 'qna' || input.sceneMode === 'poll') return 'off';
  return 'off';
}

export function deriveStreamDbStatus(input: StreamHealthInput): StreamDbHealthStatus {
  if (input.streamStatus === 'ended' || input.endingStream) {
    return input.endingStream ? 'ending' : 'ended';
  }
  if (input.sceneMode === 'ending_soon') return 'ending';
  if (input.broadcastLive) {
    const age =
      heartbeatAgeMs(input.lastLocalHeartbeatAt) ??
      heartbeatAgeMs(input.hostLastSeenAt);
    if (age != null && age > STALE_WARN_MS) return 'stale_risk';
    if (age == null && input.liveKitRoomConnected) return 'stale_risk';
    return 'active';
  }
  if (input.streamStatus === 'live') return 'live_pre_broadcast';
  return 'ended';
}

export function deriveRealtimeStatus(
  channels: StreamHealthSnapshot['realtimeChannels'],
  qnaBackendReady?: boolean,
): RealtimeHealthStatus {
  const expected = [
    channels.chat,
    channels.polls,
    channels.pins,
    channels.gifts,
    channels.stream,
    qnaBackendReady ? channels.questions : undefined,
  ].filter((v) => v !== undefined) as boolean[];

  if (expected.length === 0) return 'not_available';

  const subscribed = expected.filter(Boolean).length;
  if (subscribed === 0) return 'waiting';
  if (subscribed === expected.length) return 'connected';
  if (subscribed >= Math.ceil(expected.length / 2)) return 'partial';
  return 'error';
}

export function buildStreamHealthSnapshot(input: StreamHealthInput): StreamHealthSnapshot {
  return {
    liveKitEnabled: input.liveKitEnabled,
    liveKitStatus: deriveLiveKitStatus(input),
    liveKitError: input.liveKitError,
    micStatus: deriveMicStatus(input),
    cameraStatus: deriveCameraStatus(input),
    viewerCount: input.viewerCount,
    streamDbStatus: deriveStreamDbStatus(input),
    realtimeStatus: deriveRealtimeStatus(input.realtimeChannels, input.qnaBackendReady),
    sceneMode: input.sceneMode,
    lastHeartbeatAt: input.hostLastSeenAt ?? null,
    lastLocalHeartbeatAt: input.lastLocalHeartbeatAt ?? null,
    realtimeChannels: input.realtimeChannels,
    capturedAt: new Date().toISOString(),
  };
}

export function liveKitStatusLabel(status: LiveKitHealthStatus): string {
  switch (status) {
    case 'connected':
      return 'Connected';
    case 'connecting':
      return 'Connecting';
    case 'reconnecting':
      return 'Reconnecting';
    case 'disconnected':
      return 'Disconnected';
    case 'error':
      return 'Error';
    default:
      return 'Not available';
  }
}

export function micStatusLabel(status: MicHealthStatus): string {
  switch (status) {
    case 'publishing':
      return 'Publishing';
    case 'muted':
      return 'Muted';
    case 'permission_missing':
      return 'Permission missing';
    case 'error':
      return 'Error';
    default:
      return 'Not available';
  }
}

export function cameraStatusLabel(status: CameraHealthStatus): string {
  switch (status) {
    case 'publishing':
      return 'Publishing';
    case 'off':
      return 'Off';
    case 'permission_missing':
      return 'Permission missing';
    case 'error':
      return 'Error';
    default:
      return 'Not available';
  }
}

export function streamDbStatusLabel(status: StreamDbHealthStatus): string {
  switch (status) {
    case 'active':
      return 'Active / live';
    case 'live_pre_broadcast':
      return 'Live (pre-broadcast)';
    case 'ending':
      return 'Ending';
    case 'ended':
      return 'Ended';
    case 'stale_risk':
      return 'Stale risk';
    default:
      return 'Unknown';
  }
}

export function realtimeStatusLabel(status: RealtimeHealthStatus): string {
  switch (status) {
    case 'connected':
      return 'Connected';
    case 'partial':
      return 'Partial';
    case 'waiting':
      return 'Waiting';
    case 'error':
      return 'Error';
    default:
      return 'Not available';
  }
}

export function formatHeartbeatAge(iso?: string | null): string {
  const age = heartbeatAgeMs(iso);
  if (age == null) return 'Not available';
  if (age < 60_000) return `${Math.max(1, Math.round(age / 1000))}s ago`;
  if (age < 3_600_000) return `${Math.round(age / 60_000)}m ago`;
  return `${Math.round(age / 3_600_000)}h ago`;
}

export function healthLevelForLiveKit(status: LiveKitHealthStatus): HealthLevel {
  if (status === 'connected') return 'good';
  if (status === 'connecting' || status === 'reconnecting') return 'warn';
  if (status === 'not_available') return 'neutral';
  return 'bad';
}

export function healthLevelForMic(status: MicHealthStatus): HealthLevel {
  if (status === 'publishing') return 'good';
  if (status === 'muted') return 'warn';
  if (status === 'not_available') return 'neutral';
  return 'bad';
}

export function healthLevelForCamera(status: CameraHealthStatus, sceneMode: LiveSceneMode): HealthLevel {
  if (status === 'publishing') return 'good';
  if (status === 'off' && sceneMode !== 'live' && sceneMode !== 'qna') return 'warn';
  if (status === 'not_available') return 'neutral';
  if (status === 'off') return 'bad';
  return 'bad';
}

export function healthLevelForStreamDb(status: StreamDbHealthStatus): HealthLevel {
  if (status === 'active') return 'good';
  if (status === 'live_pre_broadcast' || status === 'ending') return 'warn';
  if (status === 'stale_risk') return 'warn';
  return 'bad';
}

export function healthLevelForRealtime(status: RealtimeHealthStatus): HealthLevel {
  if (status === 'connected') return 'good';
  if (status === 'partial' || status === 'waiting') return 'warn';
  if (status === 'not_available') return 'neutral';
  return 'bad';
}

export function buildHealthDebugSummary(snapshot: StreamHealthSnapshot): string {
  return [
    `PulseVerse Live Health @ ${snapshot.capturedAt}`,
    `LiveKit: ${liveKitStatusLabel(snapshot.liveKitStatus)}${snapshot.liveKitError ? ` (${snapshot.liveKitError})` : ''}`,
    `Mic: ${micStatusLabel(snapshot.micStatus)}`,
    `Camera: ${cameraStatusLabel(snapshot.cameraStatus)}`,
    `Viewers: ${snapshot.viewerCount}`,
    `Stream DB: ${streamDbStatusLabel(snapshot.streamDbStatus)}`,
    `Realtime: ${realtimeStatusLabel(snapshot.realtimeStatus)}`,
    `Scene: ${liveSceneLabel(snapshot.sceneMode)}`,
    `Heartbeat (DB): ${formatHeartbeatAge(snapshot.lastHeartbeatAt)}`,
    `Heartbeat (local): ${formatHeartbeatAge(snapshot.lastLocalHeartbeatAt)}`,
    `Channels chat=${snapshot.realtimeChannels.chat} polls=${snapshot.realtimeChannels.polls} pins=${snapshot.realtimeChannels.pins} gifts=${snapshot.realtimeChannels.gifts} stream=${snapshot.realtimeChannels.stream} qna=${snapshot.realtimeChannels.questions ?? 'n/a'}`,
  ].join('\n');
}

/** Re-export for panel scene label. */
export { liveSceneLabel };
