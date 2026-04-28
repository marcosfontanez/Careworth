import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { colors, borderRadius } from '@/theme';

type Size = 'sm' | 'md';

type Props = {
  size?: Size;
  /** When true, renders pulsing dot. Defaults true. */
  withDot?: boolean;
};

/**
 * Branded "LIVE" pill used across all live cards.
 * Single source of truth — change once, every card updates.
 */
export function LivePill({ size = 'md', withDot = true }: Props) {
  const isSmall = size === 'sm';
  return (
    <View
      style={[
        styles.pill,
        isSmall ? styles.pillSm : styles.pillMd,
      ]}
    >
      {withDot ? <View style={[styles.dot, isSmall && styles.dotSm]} /> : null}
      <Text style={[styles.text, isSmall && styles.textSm]}>LIVE</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  pill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.status.live,
    borderRadius: borderRadius.sm - 2,
  },
  pillMd: {
    gap: 5,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  pillSm: {
    gap: 4,
    paddingHorizontal: 6,
    paddingVertical: 3,
  },
  dot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: colors.dark.text,
  },
  dotSm: {
    width: 5,
    height: 5,
    borderRadius: 3,
  },
  text: {
    fontSize: 10,
    fontWeight: '900',
    color: colors.dark.text,
    letterSpacing: 0.6,
  },
  textSm: {
    fontSize: 9,
    letterSpacing: 0.5,
  },
});
