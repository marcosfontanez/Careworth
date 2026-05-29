export const CLIP_RECORDING_UNAVAILABLE =
  'Clips are not available for this live yet.';

export function friendlyClipMarkerError(code: string | undefined | null): string {
  switch (code) {
    case 'recording_not_active':
      return CLIP_RECORDING_UNAVAILABLE;
    case 'stream_not_live':
      return 'This stream is no longer live.';
    case 'viewer_clips_disabled':
      return 'The host has not enabled viewer clips for this stream.';
    case 'invalid_duration':
      return 'Choose a clip length of 15, 30, or 60 seconds.';
    case 'unauthorized':
      return 'Sign in to mark a moment.';
    case 'not_found':
      return 'Stream not found.';
    default:
      return 'Could not save clip marker. Try again.';
  }
}

export function formatClipMarkerTime(totalSeconds: number): string {
  const sec = Math.max(0, Math.floor(totalSeconds));
  const m = Math.floor(sec / 60);
  const s = sec % 60;
  return `${m}:${s.toString().padStart(2, '0')}`;
}
