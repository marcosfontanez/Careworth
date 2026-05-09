import AsyncStorage from '@react-native-async-storage/async-storage';

/**
 * Bump this when you need every user to see the beta gift flow **one more time** on a future session
 * (previous dismissals live under older keys and are ignored).
 */
export const BETA_TESTER_GIFT_MODAL_STORAGE_REVISION = 'v2-2026-05-push';

const KEY = `@pulseverse/beta_tester_gift_modal_seen_${BETA_TESTER_GIFT_MODAL_STORAGE_REVISION}`;

/**
 * After the user dismisses {@link BetaTesterBorderGate}, we remember so we don’t
 * re-show on next launch. Device-local only (beta UX).
 */
export async function hasDismissedBetaTesterGiftModal(userId: string): Promise<boolean> {
  if (!userId) return true;
  try {
    const raw = await AsyncStorage.getItem(KEY);
    if (!raw) return false;
    const map = JSON.parse(raw) as Record<string, boolean>;
    return map[userId] === true;
  } catch {
    return false;
  }
}

export async function markBetaTesterGiftModalDismissed(userId: string): Promise<void> {
  if (!userId) return;
  try {
    const raw = await AsyncStorage.getItem(KEY);
    const map: Record<string, boolean> = raw ? (JSON.parse(raw) as Record<string, boolean>) : {};
    map[userId] = true;
    await AsyncStorage.setItem(KEY, JSON.stringify(map));
  } catch {
    /* non-fatal — modal may show again */
  }
}
