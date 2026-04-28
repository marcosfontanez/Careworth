import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import type { ComponentProps } from 'react';
import { colors, typography, spacing, iconSize, touchTarget } from '@/theme';

type IonName = ComponentProps<typeof Ionicons>['name'];

type Props = {
  insetTop: number;
  title: string;
  onPressLeft: () => void;
  /** Default: back arrow */
  leftIcon?: IonName;
  leftAccessibilityLabel?: string;
  /** Small widget beside title (e.g. unread count) */
  titleAccessory?: React.ReactNode;
  /** Trailing control — use placeholder width when omitting for balance */
  right?: React.ReactNode;
};

export function StackScreenHeader({
  insetTop,
  title,
  onPressLeft,
  leftIcon = 'arrow-back',
  leftAccessibilityLabel = 'Go back',
  titleAccessory,
  right,
}: Props) {
  const slot = touchTarget.min;
  return (
    <View style={[styles.bar, { paddingTop: insetTop + spacing.sm }]}>
      <TouchableOpacity
        onPress={onPressLeft}
        style={styles.hit}
        hitSlop={12}
        accessibilityRole="button"
        accessibilityLabel={leftAccessibilityLabel}
      >
        <Ionicons name={leftIcon} size={iconSize.lg} color={colors.dark.text} />
      </TouchableOpacity>

      <View style={styles.center}>
        <View style={styles.titleRow}>
          <Text style={styles.title} numberOfLines={1}>
            {title}
          </Text>
          {titleAccessory}
        </View>
      </View>

      <View style={[styles.rightSlot, styles.hitRight]}>
        {right ?? <View style={{ width: slot }} />}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  bar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.sm + spacing.xs,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.dark.borderSubtle,
    backgroundColor: colors.dark.bg,
  },
  hit: {
    width: touchTarget.min,
    minHeight: touchTarget.min,
    justifyContent: 'center',
  },
  /** Trailing slot: min tap width but can grow for text actions (e.g. “Mark all read”) */
  rightSlot: {
    minWidth: touchTarget.min,
    minHeight: touchTarget.min,
    justifyContent: 'center',
  },
  hitRight: { alignItems: 'flex-end' },
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing.sm,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    maxWidth: '100%',
    justifyContent: 'center',
  },
  title: {
    ...typography.navTitle,
    color: colors.dark.text,
    flexShrink: 1,
    textAlign: 'center',
  },
});
