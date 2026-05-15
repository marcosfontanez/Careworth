import { Platform } from 'react-native';

/** Append AA to 6-digit hex for RN `borderColor` / fills. */
export function hexWithAlpha(hex: string, alpha: number): string {
  const t = hex.trim();
  if (!t.startsWith('#')) return t;
  const h = t.slice(1);
  if (h.length !== 6) return t;
  const a = Math.max(0, Math.min(1, alpha));
  const n = Math.round(a * 255);
  return `#${h}${n.toString(16).padStart(2, '0')}`;
}

export function ringBloomStyle(
  ringColor: string,
  lockedUi: boolean,
  androidCornerRadius: number,
  opts?: { forPodium?: boolean },
) {
  const forPodium = Boolean(opts?.forPodium);
  return {
    shadowColor: ringColor,
    shadowOpacity: lockedUi ? 0.12 : Platform.select({ ios: forPodium ? 0.58 : 0.48, default: forPodium ? 0.45 : 0.38 }) ?? 0.38,
    shadowRadius: Platform.select({ ios: forPodium ? 26 : 20, default: forPodium ? 18 : 14 }) ?? 14,
    shadowOffset: { width: 0, height: 0 },
    elevation: Platform.OS === 'android' ? (forPodium ? 8 : 12) : 0,
    backgroundColor: 'transparent' as const,
    ...(Platform.OS === 'android' && !forPodium
      ? {
          borderWidth: 1.5,
          borderColor: hexWithAlpha(ringColor, 0.42),
          borderRadius: androidCornerRadius,
        }
      : {}),
  };
}
