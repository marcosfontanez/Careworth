import React, { createElement, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  View,
  StyleSheet,
  Platform,
  type StyleProp,
  type ViewStyle,
  type ImageStyle,
} from 'react-native';
import { Image, type ImageContentFit } from 'expo-image';
import { VideoView, useVideoPlayer } from 'expo-video';
import { useEventListener } from 'expo';
import { Ionicons } from '@expo/vector-icons';
import { trySignedUrlFromPostMediaPublicUrl, mediaThumb } from '@/lib/storage';
import { colors } from '@/theme';
import type { Post } from '@/types';
import { pickAbCoverUrl } from '@/lib/coverAbPoster';
import {
  isDemoCatalogMediaUrl,
  postStaticImagePreviewUri,
  postHasDemoCatalogMedia,
} from '@/utils/postPreviewMedia';
import { VideoBrandWatermark } from '@/components/feed/VideoBrandWatermark';
import { resolveFeedGradeLookId } from '@/lib/moodPresets';
import { tintForLook } from '@/lib/videoFilters';
import { pulseImageListThumbProps } from '@/lib/pulseImage';

type ThumbStyle = StyleProp<ImageStyle | ViewStyle>;

/** Default tile aspect (Media Hub card) until `onLayout` supplies real pixels. */
const FALLBACK_THUMB_CSS = { w: 118, h: 168 };

export type HubTileLayoutCss = { w: number; h: number };

/** Feed-aligned tint RGBA for a post’s persisted grade / mood look — reusable outside tiles. */
export function feedGradeTintFromPost(post: Post): string | null {
  const id = resolveFeedGradeLookId({
    videoLookId: post.videoLookId,
    moodPreset: post.moodPreset,
  });
  return id ? tintForLook(id) : null;
}

export function FeedGradeTintOverlay({ tint }: { tint: string | null }) {
  if (!tint) return null;
  return (
    <View
      pointerEvents="none"
      style={[StyleSheet.absoluteFillObject, { backgroundColor: tint, zIndex: 3 }]}
    />
  );
}

/**
 * Grid tile image: prefer Supabase **transform** URLs (correct size + `resize=cover`
 * for the tile). We only swap to a **signed** full-size URL on load error (e.g. private
 * bucket) so we don't skip transforms on every signed-in session.
 */
export function HubTileImage({
  uri,
  style,
  contentFit = 'cover',
  layoutSizeCss,
}: {
  uri: string;
  style: ThumbStyle;
  contentFit?: ImageContentFit;
  /** Optional fixed tile size (e.g. Media Hub) so thumbs don't wait on `onLayout`. */
  layoutSizeCss?: HubTileLayoutCss;
}) {
  const [layout, setLayout] = useState<{ w: number; h: number } | null>(() =>
    layoutSizeCss
      ? { w: layoutSizeCss.w, h: layoutSizeCss.h }
      : null,
  );
  const w = layout?.w ?? FALLBACK_THUMB_CSS.w;
  const h = layout?.h ?? FALLBACK_THUMB_CSS.h;

  const transformUri = useMemo(() => mediaThumb(uri, w, h), [uri, w, h]);
  const [displayUri, setDisplayUri] = useState(transformUri);
  const [effectiveFit, setEffectiveFit] = useState<ImageContentFit>(contentFit);
  const signedFallbackTried = useRef(false);
  const triedRawPublicFallback = useRef(false);

  useEffect(() => {
    signedFallbackTried.current = false;
    triedRawPublicFallback.current = false;
    setDisplayUri(transformUri);
    setEffectiveFit(contentFit);
  }, [transformUri, contentFit]);

  const onImageError = () => {
    const raw = uri.trim();
    if (!triedRawPublicFallback.current && raw && transformUri !== raw) {
      triedRawPublicFallback.current = true;
      setDisplayUri(raw);
      setEffectiveFit(contentFit);
      return;
    }
    if (signedFallbackTried.current) return;
    signedFallbackTried.current = true;
    void trySignedUrlFromPostMediaPublicUrl(uri).then((signed) => {
      if (signed) {
        setDisplayUri(signed);
        setEffectiveFit('contain');
      }
    });
  };

  return (
    <View
      style={style}
      onLayout={(e) => {
        if (layoutSizeCss) return;
        const { width, height } = e.nativeEvent.layout;
        if (width > 2 && height > 2) {
          setLayout((prev) => {
            if (
              prev &&
              Math.abs(prev.w - width) < 0.5 &&
              Math.abs(prev.h - height) < 0.5
            ) {
              return prev;
            }
            return { w: width, h: height };
          });
        }
      }}
    >
      <Image
        source={{ uri: displayUri }}
        style={StyleSheet.absoluteFillObject}
        contentFit={effectiveFit}
        onError={onImageError}
        {...pulseImageListThumbProps}
      />
    </View>
  );
}

