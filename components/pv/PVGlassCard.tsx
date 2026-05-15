import React from 'react';
import { StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { colors, pvKit, pvGlassDepthShadow, pvCardRimBloom } from '@/theme';

export type PVGlassCardProps = {
  children: React.ReactNode;
  padding?: number;
  style?: StyleProp<ViewStyle>;
  contentStyle?: StyleProp<ViewStyle>;
  testID?: string;
};

/** Standard glass card — volumetric gradient, specular + floor vignette, electric rim bloom. */
export function PVGlassCard({ children, padding = pvKit.card.padding, style, contentStyle, testID }: PVGlassCardProps) {
  const r = pvKit.card.radius;
  return (
    <View style={[styles.outer, pvGlassDepthShadow(), pvCardRimBloom(), style]} testID={testID}>
      <LinearGradient
        colors={[pvKit.card.fillTop, pvKit.card.fillMid, pvKit.card.fillBottom]}
        locations={[0, 0.48, 1]}
        start={{ x: 0.5, y: 0 }}
        end={{ x: 0.5, y: 1 }}
        style={[styles.gradient, { borderRadius: r }]}
      >
        <LinearGradient
          colors={[pvKit.card.specular, 'transparent']}
          start={{ x: 0.5, y: 0 }}
          end={{ x: 0.5, y: 0.55 }}
          style={[styles.specular, { borderTopLeftRadius: r, borderTopRightRadius: r }]}
          pointerEvents="none"
        />
        <LinearGradient
          colors={[...pvKit.cards.bottomVignette]}
          start={{ x: 0.5, y: 0.55 }}
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
    borderRadius: pvKit.card.radius,
    borderWidth: 1,
    borderColor: pvKit.card.border,
    overflow: 'hidden',
    backgroundColor: colors.dark.card,
  },
  gradient: { overflow: 'hidden' },
  specular: {
    position: 'absolute',
    left: 0,
    right: 0,
    top: 0,
    height: '52%',
  },
  vignette: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    height: '48%',
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
