import React from 'react';
import { View, StyleSheet } from 'react-native';
import { PulseEmptyState } from '@/components/ui/pulse/PulseEmptyState';
import { PulseButton } from '@/components/ui/pulse/PulseButton';
import { pulseColors } from '@/lib/theme/pulseTheme';

type Props = {
  height: number;
  title?: string;
  subtitle?: string;
  onRetry?: () => void;
};

/** Feed-specific error panel on the video canvas — premium tone, same footprint as empty state. */
export function FeedErrorState({
  height,
  title = 'Couldn\u2019t load your Feed',
  subtitle = 'Pull down to refresh or try again.',
  onRetry,
}: Props) {
  return (
    <View style={[styles.wrap, { height }]}>
      <PulseEmptyState
        icon="cloud-offline-outline"
        title={title}
        message={subtitle}
        style={styles.inner}
      />
      {onRetry ? (
        <PulseButton label="Try again" onPress={onRetry} variant="secondary" style={styles.retry} />
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    backgroundColor: pulseColors.background,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 24,
  },
  inner: {
    paddingVertical: 0,
    paddingBottom: 0,
  },
  retry: {
    marginTop: 8,
    minWidth: 160,
  },
});
