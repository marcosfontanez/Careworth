import AsyncStorage from '@react-native-async-storage/async-storage';

const KEY = '@pulseverse/pulse_month_celebration_seen_v1';

/**
 * Month-start key is ISO date `YYYY-MM-DD` (matches `pulse_month_floor` / DB).
 * One celebration modal per completed month; survives restarts without a server flag.
 */
export async function hasSeenPulseMonthCelebration(monthStartIso: string): Promise<boolean> {
  try {
    const raw = await AsyncStorage.getItem(KEY);
    if (!raw) return false;
    const map = JSON.parse(raw) as Record<string, boolean>;
    return map[monthStartIso] === true;
  } catch {
    return true;
  }
}

export async function markPulseMonthCelebrationSeen(monthStartIso: string): Promise<void> {
  try {
    const raw = await AsyncStorage.getItem(KEY);
    const map: Record<string, boolean> = raw ? (JSON.parse(raw) as Record<string, boolean>) : {};
    map[monthStartIso] = true;
    await AsyncStorage.setItem(KEY, JSON.stringify(map));
  } catch {
    // Non-fatal — user may see the modal again.
  }
}
