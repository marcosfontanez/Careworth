import AsyncStorage from '@react-native-async-storage/async-storage';

/**
 * Lightweight "have I seen the Pulse pill tooltip yet?" flag.
 *
 * The tooltip is a once-per-user first-time nudge pointing at the Pulse
 * Score pill on the owner's My Pulse page. We key it off a boolean in
 * AsyncStorage so it survives app restarts without needing a server
 * round-trip — if the user re-installs the app they'll see it again,
 * which is fine (same user, fresh device = legitimately "first time").
 *
 * Kept out of any shared onboarding key so tweaking the Pulse
 * explainer copy later can trigger a re-show by bumping this key
 * without disturbing other walk-throughs.
 */
const KEY = '@pulseverse/pulse_tooltip_seen_v1';

export async function hasSeenPulseTooltip(): Promise<boolean> {
  try {
    const raw = await AsyncStorage.getItem(KEY);
    return raw === '1';
  } catch {
    return true;
  }
}

export async function markPulseTooltipSeen(): Promise<void> {
  try {
    await AsyncStorage.setItem(KEY, '1');
  } catch {
    // Non-fatal — worst case the user sees the tooltip again.
  }
}