/**
 * `expo-video` grid previews are unreliable on web (wrong scale / “corner” of the frame).
 * Native `<video>` + `object-fit: contain` matches browser behavior.
 */
function WebVideoGridPoster({ publicUrl }: { publicUrl: string }) {
  const [src, setSrc] = useState(publicUrl);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const signAttempted = useRef(false);

  useEffect(() => {
    setSrc(publicUrl);
    signAttempted.current = false;
  }, [publicUrl]);

  /** Signing is a Storage POST — only after the public URL fails (matches main feed players). */
  const onVideoError = useCallback(() => {
    if (signAttempted.current) return;
    signAttempted.current = true;
    void trySignedUrlFromPostMediaPublicUrl(publicUrl).then((signed) => {
      if (signed) setSrc(signed);
    });
  }, [publicUrl]);

  useEffect(() => {
    const el = videoRef.current;
    if (!el) return;

    const onMeta = () => {
      try {
        const d = el.duration;
        const t =
          Number.isFinite(d) && d > 0
            ? Math.min(Math.max(0.08, d * 0.1), 1.0)
            : 0.35;
        el.currentTime = t;
      } catch {
        /* noop */
      }
      try {
        el.pause();
      } catch {
        /* noop */
      }
    };

    el.muted = true;
    el.defaultMuted = true;
    el.playsInline = true;
    el.setAttribute('playsinline', 'true');
    el.preload = 'metadata';
    el.addEventListener('loadedmetadata', onMeta);
    return () => el.removeEventListener('loadedmetadata', onMeta);
  }, [src]);

  return createElement('video', {
    key: src,
    ref: videoRef,
    src,
    muted: true,
    playsInline: true,
    preload: 'metadata',
    tabIndex: -1,
    onError: onVideoError,
    style: {
      position: 'absolute',
      left: 0,
      top: 0,
      width: '100%',
      height: '100%',
      objectFit: 'contain',
      backgroundColor: '#0a0b0f',
    },
  });
}

function PausedVideoFrame({
  publicUrl,
  style,
  contentFit = 'contain',
}: {
  publicUrl: string;
  style: ThumbStyle;
  contentFit?: 'cover' | 'contain' | 'fill';
}) {
  const [uri, setUri] = useState(publicUrl);
  const sought = useRef(false);
  const signAttempted = useRef(false);

  useEffect(() => {
    sought.current = false;
    signAttempted.current = false;
    setUri(publicUrl);
  }, [publicUrl]);

  useEffect(() => {
    sought.current = false;
  }, [uri]);

  const source = useMemo(() => ({ uri, contentType: 'auto' as const }), [uri]);

  const player = useVideoPlayer(source, (p) => {
    p.muted = true;
    p.volume = 0;
    p.loop = false;
  });

  useEventListener(player, 'statusChange', ({ status, error }) => {
    if (status === 'error' && error && !signAttempted.current) {
      signAttempted.current = true;
      void trySignedUrlFromPostMediaPublicUrl(publicUrl).then((signed) => {
        if (signed) setUri(signed);
      });
      return;
    }
    if (status === 'readyToPlay' && !sought.current) {
      sought.current = true;
      const seekPreviewFrame = () => {
        try {
          const d =
            typeof player.duration === 'number' && Number.isFinite(player.duration)
              ? player.duration
              : 0;
          const t =
            d > 0 ? Math.min(Math.max(0.08, d * 0.1), 1.0) : 0.35;
          player.currentTime = t;
          player.pause();
        } catch {
          /* noop */
        }
      };
      seekPreviewFrame();
      setTimeout(seekPreviewFrame, 140);
    }
  });

  return (
    <VideoView
      player={player}
      style={style}
      contentFit={contentFit}
      nativeControls={false}
      {...(Platform.OS === 'android' ? { surfaceType: 'textureView' as const } : {})}
    />
  );
}

/**
 * Grid / carousel preview: poster image when available (incl. A/B cover + `coverAltUrl`);
 * otherwise a paused video frame (native `expo-video`, web HTML5).
 */
