import React from 'react';
import { StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';
import { pulseColors, pulseRadius, pulseSpacing } from '@/lib/theme/pulseTheme';

type Props = {
  lines?: number;
  style?: StyleProp<ViewStyle>;
  /** Render a card-shaped skeleton block. */
  card?: boolean;
  /** Match destination card min-height to reduce layout shift. */
  minHeight?: number;
};

function SkeletonLine({ width }: { width: `${number}%` | number }) {
  return <View style={[styles.line, typeof width === 'number' ? { width } : { width }]} />;
}

/** Premium loading placeholder — static skeleton blocks (no animation dependency). */
export function PulseLoadingSkeleton({ lines = 3, style, card = false, minHeight }: Props) {
  if (card) {
    return (
      <View
        style={[styles.card, minHeight != null ? { minHeight } : null, style]}
        accessibilityRole="progressbar"
        accessibilityLabel="Loading"
      >
        <SkeletonLine width="42%" />
        <SkeletonLine width="88%" />
        <SkeletonLine width="72%" />
        <View style={styles.cardFooter}>
          <View style={styles.pill} />
          <View style={styles.pillWide} />
        </View>
      </View>
    );
  }

  return (
    <View style={[styles.wrap, style]} accessibilityRole="progressbar" accessibilityLabel="Loading">
      {Array.from({ length: lines }).map((_, i) => (
        <SkeletonLine key={i} width={i === lines - 1 ? '68%' : '100%'} />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { gap: pulseSpacing.sm },
  line: {
    height: 12,
    borderRadius: pulseRadius.sm,
    backgroundColor: 'rgba(147, 164, 184, 0.14)',
  },
  card: {
    borderRadius: pulseRadius.card,
    borderWidth: 1,
    borderColor: pulseColors.border,
    backgroundColor: pulseColors.glass,
    padding: pulseSpacing.lg,
    gap: pulseSpacing.sm,
  },
  cardFooter: {
    flexDirection: 'row',
    gap: pulseSpacing.sm,
    marginTop: pulseSpacing.sm,
  },
  pill: {
    width: 64,
    height: 24,
    borderRadius: pulseRadius.full,
    backgroundColor: 'rgba(147, 164, 184, 0.12)',
  },
  pillWide: {
    flex: 1,
    height: 24,
    borderRadius: pulseRadius.full,
    backgroundColor: 'rgba(147, 164, 184, 0.1)',
  },
});
