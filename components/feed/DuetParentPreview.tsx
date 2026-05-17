import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  View, StyleSheet, Dimensions, Text, Platform,
} from 'react-native';
import { Image } from 'expo-image';
import { VideoView, useVideoPlayer } from 'expo-video';
import { useEventListener } from 'expo';
import { usePost } from '@/hooks/useQueries';
import { colors, typography } from '@/theme';
import { pulseImageListThumbProps } from '@/lib/pulseImage';
import { trySignedUrlFromPostMediaPublicUrl } from '@/lib/storage';
import type { DuetLayoutMode } from '@/lib/duetLayoutMode';
import { resolveFeedGradeLookId } from '@/lib/moodPresets';
import { tintForLook, type VideoLookId } from '@/lib/videoFilters';

const { width: SCREEN_W } = Dimensions.get('window');
const STRIP_W = Math.round(SCREEN_W * 0.34);
const FLOAT_W = Math.round(SCREEN_W * 0.36);

export type DuetParentLayoutMode = DuetLayoutMode;

type Props = {
  parentPostId: string;
  pageHeight: number;
  layoutMode?: DuetParentLayoutMode;
  /**
   * Live parent clip (muted). When false, shows poster only — use for inactive feed cells.
   */
  enablePlayback?: boolean;
  paused?: boolean;
  isActive?: boolean;
  referenceMuted?: boolean;
  /** Match feed long-press 2× preview */
  playbackRate?: number;
};

function DuetParentVideoLayer({
  publicUri,
  posterUri,
  height,
  width,
  paused,
  active,
  muted,
  playbackRate,
  lookId,
}: {
  publicUri: string;
  posterUri?: string;
  height: number;
  width: number;
  paused: boolean;
  active: boolean;
  muted: boolean;
  playbackRate: number;
  lookId?: VideoLookId;
}) {
  const gradeTint = lookId ? tintForLook(lookId) : null;
  const [fallbackUri, setFallbackUri] = useState<string | null>(null);
  const [failed, setFailed] = useState(false);
  const sourcePhase = useRef<'public' | 'signed' | 'failed'>('public');
  const inflight = useRef(false);

  useEffect(() => {
    sourcePhase.current = 'public';
    inflight.current = false;
    setFallbackUri(null);
    setFailed(false);
  }, [publicUri]);

  const resolvedUri = fallbackUri ?? publicUri;
  const source = useMemo(
    () => ({ uri: resolvedUri, contentType: 'auto' as const }),
    [resolvedUri],
  );

  const player = useVideoPlayer(source, (p: any) => {
    p.loop = true;
    p.muted = muted;
  });

  useEventListener(player, 'statusChange', ({ status, error }) => {
    if (status === 'readyToPlay') setFailed(false);
    if (status !== 'error' || !error) return;
    if (sourcePhase.current === 'signed') {
      setFailed(true);
      return;
    }
    if (sourcePhase.current === 'failed') return;
    if (inflight.current) return;
    inflight.current = true;
    void trySignedUrlFromPostMediaPublicUrl(publicUri).then((signed) => {
      inflight.current = false;
      if (signed) {
        sourcePhase.current = 'signed';
        setFallbackUri(signed);
      } else {
        sourcePhase.current = 'failed';
        setFailed(true);
      }
    });
  });

  useEffect(() => {
    if (!player) return;
    try {
      player.playbackRate = playbackRate;
    } catch {
      /* noop */
    }
  }, [playbackRate, player]);

  useEffect(() => {
    if (!player) return;
    if (!active) {
      try {
        player.pause();
        player.muted = true;
      } catch {
        /* noop */
      }
      return;
    }
    try {
      player.muted = muted;
      if (paused) player.pause();
      else player.play();
    } catch {
      /* noop */
    }
  }, [player, active, paused, muted]);

  if (failed && posterUri) {
    return (
      <View style={{ width, height }}>
        <Image
          source={{ uri: posterUri }}
          style={StyleSheet.absoluteFillObject}
          contentFit="cover"
          {...pulseImageListThumbProps}
        />
        {gradeTint ? (
          <View
            pointerEvents="none"
            style={[StyleSheet.absoluteFillObject, { backgroundColor: gradeTint, zIndex: 2 }]}
          />
        ) : null}
      </View>
    );
  }

  if (failed) {
    return <View style={[styles.ph, { width, height }]} />;
  }

  return (
    <View style={{ width, height }}>
      <VideoView
        player={player}
        style={StyleSheet.absoluteFillObject}
        contentFit="cover"
        nativeControls={false}
        {...(Platform.OS === 'android' ? { surfaceType: 'textureView' as const } : {})}
      />
      {gradeTint ? (
        <View
          pointerEvents="none"
          style={[StyleSheet.absoluteFillObject, { backgroundColor: gradeTint, zIndex: 2 }]}
        />
      ) : null}
    </View>
  );
}

