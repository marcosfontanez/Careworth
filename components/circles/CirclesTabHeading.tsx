import React from 'react';
import { View, StyleSheet, Pressable } from 'react-native';
import { Image } from 'expo-image';
import { pulseImageListThumbProps } from '@/lib/pulseImage';

const HEADER = require('../../assets/images/circles-header-lockup.png');

type Props = {
  /** When set, the lockup is tappable (e.g. clear search and return to Discover). */
  onPress?: () => void;
};

/**
 * Branded Circles tab intro — PulseVerse Circles lockup (transparent on dark bg).
 */
export function CirclesTabHeading({ onPress }: Props) {
  const inner = (
    <View style={styles.root} accessibilityRole="header" accessibilityLabel="PulseVerse Circles">
      <Image
        source={HEADER}
        style={styles.img}
        contentFit="contain"
        contentPosition="center"
        transition={0}
        accessibilityIgnoresInvertColors
        {...pulseImageListThumbProps}
      />
    </View>
  );

  if (!onPress) return inner;

  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel="Circles home — clears search"
      hitSlop={12}
      /** `width: '100%'` is required: parent `headerBrand` used `alignItems: 'flex-start'`,
       *  so the pressable never stretched and the lockup image’s `width: '100%'` collapsed. */
      style={({ pressed }) => [
        {
          alignSelf: 'stretch',
          width: '100%',
          /** Matches screen bg so expo-image `contain` letterboxing isn’t pure black. */
          backgroundColor: 'transparent',
        },
        pressed && { opacity: 0.85 },
      ]}
    >
      {inner}
    </Pressable>
  );
}

const HEADER_HEIGHT = 128;

const styles = StyleSheet.create({
  root: {
    width: '100%',
    alignSelf: 'stretch',
    minHeight: HEADER_HEIGHT,
    maxHeight: 136,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'transparent',
  },
  img: {
    width: '100%',
    height: HEADER_HEIGHT,
    maxWidth: 560,
    backgroundColor: 'transparent',
  },
});
