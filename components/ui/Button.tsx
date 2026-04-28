import React, { useMemo } from 'react';
import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  Text,
  View,
  type GestureResponderEvent,
  type PressableStateCallbackType,
  type StyleProp,
  type TextStyle,
  type ViewStyle,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import type { ComponentProps } from 'react';
import { borderRadius, colors, shadows, spacing, typography } from '@/theme';

type IonName = ComponentProps<typeof Ionicons>['name'];

/**
 * Four-variant button primitive. Purpose is to END the proliferation of
 * hand-rolled `TouchableOpacity` + ad-hoc `StyleSheet` buttons across
 * screens (there were dozens, each with slightly different padding /
 * radius / disabled treatment / loading state). Adopt this first on
 * "primary CTA" surfaces, then sweep the rest opportunistically.
 *
 * Variants
 * - `primary`     brand teal fill, white text, CTA glow      (hero CTAs)
 * - `secondary`   dark card fill, white text, subtle border  (supporting actions)
 * - `ghost`       transparent, teal text + border            (tertiary / "See …")
 * - `destructive` red tint, white text                       (delete / remove)
 *
 * Sizes
 * - `md` (default) — standard 44pt touch target
 * - `sm`           — inline / within cards
 * - `lg`           — hero / onboarding / full-width primary
 *
 * Disabled + loading render mutually-exclusive states: loading keeps
 * the button width stable (spinner in place of the label) so the
 * layout doesn't shift while a mutation runs.
 */

type Variant = 'primary' | 'secondary' | 'ghost' | 'destructive';
type Size = 'sm' | 'md' | 'lg';

export interface ButtonProps {
  label: string;
  onPress?: (e: GestureResponderEvent) => void;
  variant?: Variant;
  size?: Size;
  /** Shown to the LEFT of the label (icon-first convention). */
  leftIcon?: IonName;
  /** Shown to the RIGHT of the label (e.g. chevron for "See …"). */
  rightIcon?: IonName;
  disabled?: boolean;
  /** Replaces the label with a spinner; still ignores `onPress`. */
  loading?: boolean;
  /** Pins the button to full container width. Default: hug content. */
  fullWidth?: boolean;
  /** Extra container style (positioning only — colors/paddings come from variant). */
  style?: StyleProp<ViewStyle>;
  /** Extra label style (rarely needed — variant already picks the color). */
  textStyle?: StyleProp<TextStyle>;
  /** A11y. */
  accessibilityLabel?: string;
}

export function Button({
  label,
  onPress,
  variant = 'primary',
  size = 'md',
  leftIcon,
  rightIcon,
  disabled = false,
  loading = false,
  fullWidth = false,
  style,
  textStyle,
  accessibilityLabel,
}: ButtonProps) {
  const v = VARIANT_STYLES[variant];
  const s = SIZE_STYLES[size];

  // Memoise the pressed style because `Pressable` accepts a function that
  // runs on every press-state change; inlining allocates a new object
  // each render and breaks `Pressable`'s internal shallow compare.
  const pressed = useMemo<StyleProp<ViewStyle>>(
    () => ({ opacity: disabled || loading ? 1 : 0.88 }),
    [disabled, loading],
  );

  const resolveStyle = ({ pressed: isPressed }: PressableStateCallbackType) => [
    styles.base,
    s.container,
    v.container,
    fullWidth && styles.fullWidth,
    variant === 'primary' && !disabled && !loading && shadows.cta,
    disabled && styles.disabled,
    isPressed ? pressed : null,
    style,
  ];

  const iconColor = v.iconColor;
  const iconSize = s.iconSize;

  return (
    <Pressable
      onPress={disabled || loading ? undefined : onPress}
      disabled={disabled || loading}
      style={resolveStyle}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel ?? label}
      accessibilityState={{ disabled: disabled || loading, busy: loading }}
      hitSlop={8}
    >
      {loading ? (
        <ActivityIndicator color={v.text.color} size="small" />
      ) : (
        <View style={styles.content}>
          {leftIcon ? <Ionicons name={leftIcon} size={iconSize} color={iconColor} /> : null}
          <Text style={[s.text, v.text, textStyle]} numberOfLines={1}>
            {label}
          </Text>
          {rightIcon ? <Ionicons name={rightIcon} size={iconSize} color={iconColor} /> : null}
        </View>
      )}
    </Pressable>
  );
}

// ─────────────────────────────────────────────────────────────────────
// Styles
// ─────────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  base: {
    borderRadius: borderRadius.button,
    alignSelf: 'flex-start',
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
  },
  fullWidth: { alignSelf: 'stretch' },
  content: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  disabled: { opacity: 0.5 },
});

const SIZE_STYLES: Record<Size, { container: ViewStyle; text: TextStyle; iconSize: number }> = {
  sm: {
    container: { paddingHorizontal: spacing.md, paddingVertical: spacing.xs + 2, minHeight: 32 },
    text: { ...typography.button, fontSize: 13 },
    iconSize: 14,
  },
  md: {
    container: { paddingHorizontal: spacing.lg, paddingVertical: spacing.sm + 2, minHeight: 44 },
    text: { ...typography.button, fontSize: 15 },
    iconSize: 16,
  },
  lg: {
    container: { paddingHorizontal: spacing.xl, paddingVertical: spacing.md, minHeight: 52 },
    text: { ...typography.button, fontSize: 16 },
    iconSize: 18,
  },
};

interface VariantStyle {
  container: ViewStyle;
  text: TextStyle;
  iconColor: string;
}

const VARIANT_STYLES: Record<Variant, VariantStyle> = {
  primary: {
    container: { backgroundColor: colors.primary.teal },
    text: { color: '#FFFFFF' },
    iconColor: '#FFFFFF',
  },
  secondary: {
    container: {
      backgroundColor: colors.dark.card,
      borderWidth: StyleSheet.hairlineWidth,
      borderColor: colors.dark.border,
    },
    text: { color: colors.dark.text },
    iconColor: colors.dark.text,
  },
  ghost: {
    container: {
      backgroundColor: 'transparent',
      borderWidth: 1,
      borderColor: colors.primary.teal,
    },
    text: { color: colors.primary.teal },
    iconColor: colors.primary.teal,
  },
  destructive: {
    container: { backgroundColor: colors.status.error },
    text: { color: '#FFFFFF' },
    iconColor: '#FFFFFF',
  },
};
