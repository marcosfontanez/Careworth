import React from 'react';
import { Platform, StyleSheet, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { BlurView } from 'expo-blur';

type Props = {
  /** Parent must use `overflow: 'hidden'` and the same radius. */
  borderRadius: number;
  /** Native blur; web uses a frosted veil instead. */
  blurIntensity?: number;
};

/**
 * Frosted glass stack used on Creator Hub rows/panels — aligned with ShopEntryCard /
 * FeaturedShopHero (blur + depth tint + cyan/violet wash + top specular).
 */
export function CreatorHubGlassBackdrop({
  borderRadius: r,
  blurIntensity = 42,
}: Props) {
  const corner = { borderRadius: r };
  return (
    <>
      {Platform.OS === 'web' ? (
        <View style={[StyleSheet.absoluteFill, styles.webVeil, corner]} pointerEvents="none" />
      ) : (
        <BlurView intensity={blurIntensity} tint="dark" style={[StyleSheet.absoluteFill, corner]} pointerEvents="none" />
      )}
      <LinearGradient
        colors={['rgba(6,14,26,0.40)', 'rgba(3,7,18,0.74)', 'rgba(8,15,35,0.60)']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={[StyleSheet.absoluteFill, corner]}
        pointerEvents="none"
      />
      <LinearGradient
        colors={['rgba(56,189,248,0.09)', 'rgba(0,0,0,0)', 'rgba(99,102,241,0.08)']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={[StyleSheet.absoluteFill, corner]}
        pointerEvents="none"
      />
      <LinearGradient
        colors={['rgba(255,255,255,0.30)', 'rgba(255,255,255,0.07)', 'transparent']}
        locations={[0, 0.17, 1]}
        start={{ x: 0.5, y: 0 }}
        end={{ x: 0.5, y: 1 }}
        style={[styles.topShimmer, { borderTopLeftRadius: r, borderTopRightRadius: r }]}
        pointerEvents="none"
      />
    </>
  );
}

const styles = StyleSheet.create({
  webVeil: {
    backgroundColor: 'rgba(15,23,42,0.56)',
  },
  topShimmer: {
    position: 'absolute',
    left: 0,
    right: 0,
    top: 0,
    height: '38%',
  },
});
