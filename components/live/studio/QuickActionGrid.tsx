import React from 'react';
import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  Text,
  View,
  useWindowDimensions,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import {
  pulseColors,
  pulseGradients,
  pulseRadius,
  pulseSpacing,
  pulseTypography,
} from '@/lib/theme/pulseTheme';
import {
  quickActionVariantStyles,
  type QuickActionVariant,
} from '@/lib/live/studio/liveStudioTheme';

export type QuickAction = {
  key: string;
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  description?: string;
  onPress: () => void;
  disabled?: boolean;
  active?: boolean;
  loading?: boolean;
  variant?: QuickActionVariant;
  /** @deprecated use variant */
  tone?: 'default' | 'danger' | 'gold';
};

type Props = {
  action: QuickAction;
  flexBasis: `${number}%`;
};

function resolveVariant(action: QuickAction): QuickActionVariant {
  if (action.variant) return action.variant;
  if (action.tone === 'danger') return 'danger';
  if (action.tone === 'gold') return 'gold';
  return 'default';
}

/** Premium quick-action tile for Live Studio. */
export function QuickActionTile({ action, flexBasis }: Props) {
  const variant = resolveVariant(action);
  const palette = quickActionVariantStyles[variant];
  const disabled = action.disabled || action.loading;

  return (
    <Pressable
      onPress={action.onPress}
      disabled={disabled}
      style={({ pressed }) => [
        { flexBasis, maxWidth: flexBasis },
        styles.outer,
        action.active && styles.outerActive,
        disabled && styles.outerDisabled,
        pressed && !disabled && styles.outerPressed,
      ]}
      accessibilityRole="button"
      accessibilityLabel={action.label}
      accessibilityState={{ disabled, busy: action.loading }}
    >
      <LinearGradient colors={[...palette.gradient]} style={styles.card}>
        <View style={[styles.iconWell, { borderColor: palette.border }]}>
          {action.loading ? (
            <ActivityIndicator size="small" color={palette.iconColor} />
          ) : (
            <Ionicons name={action.icon} size={22} color={palette.iconColor} />
          )}
        </View>
        <Text style={styles.label} numberOfLines={2}>
          {action.label}
        </Text>
        {action.description ? (
          <Text style={styles.description} numberOfLines={2}>
            {action.description}
          </Text>
        ) : null}
      </LinearGradient>
    </Pressable>
  );
}

type GridProps = {
  actions: QuickAction[];
};

/** Two-column premium quick action grid (three columns on wider screens). */
export function QuickActionGrid({ actions }: GridProps) {
  const { width } = useWindowDimensions();
  const columns = width >= 420 ? 3 : 2;
  const gap = pulseSpacing.md;
  const flexBasis: `${number}%` = columns === 3 ? '31.5%' : '48%';

  return (
    <View style={[styles.grid, { gap }]}>
      {actions.map((action) => (
        <QuickActionTile key={action.key} action={action} flexBasis={flexBasis} />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    paddingVertical: pulseSpacing.xs,
  },
  outer: {
    marginBottom: 0,
  },
  outerActive: {
    transform: [{ scale: 1.01 }],
  },
  outerDisabled: { opacity: 0.48 },
  outerPressed: { opacity: 0.9, transform: [{ scale: 0.98 }] },
  card: {
    minHeight: 118,
    borderRadius: pulseRadius.lg,
    paddingHorizontal: pulseSpacing.md,
    paddingVertical: pulseSpacing.lg,
    borderWidth: 1,
    borderColor: pulseColors.border,
    gap: pulseSpacing.sm,
    backgroundColor: pulseColors.glass,
  },
  iconWell: {
    width: 44,
    height: 44,
    borderRadius: pulseRadius.lg,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(7, 17, 31, 0.55)',
    borderWidth: 1,
  },
  label: {
    ...pulseTypography.caption,
    fontSize: 12,
    fontWeight: '800',
    color: pulseColors.text,
    lineHeight: 15,
  },
  description: {
    ...pulseTypography.caption,
    fontSize: 10,
    lineHeight: 14,
  },
});
