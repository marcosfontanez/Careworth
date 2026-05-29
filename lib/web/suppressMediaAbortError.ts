/**
 * Web-only: swallow the benign AbortError that fires when an HTMLMediaElement's
 * play() Promise is interrupted by a pause() during unmount/navigation.
 *
 * Caused by expo-video / expo-av's web shim: useVideoPlayer calls
 * `videoElement.play()` on mount, which returns a Promise. If the component
 * unmounts before that Promise resolves, the teardown's `pause()` rejects the
 * play Promise with `AbortError: The play() request was interrupted by a call
 * to pause().` It is harmless — no media playback is broken — but it surfaces
 * in DevTools as 1+ unhandled rejection per video that was on screen at the
 * time of navigation, polluting the console error count.
 *
 * Reference: https://developer.chrome.com/blog/play-request-was-interrupted/
 *
 * Native platforms do not exhibit this — RN's video components implement their
 * own teardown — so the listener short-circuits when window is undefined.
 *
 * Safe to import multiple times; guarded against double-install.
 */

const INSTALLED_FLAG = '__pulseverseMediaAbortFilterInstalled';

const MATCH_FRAGMENTS = [
  // Chromium / Edge
  'The play() request was interrupted by a call to pause',
  // Firefox
  'The fetching process for the media resource was aborted',
  'The play method is not allowed by the user agent',
  // Safari sometimes uses generic
  'AbortError',
];

function isBenignMediaAbort(reason: unknown): boolean {
  if (!reason) return false;
  const r = reason as { name?: unknown; message?: unknown };
  const name = typeof r.name === 'string' ? r.name : '';
  const message = typeof r.message === 'string' ? r.message : '';
  if (name !== 'AbortError') return false;
  return MATCH_FRAGMENTS.some((frag) => message.includes(frag));
}

export function installMediaAbortErrorFilter(): void {
  if (typeof window === 'undefined' || typeof document === 'undefined') return;
  const w = window as unknown as Record<string, unknown>;
  if (w[INSTALLED_FLAG]) return;
  w[INSTALLED_FLAG] = true;

  window.addEventListener('unhandledrejection', (event) => {
    if (isBenignMediaAbort((event as PromiseRejectionEvent).reason)) {
      event.preventDefault();
    }
  });
}
