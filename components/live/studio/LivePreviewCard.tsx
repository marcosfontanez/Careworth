import React, { useEffect, useRef } from 'react';
import { Animated, StyleSheet, Text, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { BrbPreview } from '@/components/live/studio/BrbPreview';
import { LiveHeroPlaceholder } from '@/components/live/LiveHeroPlaceholder';
import { LiveSceneOverlay } from '@/components/live/LiveSceneOverlay';
import { colors, borderRadius, typography } from '@/theme';
import { liveStudioTheme } from '@/lib/live/studio/liveStudioTheme';
import { liveSceneLabel, sceneIsFullOverlay, type LiveSceneMode } from '@/lib/live/liveSceneMode';

export type LivePreviewMode = 'live' | 'connecting' | 'fallback';

type Props = {
  brbMode: boolean;
  sceneMode?: LiveSceneMode;
  previewMode: LivePreviewMode;
  pollQuestion?: string | null;
  onResumeBrb?: () => void;
  /** Optional embedded preview (e.g. mirrored video track). */
  children?: React.ReactNode;
};

/** Premium live preview card — real feed, branded fallback, or scene state. */
export function LivePreviewCard({
  brbMode,
  sceneMode = 'live',
  previewMode,
  pollQuestion,
  onResumeBrb,
  children,
}: Props) {
  const pulse = useRef(new Animated.Value(0.4)).current;

  useEffect(() => {
    if (previewMode !== 'live' || brbMode) return;
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(pulse, { toValue: 1, duration: 1200, useNativeDriver: true }),
        Animated.timing(pulse, { toValue: 0.4, duration: 1200, useNativeDriver: true }),
      ]),
    );
    loop.start();
    return () => loop.stop();
  }, [brbMode, previewMode, pulse]);

  const badgeLabel =
    previewMode === 'connecting'
      ? 'CONNECTING'
      : sceneMode !== 'live'
        ? liveSceneLabel(sceneMode).toUpperCase()
        : 'LIVE';
  const badgeStyle =
    sceneMode === 'brb' || brbMode
      ? styles.badgeBrb
      : previewMode === 'connecting'
        ? styles.badgeConnecting
        : sceneMode === 'ending_soon'
          ? styles.badgeEnding
          : sceneMode !== 'live'
            ? styles.badgeBrb
            : styles.badgeLive;
  const fullOverlay = sceneIsFullOverlay(sceneMode) || brbMode;
  const videoModes = sceneMode === 'live' || sceneMode === 'qna' || sceneMode === 'poll';

  return (
    <View style={styles.outer}>
      <LinearGradient
        colors={['rgba(56,189,248,0.35)', 'rgba(99,102,241,0.28)', 'rgba(56,189,248,0.2)']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.glowRing}
      />
      <View style={styles.card}>
        {fullOverlay ? (
          sceneMode === 'brb' || brbMode ? (
            <BrbPreview onResume={onResumeBrb} />
          ) : (
            <LiveSceneOverlay
              mode={sceneMode}
              compact
              onResume={onResumeBrb}
              pollQuestion={pollQuestion}
            />
          )
        ) : videoModes && children ? (
          <View style={styles.fill}>
            {children}
            {sceneMode !== 'live' ? (
              <LiveSceneOverlay
                mode={sceneMode}
                compact
                pollQuestion={pollQuestion}
              />
            ) : null}
          </View>
        ) : children ? (
          children
        ) : previewMode === 'live' ? (
          <View style={styles.fill}>
            <LiveHeroPlaceholder label="BROADCASTING" />
            <View style={styles.liveOverlay}>
              <Animated.View style={[styles.livePulse, { opacity: pulse }]} />
              <Ionicons name="videocam" size={22} color={colors.primary.teal} />
              <Text style={styles.liveOverlayTxt}>Camera live behind studio</Text>
            </View>
          </View>
        ) : previewMode === 'connecting' ? (
          <View style={styles.fill}>
            <LinearGradient
              colors={['#060E1A', '#0C1628', '#101E38']}
              style={StyleSheet.absoluteFill}
            />
            <View style={styles.connectingCore}>
              <Ionicons name="sync-outline" size={28} color={colors.primary.teal} />
              <Text style={styles.connectingTitle}>Connecting broadcast</Text>
              <Text style={styles.connectingMeta}>Setting up LiveKit room…</Text>
            </View>
          </View>
        ) : (
          <View style={styles.fill}>
            <LiveHeroPlaceholder label="LIVE PREVIEW" />
          </View>
        )}

        <View style={[styles.badge, badgeStyle]}>
          {!brbMode && previewMode !== 'connecting' ? <View style={styles.badgeDot} /> : null}
          <Text style={styles.badgeTxt}>{badgeLabel}</Text>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  outer: {
    marginBottom: 12,
    borderRadius: liveStudioTheme.previewRadius + 2,
    padding: 1,
  },
  glowRing: {
    ...StyleSheet.absoluteFillObject,
    borderRadius: liveStudioTheme.previewRadius + 2,
    opacity: 0.85,
  },
  card: {
    height: liveStudioTheme.previewHeight,
    borderRadius: liveStudioTheme.previewRadius,
    overflow: 'hidden',
    backgroundColor: '#020617',
    borderWidth: 1,
    borderColor: liveStudioTheme.panelBorder,
  },
  fill: { flex: 1 },
  liveOverlay: {
    ...StyleSheet.absoluteFillObject,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: 'rgba(6,14,26,0.42)',
  },
  livePulse: {
    position: 'absolute',
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: 'rgba(56,189,248,0.12)',
    borderWidth: 1,
    borderColor: 'rgba(139,92,246,0.22)',
  },
  liveOverlayTxt: {
    ...typography.caption,
    fontSize: 11,
    fontWeight: '700',
    color: 'rgba(248,250,252,0.78)',
    textAlign: 'center',
    paddingHorizontal: 24,
  },
  connectingCore: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingHorizontal: 20,
  },
  connectingTitle: {
    ...typography.h3,
    fontSize: 15,
    fontWeight: '800',
    color: colors.neutral.white,
  },
  connectingMeta: {
    ...typography.caption,
    color: colors.dark.textMuted,
    textAlign: 'center',
  },
  badge: {
    position: 'absolute',
    top: 10,
    left: 10,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 9,
    paddingVertical: 5,
    borderRadius: borderRadius.sm,
  },
  badgeLive: { backgroundColor: colors.status.error },
  badgeBrb: { backgroundColor: 'rgba(109,40,217,0.92)' },
  badgeEnding: { backgroundColor: 'rgba(220,38,38,0.88)' },
  badgeConnecting: { backgroundColor: 'rgba(234,88,12,0.92)' },
  badgeDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: '#FFF' },
  badgeTxt: { fontSize: 10, fontWeight: '900', color: '#FFF', letterSpacing: 0.6 },
});
