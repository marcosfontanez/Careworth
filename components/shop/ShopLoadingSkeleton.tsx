import React, { useEffect, useRef } from 'react';
import { Animated, Dimensions, StyleSheet, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { colors, borderRadius, layout } from '@/theme';

const { width: W } = Dimensions.get('window');
const H_PAD = layout.screenPadding;
const FEATURED_H = 168;
const CARD_W = Math.min(154, Math.max(132, (W - H_PAD * 2 - 40) / 2.4));

function ShimmerBlock({ style, children }: { style?: object; children?: React.ReactNode }) {
  const op = useRef(new Animated.Value(0.35)).current;
  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(op, { toValue: 0.58, duration: 900, useNativeDriver: true }),
        Animated.timing(op, { toValue: 0.35, duration: 900, useNativeDriver: true }),
      ]),
    );
    loop.start();
    return () => loop.stop();
  }, [op]);
  return (
    <Animated.View style={[style, { opacity: op }]}>
      {children ?? <View style={StyleSheet.absoluteFillObject} />}
    </Animated.View>
  );
}

/** Premium placeholder while shop catalog loads — keeps layout stable. */
export function ShopCatalogSkeleton() {
  return (
    <View style={styles.root}>
      <LinearGradient
        colors={['rgba(212,166,58,0.15)', 'rgba(99,102,241,0.06)', 'transparent']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.featuredShell}
      >
        <ShimmerBlock style={styles.featuredInner}>
          <View style={styles.featuredShimA} />
          <View style={styles.featuredShimB} />
          <View style={styles.featuredShimC} />
        </ShimmerBlock>
      </LinearGradient>

      <View style={styles.sectionLabelRow}>
        <ShimmerBlock style={styles.sectionPill} />
      </View>

      <View style={styles.strip}>
        {[0, 1, 2].map((i) => (
          <ShimmerBlock key={i} style={[styles.browseShim, { width: CARD_W }]}>
            <View style={styles.ringShim} />
            <View style={styles.lineShim} />
            <View style={styles.lineShimShort} />
          </ShimmerBlock>
        ))}
      </View>

      <View style={styles.footerRow}>
        <ShimmerBlock style={styles.footerShim} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { paddingBottom: 20, gap: 18 },
  featuredShell: {
    borderRadius: borderRadius.xl + 2,
    padding: 2,
    overflow: 'hidden',
  },
  featuredInner: {
    borderRadius: borderRadius.xl,
    backgroundColor: 'rgba(255,255,255,0.06)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.06)',
    padding: 16,
    minHeight: FEATURED_H,
    gap: 12,
  },
  featuredShimA: {
    height: 12,
    width: '45%',
    borderRadius: 6,
    backgroundColor: colors.dark.cardAlt,
  },
  featuredShimB: {
    height: 22,
    width: '70%',
    borderRadius: 8,
    backgroundColor: colors.dark.cardAlt,
  },
  featuredShimC: {
    height: 40,
    width: '100%',
    borderRadius: 8,
    backgroundColor: colors.dark.cardAlt,
  },
  sectionLabelRow: { paddingVertical: 2 },
  sectionPill: {
    height: 16,
    width: 120,
    borderRadius: 8,
    backgroundColor: 'rgba(255,255,255,0.06)',
  },
  strip: { flexDirection: 'row', gap: 10, paddingBottom: 6 },
  browseShim: {
    borderRadius: borderRadius.lg,
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.06)',
    padding: 12,
    alignItems: 'center',
  },
  ringShim: {
    width: 68,
    height: 68,
    borderRadius: 34,
    backgroundColor: colors.dark.cardAlt,
    borderWidth: 2,
    borderColor: 'rgba(255,255,255,0.08)',
  },
  lineShim: {
    marginTop: 10,
    height: 10,
    width: '80%',
    borderRadius: 4,
    backgroundColor: colors.dark.cardAlt,
  },
  lineShimShort: {
    marginTop: 8,
    height: 8,
    width: '50%',
    borderRadius: 4,
    backgroundColor: colors.dark.cardAlt,
  },
  footerRow: {},
  footerShim: {
    height: 52,
    borderRadius: borderRadius.lg,
    backgroundColor: 'rgba(56,189,248,0.06)',
    borderWidth: 1,
    borderColor: 'rgba(56,189,248,0.12)',
  },
});
