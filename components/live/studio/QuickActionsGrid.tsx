import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors, borderRadius, typography } from '@/theme';

export type QuickAction = {
  key: string;
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  onPress: () => void;
  disabled?: boolean;
  active?: boolean;
  tone?: 'default' | 'danger' | 'gold';
};

type Props = {
  actions: QuickAction[];
};

/** Stream Manager quick actions — grid of host controls. */
export function QuickActionsGrid({ actions }: Props) {
  return (
    <View style={styles.grid}>
      {actions.map((action) => {
        const tone = action.tone ?? 'default';
        return (
          <Pressable
            key={action.key}
            onPress={action.onPress}
            disabled={action.disabled}
            style={({ pressed }) => [
              styles.tile,
              action.active && styles.tileActive,
              tone === 'danger' && styles.tileDanger,
              tone === 'gold' && styles.tileGold,
              action.disabled && styles.tileDisabled,
              pressed && !action.disabled && styles.tilePressed,
            ]}
            accessibilityRole="button"
            accessibilityLabel={action.label}
          >
            <Ionicons
              name={action.icon}
              size={22}
              color={
                tone === 'danger'
                  ? '#FFF'
                  : tone === 'gold'
                    ? colors.primary.gold
                    : action.active
                      ? colors.primary.teal
                      : colors.neutral.white
              }
            />
            <Text style={[styles.label, action.active && styles.labelActive]} numberOfLines={2}>
              {action.label}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    paddingVertical: 4,
  },
  tile: {
    width: '31%',
    minWidth: 96,
    flexGrow: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 14,
    paddingHorizontal: 8,
    borderRadius: borderRadius.lg,
    backgroundColor: 'rgba(12,18,32,0.82)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
  },
  tileActive: {
    borderColor: 'rgba(56,189,248,0.45)',
    backgroundColor: 'rgba(15,28,48,0.92)',
  },
  tileDanger: {
    backgroundColor: 'rgba(127,29,29,0.82)',
    borderColor: 'rgba(252,165,165,0.35)',
  },
  tileGold: {
    borderColor: 'rgba(250,204,21,0.35)',
  },
  tileDisabled: { opacity: 0.45 },
  tilePressed: { opacity: 0.88, transform: [{ scale: 0.98 }] },
  label: {
    ...typography.caption,
    fontSize: 11,
    fontWeight: '700',
    color: 'rgba(248,250,252,0.88)',
    textAlign: 'center',
    lineHeight: 14,
  },
  labelActive: { color: colors.primary.teal },
});
