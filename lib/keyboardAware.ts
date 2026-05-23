import { Platform } from 'react-native';

/** Bottom padding for a docked composer bar (comments, DMs, live chat). */
export function composerDockPadding(
  safeAreaBottom: number,
  keyboardInset: number,
  extra = 0,
): number {
  if (keyboardInset > 0) {
    return extra + 8;
  }
  return safeAreaBottom + extra;
}

/** Extra ScrollView content padding when the composer lives inside the scroll area. */
export function scrollComposerExtraPadding(keyboardInset: number, base = 16): number {
  if (Platform.OS !== 'android') return base;
  return base + keyboardInset;
}
