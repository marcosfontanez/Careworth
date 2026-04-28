import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ScrollView, Platform } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { colors, borderRadius } from '@/theme';
import type { CircleAccent } from '@/lib/circleAccents';

export type CircleMode = 'top' | 'fresh' | 'video' | 'questions';

const MODES: {
  key: CircleMode;
  label: string;
  icon: React.ComponentProps<typeof Ionicons>['name'];
}[] = [
  { key: 'top', label: 'Top', icon: 'star' },
  { key: 'fresh', label: 'Fresh', icon: 'time' },
  { key: 'video', label: 'Video', icon: 'play-circle' },
  { key: 'questions', label: 'Questions', icon: 'help-circle' },
];

type Props = {
  active: CircleMode;
  accent: CircleAccent;
  onSelect: (mode: CircleMode) => void;
  /**
   * When true (anonymous/confessions rooms) the Video filter is hidden —
   * those rooms are text-first by design and showing an empty Video tab
   * implies functionality the room shouldn't expose.
   */
  hideVideo?: boolean;
};

/**
 * Branded mode selector. Replaces the previous Reddit-style sort bar with
 * premium pill chips. Active state uses an accent-tinted gradient + soft
 * elevation so the selected filter visibly "lifts" off the row, matching
 * the rest of the room's elevated card language.
 */
export function CircleModeChips({ active, accent, onSelect, hideVideo }: Props) {
  const visibleModes = hideVideo ? MODES.filter((m) => m.key !== 'video') : MODES;
  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={styles.scrollPad}
    >
      {visibleModes.map((m) => {
        const isActive = active === m.key;
        const inner = (
          <View style={styles.chipInner}>
            <Ionicons
              name={m.icon}
              size={14.5}
              color={isActive ? accent.color : colors.dark.textMuted}
            />
            <Text
              style={[
                styles.chipText,
                isActive && { color: accent.color, fontWeight: '800' },
              ]}
            >
              {m.label}
            </Text>
          </View>
        );
        return (
          <TouchableOpacity
            key={m.key}
            onPress={() => onSelect(m.key)}
            activeOpacity={0.85}
            style={[styles.chipShadow, isActive && styles.chipShadowActive]}
          >
            {isActive ? (
              <LinearGradient
                colors={[`${accent.color}33`, `${accent.color}14`]}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={[styles.chip, { borderColor: accent.color }]}
              >
                {inner}
              </LinearGradient>
            ) : (
              <View style={styles.chip}>{inner}</View>
            )}
          </TouchableOpacity>
        );
      })}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  scrollPad: {
    paddingHorizontal: 14,
    paddingTop: 14,
    paddingBottom: 6,
    gap: 8,
  },
  /** Wrapper that owns the shadow so the gradient/border can stay clean
   *  on the inner chip. Inactive chips skip the lift to keep the row
   *  visually quiet — only the selected filter "pops". */
  chipShadow: {
    borderRadius: borderRadius.full ?? 999,
  },
  chipShadowActive: {
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 3 },
        shadowOpacity: 0.30,
        shadowRadius: 6,
      },
      android: { elevation: 3 },
      default: {},
    }),
  },
  chip: {
    paddingHorizontal: 14,
    paddingVertical: 9,
    borderRadius: borderRadius.full ?? 999,
    backgroundColor: colors.dark.card,
    borderWidth: 1.5,
    borderColor: colors.dark.border,
  },
  chipInner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 7,
  },
  chipText: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.dark.textMuted,
    letterSpacing: 0.2,
  },
});
