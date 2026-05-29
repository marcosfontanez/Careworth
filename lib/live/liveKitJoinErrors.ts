/** Map LiveKit / edge errors to viewer-friendly copy (never expose raw JWT details). */
export function friendlyLiveKitJoinError(err: unknown): string {
  const msg = err instanceof Error ? err.message : String(err ?? '');
  const lower = msg.toLowerCase();

  if (lower.includes('stream has ended') || lower.includes('already_ended')) {
    return 'This live has ended.';
  }
  if (lower.includes('broadcast has not started')) {
    return 'Host is still connecting — hang tight.';
  }
  if (lower.includes('stream is not live') || lower.includes('host_stale') || lower.includes('stream unavailable')) {
    return 'This live is unavailable right now.';
  }
  if (lower.includes('unauthorized') || lower.includes('sign in')) {
    return 'Sign in to watch live video.';
  }
  if (lower.includes('permission denied') || lower.includes('not allowed') || lower.includes('forbidden')) {
    return 'Unable to join this live right now. Try again in a moment.';
  }
  if (lower.includes('duplicate') && lower.includes('identity')) {
    return 'You are already connected on another device. Close it and try again.';
  }
  if (lower.includes('timeout') || lower.includes('timed out')) {
    return 'Connection timed out. Check your network and try again.';
  }
  if (lower.includes('token') && (lower.includes('expired') || lower.includes('invalid'))) {
    return 'Live session expired — reconnecting…';
  }

  return 'Unable to join this live right now.';
}

export function friendlyLiveKitMintError(message: string): string {
  return friendlyLiveKitJoinError(new Error(message));
}
