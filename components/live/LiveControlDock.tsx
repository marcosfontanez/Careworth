import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors, borderRadius, typography } from '@/theme';

export type LiveDockAction = {
  key: string;
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  onPress: () => void;
  active?: boolean;
  disabled?: boolean;
  accent?: 'teal' | 'gold' | 'danger' | 'default';
};

type Props = {
  actions: LiveDockAction[];
};

/** Minimal bottom control dock — keeps the live stage unobstructed. */
export function LiveControlDock({ actions }: Props) {
  return (
    <View style={styles.wrap}>
      {actions.map((action) => {
        const accent = action.accent ?? 'default';
        return (
          <Pressable
            key={action.key}
            onPress={action.onPress}
            disabled={action.disabled}
            style={({ pressed }) => [
              styles.btn,
              action.active && styles.btnActive,
              accent === 'danger' && styles.btnDanger,
              action.disabled && styles.btnDisabled,
              pressed && !action.disabled && styles.btnPressed,
            ]}
            accessibilityRole="button"
            accessibilityLabel={action.label}
          >
            <Ionicons
              name={action.icon}
              size={20}
              color={
                action.disabled
                  ? colors.dark.textMuted
                  : accent === 'gold'
                    ? colors.primary.gold
                    : accent === 'danger'
                      ? colors.neutral.white
                      : action.active
                        ? colors.primary.teal
                        : colors.neutral.white
              }
            />
            <Text
              style={[
                styles.label,
                action.active && styles.labelActive,
                action.disabled && styles.labelDisabled,
              ]}
              numberOfLines={1}
            >
              {action.label}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'space-between',
    gap: 6,
    paddingVertical: 8,
    paddingHorizontal: 4,
  },
  btn: {
    flex: 1,
    minWidth: 0,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
    paddingVertical: 8,
    paddingHorizontal: 4,
    borderRadius: borderRadius.lg,
    backgroundColor: 'rgba(12,18,32,0.72)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
  },
  btnActive: {
    borderColor: 'rgba(56,189,248,0.45)',
    backgroundColor: 'rgba(15,28,48,0.88)',
  },
  btnDanger: {
    backgroundColor: 'rgba(127,29,29,0.82)',
    borderColor: 'rgba(252,165,165,0.35)',
  },
  btnDisabled: { opacity: 0.45 },
  btnPressed: { opacity: 0.88, transform: [{ scale: 0.98 }] },
  label: {
    ...typography.caption,
    fontSize: 10,
    fontWeight: '700',
    color: 'rgba(248,250,252,0.82)',
    textAlign: 'center',
  },
  labelActive: { color: colors.primary.teal },
  labelDisabled: { color: colors.dark.textMuted },
});
