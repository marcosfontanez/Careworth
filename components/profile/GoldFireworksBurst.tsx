import React, { useEffect, useMemo, useRef } from 'react';
import { Animated, Platform, StyleSheet, View } from 'react-native';

const USE_NATIVE = Platform.OS !== 'web';

export type PrizeFireworksTier = 'gold' | 'silver' | 'bronze';

const DEFAULT_GOLD = ['#FFF566', '#FFE135', '#FFFACD', '#FFD700', '#FFECB3', '#FFFFFF', '#FF9100'];
const DEFAULT_SILVER = ['#F1F5F9', '#E2E8F0', '#CBD5E1', '#94A3B8', '#FFFFFF'];
const DEFAULT_BRONZE = ['#FDBA74', '#FB923C', '#EA580C', '#FDE68A', '#FFF7ED'];

type SparkSpec = {
  angle: number;
  distance: number;
  delayMs: number;
  duration: number;
  size: number;
  gapMs: number;
  color: string;
  originX: number;
  originY: number;
  shadowColor: string;
};

function tierPalette(tier: PrizeFireworksTier, custom?: string[]): string[] {
  if (custom?.length) return custom;
  if (tier === 'silver') return DEFAULT_SILVER;
  if (tier === 'bronze') return DEFAULT_BRONZE;
  return DEFAULT_GOLD;
}

function sparkCountForTier(tier: PrizeFireworksTier, ringDiameter: number): number {
  const base = ringDiameter >= 72 ? 22 : ringDiameter >= 48 ? 18 : 14;
  if (tier === 'gold') return Math.min(72, Math.round(base * 2.75));
  if (tier === 'silver') return Math.min(26, Math.round(base * 0.58));
  return Math.min(20, Math.round(base * 0.45));
}

function buildSpecs(tier: PrizeFireworksTier, ringDiameter: number, colors: string[]): SparkSpec[] {
  const count = sparkCountForTier(tier, ringDiameter);
  const cx = ringDiameter / 2;
  const specs: SparkSpec[] = [];
  const distScale = tier === 'gold' ? 1.12 : tier === 'silver' ? 0.82 : 0.76;
  const durBase = tier === 'gold' ? 520 : tier === 'silver' ? 440 : 420;
  const gapScale = tier === 'gold' ? 0.42 : 0.72;

  for (let i = 0; i < count; i++) {
    let ox = cx;
    let oy = Math.max(4, ringDiameter * 0.08);
    let a0 = 0.34 * Math.PI;
    let a1 = 0.8 * Math.PI;

    if (tier === 'gold') {
      const zone = Math.random();
      if (zone < 0.48) {
        oy = Math.max(4, ringDiameter * 0.05);
        a0 = 0.07 * Math.PI;
        a1 = 0.98 * Math.PI;
      } else if (zone < 0.7) {
        ox = cx * (0.78 + Math.random() * 0.1);
        oy = ringDiameter * (0.3 + Math.random() * 0.14);
        a0 = 0.22 * Math.PI;
        a1 = 1.06 * Math.PI;
      } else if (zone < 0.86) {
        ox = cx * (1.04 + Math.random() * 0.12);
        oy = ringDiameter * (0.3 + Math.random() * 0.14);
        a0 = 0.32 * Math.PI;
        a1 = 1.1 * Math.PI;
      } else {
        oy = ringDiameter * 0.86;
        a0 = 0.86 * Math.PI;
        a1 = 1.48 * Math.PI;
      }
    }

    const angle = a0 + Math.random() * Math.max(0.05 * Math.PI, a1 - a0);
    const distance = ringDiameter * distScale * (0.36 + Math.random() * 0.74);
    const color = colors[i % colors.length]!;
    specs.push({
      angle,
      distance,
      delayMs: Math.random() * (tier === 'gold' ? 960 : 500) + i * (tier === 'gold' ? 16 : 32),
      duration: durBase + Math.round(Math.random() * (tier === 'gold' ? 360 : 200)),
      size: (tier === 'gold' ? 2.2 : 1.7) + Math.random() * (tier === 'gold' ? 3.4 : 2.4),
      gapMs: Math.round((110 + Math.random() * 400) * gapScale),
      color,
      originX: ox,
      originY: oy,
      shadowColor: tier === 'gold' ? '#FFEA00' : tier === 'silver' ? '#CBD5E1' : '#FDBA74',
    });
  }
  return specs;
}

function Spark({ spec }: { spec: SparkSpec }) {
  const progress = useRef(new Animated.Value(0)).current;
  const { angle, distance, delayMs, duration, gapMs, size, color, originX, originY, shadowColor } = spec;
  const dx = Math.cos(angle) * distance;
  const dy = -Math.sin(angle) * distance;

  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.delay(delayMs),
        Animated.timing(progress, {
          toValue: 1,
          duration,
          useNativeDriver: USE_NATIVE,
        }),
        Animated.timing(progress, { toValue: 0, duration: 0, useNativeDriver: USE_NATIVE }),
        Animated.delay(gapMs),
      ]),
    );
    loop.start();
    return () => {
      loop.stop();
      progress.setValue(0);
    };
  }, [progress, delayMs, duration, gapMs]);

  const translateX = progress.interpolate({ inputRange: [0, 1], outputRange: [0, dx] });
  const translateY = progress.interpolate({ inputRange: [0, 1], outputRange: [0, dy] });
  const opacity = progress.interpolate({
    inputRange: [0, 0.08, 0.35, 0.72, 1],
    outputRange: [0, 1, 0.95, 0.45, 0],
  });
  const scale = progress.interpolate({
    inputRange: [0, 0.2, 1],
    outputRange: [0.35, 1.05, 0.55],
  });

  return (
    <Animated.View
      style={[
        styles.spark,
        {
          left: originX - size / 2,
          top: originY - size / 2,
          width: size,
          height: size,
          borderRadius: size / 2,
          backgroundColor: color,
          shadowColor,
          opacity,
          transform: [{ translateX }, { translateY }, { scale }],
        },
      ]}
    />
  );
}

type Props = {
  /** Full diameter of the bordered avatar ring (px). */
  ringDiameter: number;
  active?: boolean;
  /** Accent list; defaults by tier */
  sparkColors?: string[];
  tier?: PrizeFireworksTier;
  /** Stacking order; default 6 (above avatar). Use lower values to sit under a raster ring overlay. */
  layerZIndex?: number;
};

/**
 * Looping prize-tier fireworks — heavy celebration for gold, lighter for silver/bronze.
 */
export function GoldFireworksBurst({
  ringDiameter,
  active = true,
  sparkColors,
  tier = 'gold',
  layerZIndex = 6,
}: Props) {
  const colors = tierPalette(tier, sparkColors);

  const specs = useMemo(
    () => buildSpecs(tier, ringDiameter, colors),
    [tier, ringDiameter, colors],
  );

  if (!active || ringDiameter < 24) return null;

  return (
    <View
      pointerEvents="none"
      style={[
        styles.layer,
        {
          width: ringDiameter,
          height: ringDiameter,
          marginTop: -ringDiameter * 0.04,
          zIndex: layerZIndex,
        },
      ]}
    >
      {specs.map((s, i) => (
        <Spark key={i} spec={s} />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  layer: {
    position: 'absolute',
    left: 0,
    top: 0,
    overflow: 'visible',
  },
  spark: {
    position: 'absolute',
    shadowOpacity: 0.88,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 0 },
  },
});
