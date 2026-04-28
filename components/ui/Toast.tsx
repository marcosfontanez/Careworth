import React, { useEffect, useRef } from 'react';
import { Animated, Text, StyleSheet, TouchableOpacity, Platform } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { colors, borderRadius, spacing, typography, shadows } from '@/theme';
import { create } from 'zustand';

const USE_NATIVE = Platform.OS !== 'web';
const AUTO_DISMISS_MS = 3000;

type ToastType = 'success' | 'error' | 'info';

interface ToastState {
  message: string;
  type: ToastType;
  /** Monotonically increments every time show() is called — drives re-renders
   *  and lets the container reset its animation/timer even when the same
   *  toast fires twice in a row. */
  tick: number;
  visible: boolean;
  show: (message: string, type?: ToastType) => void;
  hide: () => void;
}

/**
 * The timer lives OUTSIDE of React so that:
 *   - show() can start/cancel it directly (no useEffect race),
 *   - rapid successive show() calls always reset the countdown (so the
 *     most-recent toast gets a fresh 3s window instead of inheriting a
 *     half-expired timer from the previous one),
 *   - the timer is torn down cleanly from hide() whether it was fired by
 *     auto-dismiss or by the user tapping the close button.
 */
let autoDismissTimer: ReturnType<typeof setTimeout> | null = null;

function clearAutoDismiss() {
  if (autoDismissTimer !== null) {
    clearTimeout(autoDismissTimer);
    autoDismissTimer = null;
  }
}

export const useToast = create<ToastState>((set, get) => ({
  message: '',
  type: 'info',
  tick: 0,
  visible: false,
  show: (message, type = 'info') => {
    clearAutoDismiss();
    set((s) => ({ message, type, visible: true, tick: s.tick + 1 }));
    autoDismissTimer = setTimeout(() => {
      // Only dismiss if the toast hasn't already been closed manually.
      if (get().visible) get().hide();
    }, AUTO_DISMISS_MS);
  },
  hide: () => {
    clearAutoDismiss();
    set({ visible: false });
  },
}));

const ICON_MAP: Record<ToastType, { name: string; color: string; bg: string }> = {
  success: { name: 'checkmark-circle', color: '#FFF', bg: colors.primary.teal },
  error: { name: 'alert-circle', color: '#FFF', bg: colors.status.error },
  info: { name: 'information-circle', color: '#FFF', bg: colors.primary.royal },
};

export function ToastContainer() {
  const insets = useSafeAreaInsets();
  // Pull fields individually so unrelated re-renders don't cascade.
  const message = useToast((s) => s.message);
  const type = useToast((s) => s.type);
  const visible = useToast((s) => s.visible);
  const tick = useToast((s) => s.tick);
  const hide = useToast((s) => s.hide);
  const translateY = useRef(new Animated.Value(-100)).current;

  // Drive the enter/exit animation off both `visible` AND `tick` so a
  // back-to-back show() with the same `visible=true` still re-runs the
  // spring (useful when a second message replaces the first).
  useEffect(() => {
    Animated.spring(translateY, {
      toValue: visible ? 0 : -140,
      friction: 8,
      tension: 70,
      useNativeDriver: USE_NATIVE,
    }).start();
  }, [visible, tick, translateY]);

  const cfg = ICON_MAP[type];

  return (
    <Animated.View
      style={[
        styles.toast,
        shadows.lifted,
        {
          backgroundColor: cfg.bg,
          top: insets.top + spacing.sm,
          transform: [{ translateY }],
          opacity: visible ? 1 : 0,
          pointerEvents: visible ? 'auto' : 'none',
        },
      ]}
    >
      <Ionicons name={cfg.name as any} size={20} color={cfg.color} />
      <Text style={styles.text} numberOfLines={2}>{message}</Text>
      <TouchableOpacity onPress={hide} activeOpacity={0.7} hitSlop={8}>
        <Ionicons name="close" size={18} color="rgba(255,255,255,0.75)" />
      </TouchableOpacity>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  toast: {
    position: 'absolute',
    left: spacing.lg,
    right: spacing.lg,
    zIndex: 200,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm + 2,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md + 2,
    borderRadius: borderRadius.xl,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
  },
  text: {
    ...typography.bodySmall,
    flex: 1,
    color: colors.dark.text,
    fontWeight: '600',
    fontSize: 14,
  },
});
