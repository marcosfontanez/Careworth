/**
 * Motion language — React Native has no global transition API; these constants
 * document intended timing and feed `Animated` / Reanimated if used later.
 *
 * Press: rely on `Pressable` opacity ~0.88 (see shared `Button`).
 * Tabs / toggles: pair with `Haptics.selectionAsync()` for premium feedback.
 */
export const motion = {
  /** Press feedback duration hint (ms) */
  press: 100,
  /** Tab / segment switch */
  tab: 180,
  /** Modal / sheet present */
  modalPresent: 220,
  /** Modal / sheet dismiss */
  modalDismiss: 180,
  /** Success toast / inline confirmation linger */
  successFeedback: 400,
  /** Equip / purchase celebration (keep short; avoid loops) */
  celebration: 600,
} as const;
