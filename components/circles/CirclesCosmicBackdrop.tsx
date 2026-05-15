import React from 'react';
import { StyleSheet, View, useWindowDimensions } from 'react-native';
import Svg, { Defs, Ellipse, RadialGradient, Stop } from 'react-native-svg';
import { pvKit } from '@/theme';

const HEIGHT = 168;

/**
 * Subtle “orbital” chrome behind the Circles header — low-contrast rings + faint bloom.
 * Keeps glow restrained; cards remain the focal layer.
 */
export function CirclesCosmicBackdrop() {
  const { width: w } = useWindowDimensions();
  const cx = w / 2;
  const cy = HEIGHT * 0.34;

  return (
    <View style={styles.wrap} pointerEvents="none" accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
      <Svg width={w} height={HEIGHT} style={StyleSheet.absoluteFill}>
        <Defs>
          <RadialGradient id="circBloom" cx="50%" cy="32%" r="58%" fx="50%" fy="32%">
            <Stop offset="0%" stopColor="rgba(34,211,238,0.07)" stopOpacity={1} />
            <Stop offset="55%" stopColor="rgba(15,23,42,0)" stopOpacity={0} />
            <Stop offset="100%" stopColor="rgba(15,23,42,0)" stopOpacity={0} />
          </RadialGradient>
        </Defs>
        <Ellipse cx={cx} cy={cy} rx={w * 0.48} ry={HEIGHT * 0.4} fill="url(#circBloom)" />
        <Ellipse
          cx={cx}
          cy={cy}
          rx={w * 0.42}
          ry={HEIGHT * 0.36}
          stroke={pvKit.circles.cosmicRing}
          strokeWidth={1.25}
          fill="none"
        />
        <Ellipse
          cx={cx}
          cy={cy * 0.92}
          rx={w * 0.5}
          ry={HEIGHT * 0.44}
          stroke={pvKit.circles.cosmicRingMid}
          strokeWidth={1}
          fill="none"
        />
        <Ellipse
          cx={cx}
          cy={cy * 1.05}
          rx={w * 0.58}
          ry={HEIGHT * 0.5}
          stroke={pvKit.circles.cosmicRingOuter}
          strokeWidth={0.85}
          fill="none"
        />
      </Svg>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: HEIGHT,
    zIndex: 0,
  },
});
