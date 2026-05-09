import React from 'react';
import { View, Text, StyleSheet, Platform, type StyleProp, type ViewStyle } from 'react-native';
import { borderRadius, colors } from '@/theme';

export type AccentComposerFrameProps = {
  accentColor: string;
  /** Short label above the field (accent dot + copy). Omit / empty to hide. */
  hint?: string;
  children: React.ReactNode;
  footer?: React.ReactNode;
  style?: StyleProp<ViewStyle>;
  innerStyle?: StyleProp<ViewStyle>;
  /**
   * Tighter padding + lighter elevation — single-line fields, auth, search,
   * stacked forms. Keeps the left accent rail and card surface.
   */
  compact?: boolean;
  /** Flat surface (no drop shadow) — dense stacks, nested sheets. */
  noShadow?: boolean;
};

const shadowStrong = Platform.select({
  ios: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.22,
    shadowRadius: 8,
  },
  android: { elevation: 3 },
  default: {},
});

const shadowSoft = Platform.select({
  ios: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.12,
    shadowRadius: 5,
  },
  android: { elevation: 2 },
  default: {},
});

/**
 * Shared “Circle composer” chrome: lifted card, left accent rail, optional hint row.
 * Use across the app for any typing surface — use `compact` + `noShadow` for forms/search.
 */
export function AccentComposerFrame({
  accentColor,
  hint,
  children,
  footer,
  style,
  innerStyle,
  compact = false,
  noShadow = false,
}: AccentComposerFrameProps) {
  const showHint = Boolean(hint?.trim());
  return (
    <View
      style={[
        styles.cardBase,
        compact ? styles.cardCompactRadius : null,
        noShadow ? null : compact ? shadowSoft : shadowStrong,
        { borderLeftColor: accentColor },
        style,
      ]}
      accessibilityRole="none"
    >
      <View style={[compact ? styles.innerCompact : styles.inner, innerStyle]}>
        {showHint ? (
          <View style={styles.hintRow}>
            <View style={[styles.hintDot, compact && styles.hintDotCompact, { backgroundColor: accentColor }]} />
            <Text style={[styles.hint, compact && styles.hintCompact]}>{hint!.trim()}</Text>
          </View>
        ) : null}
        {children}
        {footer != null ? <View style={styles.footer}>{footer}</View> : null}
      </View>
    </View>
  );
}

export type AccentCharCountProps = {
  length: number;
  max: number;
  accentColor: string;
  warnWithin?: number;
  hideWhenEmpty?: boolean;
};

export function AccentCharCount({
  length,
  max,
  accentColor,
  warnWithin = 30,
  hideWhenEmpty = true,
}: AccentCharCountProps) {
  if (hideWhenEmpty && length <= 0) return null;
  const remaining = max - length;
  const near = remaining <= warnWithin;
  return (
    <Text
      style={[styles.charCount, near && { color: accentColor, fontWeight: '700' }]}
      accessibilityLiveRegion="polite"
    >
      {length}/{max}
    </Text>
  );
}

const styles = StyleSheet.create({
  cardBase: {
    backgroundColor: colors.dark.card,
    borderRadius: borderRadius.card ?? 16,
    borderWidth: 1,
    borderColor: colors.dark.border,
    borderLeftWidth: 3,
  },
  cardCompactRadius: {
    borderRadius: borderRadius.lg ?? 14,
  },
  inner: {
    paddingHorizontal: 14,
    paddingTop: 12,
    paddingBottom: 10,
    gap: 8,
  },
  innerCompact: {
    paddingHorizontal: 12,
    paddingTop: 8,
    paddingBottom: 8,
    gap: 6,
  },
  hintRow: { flexDirection: 'row', alignItems: 'center', gap: 7 },
  hintDot: { width: 6, height: 6, borderRadius: 3 },
  hintDotCompact: { width: 5, height: 5, borderRadius: 2.5 },
  hint: { fontSize: 13, color: colors.dark.textMuted, fontWeight: '700', letterSpacing: 0.1, flex: 1 },
  hintCompact: { fontSize: 12, fontWeight: '600' },
  footer: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    alignItems: 'center',
  },
  charCount: {
    fontSize: 11,
    color: colors.dark.textQuiet,
    fontVariant: ['tabular-nums'],
  },
});
