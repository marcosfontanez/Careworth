import React from 'react';
import { View, StyleSheet } from 'react-native';
import { Image } from 'expo-image';

const HEADER = require('../../assets/images/circles-header-lockup.png');

/**
 * Branded Circles tab intro — uses exported lockup (transparent / black-friendly art).
 */
export function CirclesTabHeading() {
  return (
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
}

const HEADER_HEIGHT = 112;

const styles = StyleSheet.create({
  root: {
    alignSelf: 'stretch',
    minHeight: HEADER_HEIGHT,
    maxHeight: 120,
    justifyContent: 'center',
  },
  img: {
    width: '100%',
    height: HEADER_HEIGHT,
    maxWidth: 360,
    alignSelf: 'flex-start',
  },
});
