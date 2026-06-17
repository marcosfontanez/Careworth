import React from 'react';
import { View, StyleSheet } from 'react-native';
import { PulseLoadingSkeleton } from '@/components/ui/pulse/PulseLoadingSkeleton';
import { rhythm, spacing } from '@/theme';

type Props = { count?: number };

/** Skeleton cards while joined Circles hydrate — avoids empty → jump flash. */
export function CircleJoinedSkeleton({ count = 3 }: Props) {
  return (
    <View style={styles.wrap}>
      {Array.from({ length: count }).map((_, i) => (
        <PulseLoadingSkeleton
          key={i}
          card
          minHeight={rhythm.circleListCardMinHeight}
          style={styles.card}
        />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { gap: rhythm.cardGap, paddingHorizontal: rhythm.pageHorizontalPadding },
  card: { marginBottom: 0, minHeight: rhythm.circleListCardMinHeight },
});
