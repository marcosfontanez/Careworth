import React, { useEffect } from 'react';
import { StyleSheet, Text, View, Image } from 'react-native';
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';
import { exportEndCardTokens } from '@/theme/exportEndCard';
import type { EndCardTheme } from '@/types/exportEndCard';

const LOGO = require('../../assets/images/pulseverse-logo.png');

type Props = {
  theme: EndCardTheme;
  animationEnabled: boolean;
  /** centered | left aligned (split layout) */
  align: 'center' | 'left';
  compact?: boolean;
};

export function EndCardBrandBlock({ theme, animationEnabled, align, compact }: Props) {
  const logoOpacity = useSharedValue(animationEnabled ? 0 : 1);
  const logoScale = useSharedValue(
    animationEnabled ? exportEndCardTokens.timing.logoScaleFrom : 1
  );

  useEffect(() => {
    if (!animationEnabled) {
      logoOpacity.value = 1;
      logoScale.value = 1;
      return;
    }
    logoOpacity.value = withTiming(1, {
      duration: exportEndCardTokens.timing.logoFadeMs,
      easing: Easing.out(Easing.cubic),
    });
    logoScale.value = withTiming(1, {
      duration: exportEndCardTokens.timing.logoFadeMs,
      easing: Easing.out(Easing.cubic),
    });
  }, [animationEnabled, logoOpacity, logoScale]);

  const logoAnim = useAnimatedStyle(() => ({
    opacity: logoOpacity.value,
    transform: [{ scale: logoScale.value }],
  }));

  const markSize = compact ? 36 : exportEndCardTokens.layout.logoMarkSize;

  return (
    <View style={[styles.block, align === 'center' ? styles.blockCenter : styles.blockLeft]}>
      <Animated.View style={logoAnim}>
        <Image source={LOGO} style={{ width: markSize, height: markSize }} resizeMode="contain" />
      </Animated.View>
      <View style={[styles.wordmarkRow, align === 'left' ? styles.wordmarkLeft : null]}>
        <Text style={[styles.wordPulse, { color: theme.textPrimary }]}>Pulse</Text>
        <Text style={[styles.wordVerse, { color: theme.accentLine }]}>Verse</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  block: {
    alignItems: 'center',
    gap: 10,
  },
  blockCenter: {
    alignItems: 'center',
  },
  blockLeft: {
    alignItems: 'flex-start',
  },
  wordmarkRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: 0,
  },
  wordmarkLeft: {
    marginTop: 2,
  },
  wordPulse: {
    fontSize: 22,
    fontWeight: '800',
    letterSpacing: -0.6,
  },
  wordVerse: {
    fontSize: 22,
    fontWeight: '800',
    letterSpacing: -0.6,
  },
});
