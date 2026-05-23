const PREFIX = '[LiveEndStream]';

function log(phase: string, detail?: Record<string, unknown>) {
  if (!__DEV__) return;
  if (detail) {
    console.log(`${PREFIX} ${phase}`, detail);
  } else {
    console.log(`${PREFIX} ${phase}`);
  }
}

export const liveEndStreamDebug = {
  endRequested(streamId: string) {
    log('End stream requested', { streamId });
  },
  liveKitDisconnected(streamId: string) {
    log('LiveKit disconnected', { streamId });
  },
  supabaseUpdated(streamId: string, reason?: string) {
    log('Supabase stream row updated', { streamId, reason });
  },
  happeningNowRefreshed(streamId: string) {
    log('Happening Now refreshed', { streamId });
  },
  removedFromActiveList(streamId: string) {
    log('Stream removed from active list', { streamId });
  },
  endFailed(streamId: string, reason: string) {
    log('End stream failed', { streamId, reason });
  },
};
