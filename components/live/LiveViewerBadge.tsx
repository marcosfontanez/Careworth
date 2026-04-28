import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors, borderRadius } from '@/theme';
import { formatCount } from '@/utils/format';

type Variant = 'glass' | 'solid';
type Size = 'sm' | 'md';

type Props = {
  count: number;
  variant?: Variant;
  size?: Size;
};

/**
 * Viewer count pill with eye icon. Used on every live card overlay.
 * "glass" variant for over-image overlays, "solid" for opaque chips.
 */
export function LiveViewerBadge({ count, variant = 'glass', size = 'md' }: Props) {
  const isSmall = size === 'sm';
  return (
    <View
      style={[
        styles.pill,
        isSmall ? styles.pillSm : styles.pillMd,
        variant === 'glass' ? styles.glass : styles.solid,
      ]}
    >
      <Ionicons name="eye" size={isSmall ? 11 : 12} color={colors.dark.text} />
      <Text style={[styles.text, isSmall && styles.textSm]}>{formatCount(count)}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  pill: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: borderRadius.sm - 2,
    borderWidth: 1,
  },
  pillMd: { gap: 5, paddingHorizontal: 8, paddingVertical: 4 },
  pillSm: { gap: 4, paddingHorizontal: 6, paddingVertical: 3 },
  glass: {
    backgroundColor: 'rgba(0,0,0,0.55)',
    borderColor: 'rgba(255,255,255,0.10)',
  },
  solid: {
    backgroundColor: colors.dark.cardAlt,
    borderColor: colors.dark.borderInner,
  },
  text: {
    fontSize: 11,
    fontWeight: '700',
    color: colors.dark.text,
    letterSpacing: 0.1,
  },
  textSm: { fontSize: 10 },
});
