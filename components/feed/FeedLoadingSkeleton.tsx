import React, { useEffect, useRef } from 'react';
import { Animated, Easing, Platform, StyleSheet, View, useWindowDimensions } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors } from '@/theme';

const VIDEO_BG = colors.media.videoCanvas;

/** First paint while `useFeedInfinite` is pending — matches feed chrome + full-bleed video canvas. */
export function FeedLoadingSkeleton() {
  const insets = useSafeAreaInsets();
  const { height: windowH } = useWindowDimensions();
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
      <View style={[styles.chrome, { paddingTop: insets.top + 6 }]}>
        <View style={styles.chromeSide} />
        <View style={styles.tabRow}>
          {[52, 44, 60].map((w, i) => (
            <View key={i} style={styles.tabSlot}>
              <Animated.View style={[styles.tabPill, { opacity: pulse, width: w }]} />
            </View>
          ))}
        </View>
        <View style={styles.chromeSide} />
      </View>

      <View style={styles.mockRail}>
        <Animated.View style={[styles.railDot, { opacity: pulse }]} />
        <Animated.View style={[styles.railDot, { opacity: pulse }]} />
        <Animated.View style={[styles.railDot, { opacity: pulse }]} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: VIDEO_BG,
  },
  chrome: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    zIndex: 30,
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'space-between',
    paddingHorizontal: 8,
    paddingBottom: 8,
    backgroundColor: colors.feed.chromeScrim,
  },
  chromeSide: { width: 44 },
  tabRow: {
    flex: 1,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'flex-end',
    gap: 14,
    maxHeight: 44,
    paddingHorizontal: 8,
  },
  tabSlot: {
    alignItems: 'center',
    minWidth: 56,
  },
  tabPill: {
    height: 10,
    borderRadius: 5,
    backgroundColor: colors.onVideo.mutedStrong,
  },
  mockRail: {
    position: 'absolute',
    right: 10,
    bottom: '18%',
    gap: 18,
    alignItems: 'center',
    zIndex: 10,
  },
  railDot: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: colors.onVideo.mutedStrong,
  },
});
