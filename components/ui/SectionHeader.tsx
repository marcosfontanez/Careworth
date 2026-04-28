import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, type ViewStyle } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import type { ComponentProps } from 'react';
import { colors, layout, typography, spacing } from '@/theme';

type IonName = ComponentProps<typeof Ionicons>['name'];

type Variant = 'section' | 'prominent';

type Props = {
  /** Uppercase micro label above the title. */
  kicker?: string;
  /** Primary title text. */
  title: string;
  /** Optional accent icon next to the title (e.g. star for Featured). */
  icon?: IonName;
  /** Tint for the accent icon. Defaults to brand gold. */
  iconColor?: string;
  /** Right-aligned tap-through action (e.g. "See all"). */
  actionLabel?: string;
  onActionPress?: () => void;
  /**
   * - `section` (default): compact 16px title — use inside a scroll of
   *   grouped content so a screen can have several without crowding.
   * - `prominent`: 19px title — use when the section itself is the
   *   visual center of the screen (Live tab's "Featured / Top / Rising").
   */
  variant?: Variant;
  style?: ViewStyle;
};

/**
 * Canonical section header across Feed / Circles / Live / Create /
 * Pulse Page. Replaces the old `LiveSectionHeader` + the hand-rolled
 * "title + See all" rows that had drifted into every list screen.
 *
 * Why `variant` exists: Live wanted a slightly larger header than the
 * compact section rows used in Circles. Rather than two components,
 * one component with an opinionated variant keeps the alignment of
 * padding, color, and action style in lockstep.
 */
export function SectionHeader({
  kicker,
  title,
  icon,
  iconColor,
  actionLabel,
  onActionPress,
  variant = 'section',
  style,
}: Props) {
  const titleStyle = variant === 'prominent' ? styles.titleProminent : styles.title;
  return (
    <View style={[styles.row, style]}>
      <View style={styles.textCol}>
        {kicker ? <Text style={styles.kicker}>{kicker}</Text> : null}
        <View style={styles.titleRow}>
          <Text style={titleStyle} numberOfLines={1}>
            {title}
          </Text>
          {icon ? (
            <Ionicons
              name={icon}
              size={variant === 'prominent' ? 16 : 14}
              color={iconColor ?? colors.primary.gold}
              style={styles.icon}
            />
          ) : null}
        </View>
      </View>
      {actionLabel && onActionPress ? (
        <TouchableOpacity onPress={onActionPress} hitSlop={12} accessibilityRole="button" activeOpacity={0.7}>
          <Text style={styles.action}>{actionLabel}</Text>
        </TouchableOpacity>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'space-between',
    paddingHorizontal: layout.screenPadding,
    marginBottom: spacing.md,
    gap: spacing.md,
  },
  textCol: { flex: 1, minWidth: 0 },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    minWidth: 0,
  },
  kicker: {
    ...typography.label,
    color: colors.dark.textMuted,
    marginBottom: spacing.xs,
  },
  title: {
    ...typography.sectionTitle,
    color: colors.dark.text,
    flexShrink: 1,
  },
  titleProminent: {
    ...typography.h2,
    fontSize: 19,
    color: colors.dark.text,
    letterSpacing: -0.3,
    flexShrink: 1,
  },
  icon: { marginLeft: spacing.xs / 2 },
  action: {
    ...typography.sectionLabel,
    color: colors.primary.teal,
    fontWeight: '700',
  },
});
