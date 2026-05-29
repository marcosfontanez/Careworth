import * as Sentry from '@sentry/react-native';

/**
 * Substrings in an event message/value that identify it as a benign third-party
 * teardown hiccup we do NOT want to count against our error budget. Adding here
 * is the LAST resort — prefer fixing in code when the source is our own. Each
 * entry should be paired with a Sentry issue id in the comment for traceability.
 */
const SENTRY_IGNORE_SUBSTRINGS: ReadonlyArray<{ match: string; reason: string }> = [
  // PULSE-VERSE-1A: livekit-client 2.19 + iOS 26.5 / iPhone 17 Pro Max — Room
  // teardown reads a DataChannel/Signal state enum after the underlying RTC
  // object is gone. Fires from inside livekit-client during the normal
  // connected→disconnected transition (see breadcrumbs: "unpublishing track").
  // Already `handled: yes` — no user impact. Bump livekit-client to >=2.20 to
  // address upstream.
  { match: "Cannot read property 'Closing' of undefined", reason: 'livekit-client teardown' },
  { match: "Cannot read properties of undefined (reading 'Closing')", reason: 'livekit-client teardown' },
];

/**
 * Sentry sometimes captures CustomEvent / native Event instances as exceptions
 * (third-party libs that pass an Event to `console.error` etc). Detected via the
 * presence of CustomEvent-only fields. These show up paired with PULSE-VERSE-1A.
 */
function isCustomEventCapture(event: Sentry.ErrorEvent): boolean {
  const ex = event.exception?.values?.[0];
  if (!ex) return false;
  const value = ex.value ?? '';
  // Sentry serializes CustomEvent's own enumerable keys into the message
  return (
    typeof value === 'string'
    && value.includes('__bubbles')
    && value.includes('__cancelable')
    && value.includes('__composed')
  );
}

function shouldDropEvent(event: Sentry.ErrorEvent): { drop: true; reason: string } | { drop: false } {
  if (isCustomEventCapture(event)) {
    return { drop: true, reason: 'CustomEvent captured as exception (likely from livekit-client teardown)' };
  }
  const ex = event.exception?.values?.[0];
  const haystack = `${ex?.type ?? ''}: ${ex?.value ?? ''} ${event.message ?? ''}`;
  for (const entry of SENTRY_IGNORE_SUBSTRINGS) {
    if (haystack.includes(entry.match)) return { drop: true, reason: entry.reason };
  }
  return { drop: false };
}

/**
 * Initializes Sentry when `EXPO_PUBLIC_SENTRY_DSN` is set (e.g. via EAS secrets).
 * Safe no-op in dev unless `EXPO_PUBLIC_SENTRY_ENABLE_DEV=1`.
 *
 * Call once at app entry (see `app/_layout.tsx`), before rendering the tree.
 */
export function initMonitoring(): void {
  const dsn = process.env.EXPO_PUBLIC_SENTRY_DSN?.trim();
  if (!dsn) return;

  const devOk = process.env.EXPO_PUBLIC_SENTRY_ENABLE_DEV === '1';
  if (__DEV__ && !devOk) return;

  Sentry.init({
    dsn,
    debug: __DEV__ && devOk,
    /** Lower in prod later if volume is high */
    tracesSampleRate: __DEV__ ? 1.0 : 0.15,
    enableAutoSessionTracking: true,
    /**
     * Drop benign third-party teardown noise BEFORE it counts against the
     * error budget. Anything not matched here goes through untouched.
     * Add new entries to `SENTRY_IGNORE_SUBSTRINGS` with the Sentry issue id.
     */
    beforeSend(event) {
      const verdict = shouldDropEvent(event);
      if (verdict.drop) {
        if (__DEV__) console.warn(`[Sentry] dropped event: ${verdict.reason}`);
        return null;
      }
      return event;
    },
  });
}

export type SentryTestResult = { sent: true } | { sent: false; reason: string };

/**
 * Fire a one-off test issue (Settings → dev, or call from REPL). Requires the same
 * env as `initMonitoring` (DSN; in __DEV__, EXPO_PUBLIC_SENTRY_ENABLE_DEV=1).
 */
export function sendSentryTestEvent(): SentryTestResult {
  const dsn = process.env.EXPO_PUBLIC_SENTRY_DSN?.trim();
  if (!dsn) return { sent: false, reason: 'EXPO_PUBLIC_SENTRY_DSN is not set.' };

  const devOk = process.env.EXPO_PUBLIC_SENTRY_ENABLE_DEV === '1';
  if (__DEV__ && !devOk) {
    return {
      sent: false,
      reason: 'Add EXPO_PUBLIC_SENTRY_ENABLE_DEV=1 to .env and restart Metro.',
    };
  }

  Sentry.captureException(new Error('[manual test] PulseVerse Sentry ping from Settings'));
  return { sent: true };
}
