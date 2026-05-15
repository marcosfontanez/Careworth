import React from 'react';
import { View, StyleSheet, Platform } from 'react-native';
import { BlurView } from 'expo-blur';
import { LinearGradient } from 'expo-linear-gradient';
import { AnimatedBackground } from '@/components/shop/premium/AnimatedBackground';
import { borderRadius, pvKit } from '@/theme';

type Props = {
  children: React.ReactNode;
  motionActive?: boolean;
};

const R = borderRadius['2xl'];

/**
 * Featured border spotlight — animated field + frosted glass + top specular (matches Circles / Shop entry polish).
 */
export function FeaturedShopHero({ children, motionActive = true }: Props) {
  const blurIntensity = Platform.OS === 'ios' ? 34 : Platform.OS === 'android' ? 24 : 18;

  return (
    <View style={styles.wrap}>
      <AnimatedBackground variant="featuredHero" intensity="medium" motionActive={motionActive} />
      {Platform.OS === 'web' ? (
        <View style={[StyleSheet.absoluteFill, styles.veilWeb]} pointerEvents="none" />
      ) : (
        <BlurView intensity={blurIntensity} tint="dark" style={[StyleSheet.absoluteFill, styles.blurZ]} pointerEvents="none" />
      )}
      <LinearGradient
        colors={['rgba(6,14,26,0.28)', 'rgba(3,7,18,0.58)', 'rgba(8,15,35,0.48)']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={[StyleSheet.absoluteFill, styles.veilGrad]}
        pointerEvents="none"
      />
      <LinearGradient
        colors={['rgba(56,189,248,0.12)', 'transparent', 'rgba(167,139,250,0.08)']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={[StyleSheet.absoluteFill, styles.tintWash]}
        pointerEvents="none"
      />
      <LinearGradient
        colors={['rgba(255,255,255,0.38)', 'rgba(255,255,255,0.1)', 'transparent']}
        locations={[0, 0.22, 1]}
        start={{ x: 0.5, y: 0 }}
        end={{ x: 0.5, y: 1 }}
        style={styles.topShimmer}
        pointerEvents="none"
      />
      <View style={styles.innerHairline} pointerEvents="none" />
      <View style={styles.foreground}>{children}</View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    borderRadius: R,
    overflow: 'hidden',
    position: 'relative',
  },
  veilWeb: {
    zIndex: 1,
    backgroundColor: 'rgba(15,23,42,0.28)',
  },
  blurZ: { zIndex: 1 },
  veilGrad: { zIndex: 1 },
  tintWash: { zIndex: 1 },
  topShimmer: {
    position: 'absolute',
    left: 0,
    right: 0,
    top: 0,
    height: '38%',
    borderTopLeftRadius: R,
    borderTopRightRadius: R,
    zIndex: 1,
  },
  innerHairline: {
    ...StyleSheet.absoluteFillObject,
    borderRadius: R,
    borderWidth: 1,
    borderColor: pvKit.cards.innerHairline,
    margin: 1,
    zIndex: 1,
    opacity: 0.95,
    pointerEvents: 'none',
  },
  foreground: {
    position: 'relative',
    zIndex: 2,
    paddingBottom: 6,
  },
});
