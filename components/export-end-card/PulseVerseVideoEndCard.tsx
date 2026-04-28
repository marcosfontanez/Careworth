import React, { useEffect, useMemo } from 'react';
import { View, Text, StyleSheet, Platform } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { VideoView, useVideoPlayer } from 'expo-video';
import { useEventListener } from 'expo';
import { PULSEVERSE_ENDCARD_VIDEO } from '@/assets/video/endCardVideo';
import type { ExportEndCardData } from '@/types/exportEndCard';
import { exportEndCardTokens } from '@/theme/exportEndCard';
import { getEndCardCreatorLines } from './attribution';

export type PulseVerseVideoEndCardProps = {
  data: ExportEndCardData;
  width: number;
  height: number;
  /** When false, video stays paused (e.g. thumbnail capture). */
  playing?: boolean;
};

/**
 * Branded outro using the bundled master clip (video + audio).
 * TikTok-style stack: @handle (dominant), real name, then role line.
 *
 * For file export, concatenate this asset after the main clip; see `videoExportPipeline.ts`.
 */
export function PulseVerseVideoEndCard({
  data,
  width,
  height,
  playing = true,
}: PulseVerseVideoEndCardProps) {
  const { primary, secondary } = getEndCardCreatorLines(data);
  const display = data.creatorDisplayName?.trim();
  const showNameUnderHandle = Boolean(display && primary.startsWith('@') && display !== primary);

  const source = useMemo(() => PULSEVERSE_ENDCARD_VIDEO, []);

  const player = useVideoPlayer(source, (p: any) => {
    p.loop = true;
    p.muted = false;
  });

  useEventListener(player, 'statusChange', ({ status }) => {
    if (status === 'readyToPlay' && playing) {
      try {
        player.play();
      } catch {
        /* noop */
      }
    }
  });

  useEffect(() => {
    if (!player) return;
    try {
      if (playing) {
        player.play();
      } else {
        player.pause();
      }
    } catch {
      /* noop */
    }
  }, [player, playing]);

  return (
    <View style={{ width, height }} accessibilityLabel="PulseVerse video end card">
      <VideoView
        player={player}
        style={StyleSheet.absoluteFillObject}
        contentFit="cover"
        nativeControls={false}
        {...(Platform.OS === 'android' ? { surfaceType: 'textureView' as const } : {})}
      />

      <LinearGradient
        colors={['transparent', 'rgba(6,14,26,0.5)', 'rgba(11,31,58,0.92)']}
        locations={[0, 0.45, 1]}
        style={styles.bottomScrim}
        pointerEvents="none"
        accessible={false}
        importantForAccessibility="no-hide-descendants"
      />

      <View
        style={[styles.tiktokStack, { paddingBottom: height * 0.06 }]}
        pointerEvents="none"
        accessible={false}
        importantForAccessibility="no-hide-descendants"
      >
        <Text style={styles.handleLine} numberOfLines={1}>
          {primary}
        </Text>
        {showNameUnderHandle && display ? (
          <Text style={styles.nameLine} numberOfLines={1}>
            {display}
          </Text>
        ) : null}
        {secondary ? (
          <Text style={styles.metaLine} numberOfLines={2}>
            {secondary}
          </Text>
        ) : null}
        <Text style={styles.brandEcho}>PulseVerse</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  bottomScrim: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'flex-end',
  },
  tiktokStack: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    paddingHorizontal: 18,
    gap: 4,
  },
  handleLine: {
    fontSize: 22,
    fontWeight: '800',
    letterSpacing: -0.5,
    color: exportEndCardTokens.brand.white,
    textShadowColor: 'rgba(0,0,0,0.55)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 10,
  },
  nameLine: {
    fontSize: 15,
    fontWeight: '600',
    color: 'rgba(244,247,251,0.92)',
    textShadowColor: 'rgba(0,0,0,0.45)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 8,
  },
  metaLine: {
    fontSize: 13,
    fontWeight: '500',
    color: 'rgba(244,247,251,0.65)',
    textShadowColor: 'rgba(0,0,0,0.4)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 6,
  },
  brandEcho: {
    marginTop: 8,
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 1,
    textTransform: 'uppercase',
    color: exportEndCardTokens.brand.teal,
    opacity: 0.9,
    textShadowColor: 'rgba(0,0,0,0.35)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 4,
  },
});