/**
 * Duet reference rail (side strip) or floating PiP — TikTok / Reels style.
 * Uses live video when `enablePlayback` and parent has `mediaUrl`; falls back to poster image.
 */
export function DuetParentPreview({
  parentPostId,
  pageHeight,
  layoutMode = 'strip',
  enablePlayback = true,
  paused = false,
  isActive = true,
  referenceMuted = true,
  playbackRate = 1,
}: Props) {
  const { data: parent } = usePost(parentPostId, { enabled: Boolean(parentPostId) });
  const videoUri = parent?.mediaUrl?.trim() ?? '';
  const posterUri = parent?.thumbnailUrl?.trim() || videoUri;
  const isVideoParent = parent?.type === 'video' && videoUri.length > 0;
  const showVideo = enablePlayback && isVideoParent;

  const floatHeight = Math.min(
    Math.round(pageHeight * 0.34),
    Math.round((FLOAT_W * 16) / 9),
  );

  const shellStyle =
    layoutMode === 'strip'
      ? [styles.strip, { width: STRIP_W, height: pageHeight }]
      : [
          styles.floating,
          {
            width: FLOAT_W,
            height: floatHeight,
            bottom: 18,
            right: 12,
          },
        ];

  const innerW = layoutMode === 'strip' ? STRIP_W : FLOAT_W;
  const innerH = layoutMode === 'strip' ? pageHeight : floatHeight;

  const parentGradeLookId = useMemo(() => {
    if (!parent) return undefined;
    return resolveFeedGradeLookId({
      videoLookId: parent.videoLookId,
      moodPreset: parent.moodPreset,
    });
  }, [parent]);

  const parentGradeTint = useMemo(
    () => (parentGradeLookId ? tintForLook(parentGradeLookId) : null),
    [parentGradeLookId],
  );

  return (
    <View style={shellStyle} pointerEvents="none">
      {showVideo ? (
        <DuetParentVideoLayer
          publicUri={videoUri}
          posterUri={posterUri}
          height={innerH}
          width={innerW}
          paused={paused}
          active={isActive}
          muted={referenceMuted}
          playbackRate={playbackRate}
          lookId={parentGradeLookId}
        />
      ) : posterUri ? (
        <View style={{ width: innerW, height: innerH }}>
          <Image
            source={{ uri: posterUri }}
            style={StyleSheet.absoluteFillObject}
            contentFit="cover"
            {...pulseImageListThumbProps}
          />
          {parentGradeTint ? (
            <View
              pointerEvents="none"
              style={[StyleSheet.absoluteFillObject, { backgroundColor: parentGradeTint, zIndex: 2 }]}
            />
          ) : null}
        </View>
      ) : (
        <View style={[styles.ph, { width: innerW, height: innerH }]} />
      )}
      <View style={layoutMode === 'floating' ? styles.badgeFloating : styles.badge}>
        <Text style={[styles.badgeText, typography.overlayMicro]}>Duet</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  strip: {
    position: 'absolute',
    left: 0,
    top: 0,
    zIndex: 2,
    borderRightWidth: StyleSheet.hairlineWidth,
    borderRightColor: 'rgba(255,255,255,0.35)',
    overflow: 'hidden',
    backgroundColor: 'rgba(0,0,0,0.35)',
  },
  floating: {
    position: 'absolute',
    zIndex: 6,
    borderRadius: 14,
    overflow: 'hidden',
    borderWidth: 2,
    borderColor: 'rgba(255,255,255,0.92)',
    backgroundColor: '#000',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.35,
    shadowRadius: 10,
    elevation: 10,
  },
  ph: { backgroundColor: 'rgba(0,0,0,0.5)' },
  badge: {
    position: 'absolute',
    top: 12,
    left: 8,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    backgroundColor: 'rgba(0,0,0,0.55)',
  },
  badgeFloating: {
    position: 'absolute',
    top: 8,
    left: 8,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    backgroundColor: 'rgba(0,0,0,0.55)',
  },
  badgeText: { color: colors.onVideo.primary, fontWeight: '800' },
});
