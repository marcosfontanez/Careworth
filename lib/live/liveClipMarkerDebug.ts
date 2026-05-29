const PREFIX = '[LiveClipMarker]';

function log(phase: string, detail?: Record<string, unknown>) {
  if (!__DEV__) return;
  if (detail) {
    console.log(`${PREFIX} ${phase}`, detail);
  } else {
    console.log(`${PREFIX} ${phase}`);
  }
}

export const liveClipMarkerDebug = {
  createRequested(streamId: string, role: 'host' | 'viewer', durationSeconds?: number) {
    log('Create requested', { streamId, role, durationSeconds });
  },
  createResult(streamId: string, result: Record<string, unknown>) {
    log('Create result', { streamId, ...result });
  },
  createFailed(streamId: string, reason: string, detail?: Record<string, unknown>) {
    log('Create failed', { streamId, reason, ...detail });
  },
  markersLoaded(streamId: string, count: number) {
    log('Markers loaded', { streamId, count });
  },
};
