import React, { useEffect, useRef } from 'react';
import { Animated, Easing, Platform, StyleSheet, View, useWindowDimensions } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { FeedTopChrome } from '@/components/feed/FeedTopChrome';
import { pulseColors } from '@/lib/theme/pulseTheme';
import { useAppStore } from '@/store/useAppStore';

/** First paint while `useFeedInfinite` is pending — matches feed chrome + full-bleed video canvas. */
export function FeedLoadingSkeleton() {
  const insets = useSafeAreaInsets();
  const { height: windowH } = useWindowDimensions();
  const feedTab = useAppStore((s) => s.feedTab);
  const setFeedTab = useAppStore((s) => s.setFeedTab);
  const pulse = useRef(new Animated.Value(0.35)).current;

  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(pulse, {
          toValue: 0.65,
          duration: 700,
          easing: Easing.inOut(Easing.quad),
          useNativeDriver: true,
        }),
        Animated.timing(pulse, {
          toValue: 0.35,
          duration: 700,
          easing: Easing.inOut(Easing.quad),
          useNativeDriver: true,
        }),
      ]),
    );
    loop.start();
    return () => loop.stop();
  }, [pulse]);

  const tabBarBoost = Platform.OS === 'ios' ? 86 : 68;
  const pageH = Platform.OS === 'web' ? windowH : Math.max(320, windowH - tabBarBoost);

  return (
    <View style={[styles.root, { minHeight: pageH }]} accessibilityLabel="Loading feed">
      <FeedTopChrome
        insetTop={insets.top}
        activeTab={feedTab}
        onTabChange={setFeedTab}
        onSearch={() => {}}
      />

      <View style={styles.mockRail}>
        <Animated.View style={[styles.railDot, { opacity: pulse }]} />
        <Animated.View style={[styles.railDot, { opacity: pulse }]} />
        <Animated.View style={[styles.railDot, { opacity: pulse }]} />
        <Animated.View style={[styles.railDot, styles.railDotSm, { opacity: pulse }]} />
      </View>

      <View style={styles.mockMeta}>
        <Animated.View style={[styles.metaLine, styles.metaLineWide, { opacity: pulse }]} />
        <Animated.View style={[styles.metaLine, styles.metaLineMid, { opacity: pulse }]} />
        <Animated.View style={[styles.metaLine, styles.metaLineShort, { opacity: pulse }]} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: pulseColors.background,
  },
  mockRail: {
    position: 'absolute',
    right: 10,
    bottom: '20%',
    gap: 16,
    alignItems: 'center',
    zIndex: 10,
  },
  railDot: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: 'rgba(248, 250, 252, 0.12)',
    borderWidth: 1,
    borderColor: pulseColors.border,
  },
  railDotSm: {
    width: 34,
    height: 34,
    borderRadius: 17,
  },
  mockMeta: {
    position: 'absolute',
    left: 16,
    right: 88,
    bottom: 96,
    gap: 8,
    zIndex: 5,
  },
  metaLine: {
    height: 10,
    borderRadius: 5,
    backgroundColor: 'rgba(248, 250, 252, 0.1)',
  },
  metaLineWide: { width: '72%' },
  metaLineMid: { width: '54%' },
  metaLineShort: { width: '38%' },
});
