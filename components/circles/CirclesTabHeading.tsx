import React from 'react';
import { View, StyleSheet, Pressable } from 'react-native';
import { Image } from 'expo-image';
import { colors } from '@/theme';

const HEADER = require('../../assets/images/circles-header-lockup.png');

type Props = {
  /** When set, the lockup is tappable (e.g. clear search and return to Discover). */
  onPress?: () => void;
};

/**
 * Branded Circles tab intro — uses exported lockup (transparent / black-friendly art).
 */
export function CirclesTabHeading({ onPress }: Props) {
  const inner = (
    <View style={styles.root} accessibilityRole="header" accessibilityLabel="PulseVerse Circles">
      <Image
        source={HEADER}
        style={styles.img}
        contentFit="contain"
        contentPosition="left"
        transition={0}
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
          backgroundColor: colors.dark.bg,
        },
        pressed && { opacity: 0.85 },
      ]}
    >
      {inner}
    </Pressable>
  );
}

const HEADER_HEIGHT = 112;

const styles = StyleSheet.create({
  root: {
    width: '100%',
    alignSelf: 'stretch',
    minHeight: HEADER_HEIGHT,
    maxHeight: 120,
    justifyContent: 'center',
    backgroundColor: colors.dark.bg,
  },
  img: {
    width: '100%',
    height: HEADER_HEIGHT,
    maxWidth: 360,
    alignSelf: 'flex-start',
    backgroundColor: colors.dark.bg,
  },
});
