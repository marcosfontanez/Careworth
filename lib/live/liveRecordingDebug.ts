const PREFIX = '[LiveRecording]';

function log(phase: string, detail?: Record<string, unknown>) {
  if (!__DEV__) return;
  if (detail) {
    console.log(`${PREFIX} ${phase}`, detail);
  } else {
    console.log(`${PREFIX} ${phase}`);
  }
}

export const liveRecordingDebug = {
  startRequested(streamId: string) {
    log('Start requested', { streamId });
  },
  startResult(streamId: string, result: Record<string, unknown>) {
    log('Start result', { streamId, ...result });
  },
  startFailed(streamId: string, reason: string) {
    log('Start failed (non-fatal)', { streamId, reason });
  },
  stopRequested(streamId: string) {
    log('Stop requested', { streamId });
  },
  stopResult(streamId: string, result: Record<string, unknown>) {
    log('Stop result', { streamId, ...result });
  },
  stopFailed(streamId: string, reason: string) {
    log('Stop failed (non-fatal)', { streamId, reason });
  },
};
