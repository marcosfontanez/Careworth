/**
 * Dev-only instrumentation for the Reward Delivery pipeline.
 * Safe no-ops in production (__DEV__ === false).
 */

function fmtUnknown(err: unknown): string {
  if (err instanceof Error) return err.message;
  if (typeof err === 'string') return err;
  try {
    return JSON.stringify(err);
  } catch {
    return String(err);
  }
}

export const rewardDeliveryDebug = {
  log(...args: unknown[]) {
    if (__DEV__) console.log('[RewardDelivery]', ...args);
  },

  warn(...args: unknown[]) {
    if (__DEV__) console.warn('[RewardDelivery]', ...args);
  },

  /** Structured enqueue attempt (before RPC). */
  enqueueAttempt(operation: string, ctx: Record<string, unknown>) {
    if (__DEV__) console.log('[RewardDelivery] enqueue →', operation, ctx);
  },

  /** RPC outcome for enqueue paths. */
  enqueueResult(operation: string, deliveryId: string | null, error?: unknown) {
    if (__DEV__) {
      if (deliveryId) console.log('[RewardDelivery] enqueue ✓', operation, { deliveryId });
      else console.warn('[RewardDelivery] enqueue ✗', operation, { error: error != null ? fmtUnknown(error) : 'null id' });
    }
  },

  listPendingOk(rowCount: number, snapshot: Array<{ id: string; status: string; item_type: string }>) {
    if (__DEV__) console.log('[RewardDelivery] listPending ok', { rowCount, snapshot });
  },

  listPendingError(error: unknown) {
    if (__DEV__)
      console.warn(
        '[RewardDelivery] listPending FAILED (check Supabase RPC deploy / auth — empty UI does not mean no rewards)',
        fmtUnknown(error),
      );
  },

  transition(label: string, deliveryId: string, detail?: Record<string, unknown>) {
    if (__DEV__) console.log('[RewardDelivery] status →', label, { deliveryId: deliveryId.slice(0, 8), ...detail });
  },

  modalOpen(deliveryId: string, itemType: string, completeness: Record<string, unknown>) {
    if (__DEV__) console.log('[RewardDelivery] reveal modal', { deliveryId: deliveryId.slice(0, 8), itemType, completeness });
  },

  phase(phase: string, deliveryId: string | undefined) {
    if (__DEV__) console.log('[RewardDelivery] reveal phase', { phase, deliveryId: deliveryId?.slice(0, 8) });
  },

  catalogHydrate(shopItemId: string, found: boolean) {
    if (__DEV__) console.log('[RewardDelivery] border reveal catalog hydrate', { shopItemId: shopItemId.slice(0, 8), found });
  },
};
