/** Client guard — host pin/unpin only while the stream is actively live. */
export function canModifyLivePins(input: {
  isHost: boolean;
  streamIsLive: boolean;
  endedAt?: string | null;
}): boolean {
  return Boolean(input.isHost && input.streamIsLive && !input.endedAt);
}

export function livePinBlockedMessage(): string {
  return 'Pinning is only available during a live stream.';
}
