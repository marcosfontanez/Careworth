import React, { useEffect } from 'react';
import { StyleSheet, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';
import {
  type ExportEndCardData,
  type ExportEndCardAnimationPreset,
  type ExportEndCardLayoutVariant,
  type EndCardTheme,
  resolveEndCardTheme,
} from '@/types/exportEndCard';
import { exportEndCardTokens } from '@/theme/exportEndCard';
import { EndCardBackgroundMotionLayer } from './EndCardBackgroundMotionLayer';
import { EndCardBrandBlock } from './EndCardBrandBlock';
import { EndCardCreatorAttribution } from './EndCardCreatorAttribution';

/**
 * PulseVerse Export End Card — branded ~1–1.5s outro for downloads / external shares.
 *
 * Layout choice: **centered** (primary) — best legibility on 9:16 phone exports and reshares.
 * Alternates: `split` (editorial), `minimal` (creator-forward).
 *
 * TODO:audio-sting — Pair this visual with a 0.5–1.2s sting when the export pipeline muxes audio:
 * - Fire at t=0 of this slate; duck main video audio tail if needed.
 * - Prefer loading from bundled asset; see `theme/exportEndCard.ts` for loudness + creative notes.
 * - In-app-only preview: optional `expo-audio` `createAudioPlayer` gated behind a prop — not wired yet.
 */
export type PulseVerseEndCardProps = {
  data: ExportEndCardData;
  /** Physical size in px (export target e.g. 1080×1920, or scaled preview) */
  width: number;
  height: number;
  layoutVariant?: ExportEndCardLayoutVariant;
  theme?: Partial<EndCardTheme>;
  /** Overrides `data.animationPreset` when set */
  animationPreset?: ExportEndCardAnimationPreset;
};

function EndCardTagline({
  theme,
  visible,
  animationEnabled,
  textAlign = 'center',
}: {
  theme: EndCardTheme;
  visible: boolean;
  animationEnabled: boolean;
  textAlign?: 'center' | 'left';
}) {
  const opacity = useSharedValue(!visible ? 0 : animationEnabled ? 0 : 1);

  useEffect(() => {
    if (!visible) {
      opacity.value = 0;
      return;
    }
    if (!animationEnabled) {
      opacity.value = 1;
      return;
    }
    const t = setTimeout(() => {
      opacity.value = withTiming(1, {
        duration: exportEndCardTokens.timing.taglineFadeMs,
        easing: Easing.out(Easing.cubic),
      });
    }, exportEndCardTokens.timing.taglineDelayMs);
    return () => clearTimeout(t);
  }, [visible, animationEnabled, opacity]);

  const style = useAnimatedStyle(() => ({ opacity: opacity.value }));

  if (!visible) return null;

  return (
    <Animated.Text style={[styles.tagline, { color: theme.textTertiary, textAlign }, style]}>
      Built for healthcare life.
    </Animated.Text>
  );
}

export function PulseVerseEndCard({
  data,
  width,
  height,
  layoutVariant = 'centered',
  theme: themePartial,
  animationPreset: animationPresetProp,
}: PulseVerseEndCardProps) {
  const theme = resolveEndCardTheme(data.backgroundStyle, themePartial);
  const preset: ExportEndCardAnimationPreset =
    animationPresetProp ?? data.animationPreset ?? theme.animationPreset;
  const animationEnabled = preset !== 'none';

  const gradientColors = [...theme.backgroundGradient] as [string, string, string];

  return (
    <View style={{ width, height }} accessibilityLabel="PulseVerse export end card">
      <LinearGradient colors={gradientColors} style={StyleSheet.absoluteFill} />
      <EndCardBackgroundMotionLayer
        width={width}
        height={height}
        theme={theme}
        animationEnabled={animationEnabled}
      />

      {layoutVariant === 'centered' ? (
        <View style={styles.centerShell}>
          <View style={[styles.centerContent, { maxWidth: width * exportEndCardTokens.layout.maxContentWidthRatio }]}>
            <EndCardBrandBlock theme={theme} animationEnabled={animationEnabled} align="center" />
            <View style={{ height: 20 }} />
            <EndCardCreatorAttribution
              data={data}
              theme={theme}
              animationEnabled={animationEnabled}
              align="center"
              showAvatar={Boolean(data.avatarUrl)}
            />
            <View style={{ height: 14 }} />
            <EndCardTagline
              theme={theme}
              visible={Boolean(data.useTagline)}
              animationEnabled={animationEnabled}
            />
          </View>
        </View>
      ) : null}

      {layoutVariant === 'split' ? (
        <View style={[styles.splitShell, { paddingHorizontal: width * 0.07 }]}>
          <View style={styles.splitLeft}>
            <EndCardBrandBlock theme={theme} animationEnabled={animationEnabled} align="left" compact />
            <View style={{ marginTop: 10 }}>
              <EndCardTagline
                theme={theme}
                visible={Boolean(data.useTagline)}
                animationEnabled={animationEnabled}
                textAlign="left"
              />
            </View>
          </View>
          <View style={styles.splitRight}>
            <EndCardCreatorAttribution
              data={data}
              theme={theme}
              animationEnabled={animationEnabled}
              align="right"
              showAvatar={false}
            />
          </View>
        </View>
      ) : null}

      {layoutVariant === 'minimal' ? (
        <View style={[styles.minimalShell, { paddingHorizontal: width * 0.08 }]}>
          <EndCardBrandBlock theme={theme} animationEnabled={animationEnabled} align="left" compact />
          <View style={{ flex: 1, paddingLeft: 14, justifyContent: 'center' }}>
            <EndCardCreatorAttribution
              data={data}
              theme={theme}
              animationEnabled={animationEnabled}
              align="left"
              emphasizePrimary
              showAvatar={Boolean(data.avatarUrl)}
            />
          </View>
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  centerShell: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 20,
  },
  centerContent: {
    alignItems: 'center',
  },
  splitShell: {
    ...StyleSheet.absoluteFillObject,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  splitLeft: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'flex-start',
    paddingRight: 8,
  },
  splitRight: {
    flex: 1,
    alignItems: 'flex-end',
    justifyContent: 'center',
  },
  minimalShell: {
    ...StyleSheet.absoluteFillObject,
    flexDirection: 'row',
    alignItems: 'center',
  },
  tagline: {
    fontSize: 11,
    fontWeight: '600',
    letterSpacing: 0.4,
    textTransform: 'uppercase',
    textAlign: 'center',
  },
});