export function RecentMediaThumb({
  post,
  style,
  hubTileCss,
  hubImageContentFit = 'cover',
  /** Android: in dense lists/grids, skip `expo-video` first-frame decode when a real thumbnail URL exists. */
  preferStaticAndroidVideoTile = false,
}: {
  post: Post;
  style: ThumbStyle;
  hubTileCss?: HubTileLayoutCss;
  /** Use `contain` for profile Media Hub so full stills aren't cropped in the tile. */
  hubImageContentFit?: ImageContentFit;
  preferStaticAndroidVideoTile?: boolean;
}) {
  if (postHasDemoCatalogMedia(post)) {
    return (
      <View style={[style, styles.ph]}>
        <Ionicons name="image-outline" size={26} color={colors.dark.textMuted} />
      </View>
    );
  }

  const gradeTint = feedGradeTintFromPost(post);

  if (post.type === 'video') {
    const poster = pickAbCoverUrl(post);
    if (poster && !isDemoCatalogMediaUrl(poster)) {
      return (
        <View style={[style, styles.thumbShell]}>
          <HubTileImage
            uri={poster}
            style={StyleSheet.absoluteFillObject}
            layoutSizeCss={hubTileCss}
            contentFit={hubImageContentFit}
          />
          <FeedGradeTintOverlay tint={gradeTint} />
        </View>
      );
    }
  }

  const staticUri = postStaticImagePreviewUri(post);
  if (staticUri) {
    return (
      <View style={[style, styles.thumbShell]}>
        <HubTileImage
          uri={staticUri}
          style={StyleSheet.absoluteFillObject}
          layoutSizeCss={hubTileCss}
          contentFit={hubImageContentFit}
        />
        <FeedGradeTintOverlay tint={gradeTint} />
      </View>
    );
  }

  if (post.type === 'image') {
    const candidates = [post.mediaUrl, ...(post.additionalMedia ?? [])];
    for (const raw of candidates) {
      const m = raw?.trim();
      if (m && !isDemoCatalogMediaUrl(m)) {
        return (
          <View style={[style, styles.thumbShell]}>
            <HubTileImage
              uri={m}
              style={StyleSheet.absoluteFillObject}
              layoutSizeCss={hubTileCss}
              contentFit={hubImageContentFit}
            />
            <FeedGradeTintOverlay tint={gradeTint} />
          </View>
        );
      }
    }
  }

  if (post.type === 'text' || post.type === 'discussion' || post.type === 'confession') {
    return (
      <View style={[style, styles.ph]}>
        <Ionicons
          name={post.type === 'confession' ? 'eye-off-outline' : 'chatbubble-ellipses-outline'}
          size={28}
          color={colors.dark.textMuted}
        />
      </View>
    );
  }

  const v = post.mediaUrl?.trim();
  if (post.type === 'video' && v) {
    if (Platform.OS === 'web') {
      return (
        <View style={[style, styles.videoTile]}>
          <WebVideoGridPoster publicUrl={v} />
          <FeedGradeTintOverlay tint={gradeTint} />
          <VideoBrandWatermark brandKit={post.creator.brandKit} compact position="bottom-center" edgeOffset={6} variant="subtle" />
        </View>
      );
    }
    const androidThumb = post.thumbnailUrl?.trim();
    if (
      Platform.OS === 'android' &&
      preferStaticAndroidVideoTile &&
      androidThumb &&
      !isDemoCatalogMediaUrl(androidThumb)
    ) {
      return (
        <View style={[style, styles.videoTile]}>
          <HubTileImage
            uri={androidThumb}
            style={StyleSheet.absoluteFillObject}
            layoutSizeCss={hubTileCss}
            contentFit={hubImageContentFit}
          />
          <FeedGradeTintOverlay tint={gradeTint} />
          <VideoBrandWatermark brandKit={post.creator.brandKit} compact position="bottom-center" edgeOffset={6} variant="subtle" />
        </View>
      );
    }
    return (
      <View style={[style, styles.videoTile]}>
        <PausedVideoFrame publicUrl={v} style={StyleSheet.absoluteFillObject} contentFit="contain" />
        <FeedGradeTintOverlay tint={gradeTint} />
        <VideoBrandWatermark brandKit={post.creator.brandKit} compact position="bottom-center" edgeOffset={6} variant="subtle" />
      </View>
    );
  }

  return (
    <View style={[style, styles.ph]}>
      <Ionicons name="videocam" size={28} color={colors.dark.textMuted} />
    </View>
  );
}

const styles = StyleSheet.create({
  ph: {
    backgroundColor: colors.dark.cardAlt,
    alignItems: 'center',
    justifyContent: 'center',
  },
  thumbShell: {
    overflow: 'hidden',
  },
  videoTile: {
    backgroundColor: '#0a0b0f',
    overflow: 'hidden',
  },
});
