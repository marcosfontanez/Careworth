import React from 'react';
import { StyleSheet, View } from 'react-native';
import { PulseEmptyState } from '@/components/ui/pulse';
import { layout, spacing } from '@/theme';

type Props = {
  onGoLive: () => void;
  /** When false, hide the Go Live CTA (e.g. unsigned viewers). */
  showGoLive?: boolean;
};

/** Empty Happening Now — premium glass card with optional Go Live CTA. */
export function HappeningNowEmptyState({ onGoLive, showGoLive = true }: Props) {
  return (
    <View style={styles.wrap}>
      <PulseEmptyState
        icon="radio-outline"
        title="No live streams right now"
        message="Start a stream or check back soon."
        actionLabel={showGoLive ? 'Go Live' : undefined}
        onAction={showGoLive ? onGoLive : undefined}
        style={styles.empty}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    paddingHorizontal: layout.screenPadding,
    marginTop: spacing.xs,
  },
  empty: { paddingVertical: spacing['2xl'] },
});
