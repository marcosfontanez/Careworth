import React, { useEffect, useRef } from 'react';
import { Animated, Dimensions, StyleSheet, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { borderRadius, colors, layout, spacing } from '@/theme';

const CARD_W = Dimensions.get('window').width - layout.screenPadding * 2;
const HERO_H = 448;

function Shimmer({ style }: { style?: object }) {
  const op = useRef(new Animated.Value(0.32)).current;
  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(op, { toValue: 0.55, duration: 850, useNativeDriver: true }),
        Animated.timing(op, { toValue: 0.32, duration: 850, useNativeDriver: true }),
      ]),
    );
    loop.start();
    return () => loop.stop();
  }, [op]);
  return <Animated.View style={[styles.shimmer, style, { opacity: op }]} />;
}

/** Premium skeleton for the Happening Now hero carousel. */
export function HappeningNowHeroSkeleton() {
  return (
    <View style={styles.wrap}>
      <LinearGradient
        colors={['rgba(56,189,248,0.08)', 'rgba(236,72,153,0.06)', 'rgba(12,18,32,0.9)']}
        style={styles.card}
      >
        <Shimmer style={styles.pill} />
        <View style={styles.bottom}>
          <Shimmer style={styles.chip} />
          <Shimmer style={styles.title} />
          <Shimmer style={styles.line} />
          <View style={styles.row}>
            <Shimmer style={styles.avatar} />
            <View style={styles.meta}>
              <Shimmer style={styles.name} />
              <Shimmer style={styles.sub} />
            </View>
          </View>
          <Shimmer style={styles.cta} />
        </View>
      </LinearGradient>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    paddingHorizontal: layout.screenPadding,
    minHeight: HERO_H + spacing.md,
  },
  card: {
    width: CARD_W,
    height: HERO_H,
    alignSelf: 'center',
    borderRadius: borderRadius['3xl'] - 4,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(56,189,248,0.18)',
    backgroundColor: colors.dark.cardAlt,
  },
  shimmer: {
    backgroundColor: 'rgba(248,250,252,0.12)',
    borderRadius: borderRadius.sm,
  },
  pill: {
    position: 'absolute',
    top: spacing.md,
    left: spacing.md,
    width: 56,
    height: 22,
    borderRadius: borderRadius.sm,
  },
  bottom: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    padding: spacing.lg,
    gap: spacing.sm,
  },
  chip: { width: 88, height: 20, borderRadius: borderRadius.sm },
  title: { width: '78%', height: 26, borderRadius: 8, marginTop: 4 },
  line: { width: '62%', height: 14, borderRadius: 6 },
  row: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, marginTop: spacing.sm },
  avatar: { width: 40, height: 40, borderRadius: 20 },
  meta: { flex: 1, gap: 6 },
  name: { width: '55%', height: 14, borderRadius: 6 },
  sub: { width: '40%', height: 12, borderRadius: 6 },
  cta: { width: 120, height: 38, borderRadius: borderRadius.full, marginTop: spacing.sm },
});
