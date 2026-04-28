import * as Sentry from '@sentry/react-native';

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
