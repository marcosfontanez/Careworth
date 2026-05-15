import React, { useCallback, useState } from 'react';
import { Platform, StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import type { AnimatedBackgroundIntensity, AnimatedBackgroundVariant } from '@/components/shop/premium/AnimatedBackground';
import { AnimatedBackground } from '@/components/shop/premium/AnimatedBackground';
import { PremiumCardSparkBorder } from '@/components/shop/premium/PremiumCardSparkBorder';
import { borderRadius } from '@/theme';

type Props = {
  children: React.ReactNode;
  backgroundVariant: AnimatedBackgroundVariant;
  intensity?: AnimatedBackgroundIntensity;
  motionActive?: boolean;
  reducedMotionSupport?: boolean;
  ringColors?: readonly [string, string, ...string[]];
  ringPadding?: number;
  /** Traveling cyan/violet stroke on the outer ring (Pulse Shop hub card). */
  sparkBorder?: boolean;
  style?: StyleProp<ViewStyle>;
  contentStyle?: StyleProp<ViewStyle>;
};

/**
 * Glass stack: animated backdrop + elevated foreground slot. Keeps motion behind UI.
 */
export function PremiumAnimatedCard({
  children,
  backgroundVariant,
  intensity = 'medium',
  motionActive = true,
  reducedMotionSupport = true,
  ringColors,
  ringPadding = 1.5,
  sparkBorder = false,
  style,
  contentStyle,
}: Props) {
  const [sparkBox, setSparkBox] = useState({ w: 0, h: 0 });

  const onRingLayout = useCallback((w: number, h: number) => {
    if (w < 8 || h < 8) return;
    const rw = Math.round(w);
    const rh = Math.round(h);
    setSparkBox((prev) => (prev.w !== rw || prev.h !== rh ? { w: rw, h: rh } : prev));
  }, []);

  const inner = (
    <View style={[styles.shell, contentStyle]}>
      <AnimatedBackground
        variant={backgroundVariant}
        intensity={intensity}
        motionActive={motionActive}
        reducedMotionSupport={reducedMotionSupport}
      />
      <View style={styles.foreground}>{children}</View>
    </View>
  );

  if (ringColors?.length) {
    return (
      <View
        style={style}
        collapsable={false}
        onLayout={(e) => {
          const { width, height } = e.nativeEvent.layout;
          onRingLayout(width, height);
        }}
      >
        <LinearGradient colors={ringColors} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={[styles.ring, { padding: ringPadding }]}>
          {inner}
        </LinearGradient>
        {sparkBorder && sparkBox.w > 8 && sparkBox.h > 8 ? (
          <PremiumCardSparkBorder
            width={sparkBox.w}
            height={sparkBox.h}
            borderRadius={borderRadius['2xl'] + 3}
            motionActive={motionActive}
            reducedMotionSupport={reducedMotionSupport}
          />
        ) : null}
      </View>
    );
  }

  return <View style={[style, styles.ringPlain]}>{inner}</View>;
}

const styles = StyleSheet.create({
  ring: {
    borderRadius: borderRadius['2xl'] + 3,
    ...Platform.select({
      ios: {
        shadowColor: '#22D3EE',
        shadowOpacity: 0.22,
        shadowRadius: 14,
        shadowOffset: { width: 0, height: 4 },
      },
      android: { elevation: 8 },
      default: {},
    }),
  },
  ringPlain: {
    borderRadius: borderRadius['2xl'] + 2,
  },
  shell: {
    borderRadius: borderRadius['2xl'],
    overflow: 'hidden',
    position: 'relative',
    minHeight: 168,
  },
  foreground: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 2,
  },
});
