import React from 'react';
import { StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { colors, pvKit, pvHeroOuterGlow, pvGlassDepthShadow } from '@/theme';

export type PVHeroCardProps = {
  children: React.ReactNode;
  padding?: number;
  style?: StyleProp<ViewStyle>;
  contentStyle?: StyleProp<ViewStyle>;
  testID?: string;
};

/** Flagship hero — deeper stack + stronger rim + restrained outer bloom. */
export function PVHeroCard({ children, padding = pvKit.card.paddingWide, style, contentStyle, testID }: PVHeroCardProps) {
  const r = pvKit.card.radiusLarge;
  return (
    <View style={[styles.outer, pvGlassDepthShadow(), pvHeroOuterGlow(), style]} testID={testID}>
      <LinearGradient
        colors={[pvKit.card.fillTop, pvKit.card.fillMid, pvKit.card.fillBottom]}
        locations={[0, 0.45, 1]}
        start={{ x: 0.5, y: 0 }}
        end={{ x: 0.5, y: 1 }}
        style={[styles.gradient, { borderRadius: r }]}
      >
        <LinearGradient
          colors={[pvKit.card.specular, 'transparent']}
          start={{ x: 0.5, y: 0 }}
          end={{ x: 0.5, y: 0.5 }}
          style={[styles.specular, { borderTopLeftRadius: r, borderTopRightRadius: r }]}
          pointerEvents="none"
        />
        <LinearGradient
          colors={[...pvKit.cards.bottomVignette]}
          start={{ x: 0.5, y: 0.5 }}
          end={{ x: 0.5, y: 1 }}
          style={[styles.vignette, { borderBottomLeftRadius: r, borderBottomRightRadius: r }]}
          pointerEvents="none"
        />
        <View style={[styles.hairline, { borderRadius: r }]} pointerEvents="none" />
        <View style={[styles.inner, { padding, borderRadius: Math.max(0, r - 1) }, contentStyle]}>{children}</View>
      </LinearGradient>
    </View>
  );
}

const styles = StyleSheet.create({
  outer: {
    borderRadius: pvKit.card.radiusLarge,
    borderWidth: 1,
    borderColor: pvKit.hero.border,
    overflow: 'hidden',
    backgroundColor: colors.dark.card,
  },
  gradient: { overflow: 'hidden' },
  specular: {
    position: 'absolute',
    left: 0,
    right: 0,
    top: 0,
    height: '56%',
  },
  vignette: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    height: '52%',
  },
  hairline: {
    ...StyleSheet.absoluteFillObject,
    borderWidth: 1,
    borderColor: pvKit.cards.innerHairline,
    margin: 1,
    opacity: 0.95,
    pointerEvents: 'none',
  },
  inner: {
    position: 'relative',
    zIndex: 1,
  },
});
