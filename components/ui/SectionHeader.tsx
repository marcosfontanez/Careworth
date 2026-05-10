import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, type ViewStyle } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import type { ComponentProps } from 'react';
import { colors, layout, typography, spacing, pulseverse } from '@/theme';

type IonName = ComponentProps<typeof Ionicons>['name'];

type Variant = 'section' | 'prominent';

type Props = {
  /** Uppercase micro label above the title. */
  kicker?: string;
  /**
   * `pulse`: soft electric cyan kicker (Shop, Hub, vault-adjacent surfaces).
   * `default`: muted slate — general lists.
   */
  kickerTone?: 'default' | 'pulse';
  /** Primary title text. */
  title: string;
  /** Quiet line under the title (not the uppercase kicker). */
  subtitle?: string;
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
  kickerTone = 'default',
  title,
  icon,
  iconColor,
  actionLabel,
  onActionPress,
  variant = 'section',
  subtitle,
  style,
}: Props) {
  const titleStyle = variant === 'prominent' ? styles.titleProminent : styles.title;
  return (
    <View style={[styles.row, subtitle ? styles.rowAlignTop : null, style]}>
      <View style={styles.textCol}>
        {kicker ? (
          <Text style={[styles.kicker, kickerTone === 'pulse' && styles.kickerPulse]}>{kicker}</Text>
        ) : null}
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
        {subtitle ? <Text style={styles.subtitle}>{subtitle}</Text> : null}
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
    marginBottom: spacing.lg,
    gap: spacing.md,
  },
  rowAlignTop: { alignItems: 'flex-start' },
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
    color: pulseverse.electric,
    fontWeight: '700',
  },
  kickerPulse: {
    color: pulseverse.electricSoft,
    fontWeight: '800',
    letterSpacing: 0.6,
  },
  subtitle: {
    marginTop: spacing.xs,
    fontSize: 13,
    fontWeight: '500',
    color: colors.dark.textMuted,
    lineHeight: 18,
  },
});
