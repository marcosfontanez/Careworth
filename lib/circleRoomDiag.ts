/** Dev-only Circle room navigation / query diagnostics (no-op in production). */
export const circleRoomDiagEnabled =
  typeof __DEV__ !== 'undefined' && __DEV__;

export function circleRoomDiag(event: string, payload?: Record<string, unknown>): void {
  if (!circleRoomDiagEnabled) return;
  // eslint-disable-next-line no-console -- intentional dev-only Circle room diagnostics
  console.log('[circleRoom:diag]', event, payload ?? {});
}
