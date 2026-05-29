import React from 'react';
import { StyleSheet, View } from 'react-native';
import { LiveBrbOverlay } from '@/components/live/LiveBrbOverlay';

type Props = {
  onResume?: () => void;
};

/** Compact BRB state inside the Live Studio preview card. */
export function BrbPreview({ onResume }: Props) {
  return (
    <View style={styles.wrap}>
      <LiveBrbOverlay compact showResume={Boolean(onResume)} onResume={onResume} />
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { flex: 1, minHeight: 120 },
});
