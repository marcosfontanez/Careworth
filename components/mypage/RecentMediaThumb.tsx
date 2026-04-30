import React, { useEffect, useMemo, useRef, useState } from 'react';
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
import { postStaticImagePreviewUri, postHasDemoCatalogMedia } from '@/utils/postPreviewMedia';
import { VideoBrandWatermark } from '@/components/feed/VideoBrandWatermark';

type ThumbStyle = StyleProp<ImageStyle | ViewStyle>;

function SignedThumbImage({
  uri,
  style,
  contentFit = 'cover',
}: {
  uri: string;
  style: StyleProp<ImageStyle>;
  contentFit?: ImageContentFit;
}) {
  /**
   * Recent-media grid cells render at ~120–160 px wide. Asking Supabase for
   * a 320-px-wide WebP via the image-transform endpoint cuts the typical
   * payload from ~400 KB (full-res phone photo) to ~15 KB. Falls back to
   * the original URL transparently for non-Supabase / signed sources.
   */
  const [displayUri, setDisplayUri] = useState(() => mediaThumb(uri, 160));

  useEffect(() => {
    let alive = true;
    setDisplayUri(mediaThumb(uri, 160));
    void trySignedUrlFromPostMediaPublicUrl(uri).then((signed) => {
      // Signed URLs bypass the public render endpoint — accept them as-is
      // (no transform), the bandwidth win is only for public-bucket reads.
      if (alive && signed) setDisplayUri(signed);
    });
    return () => {
      alive = false;
    };
  }, [uri]);

  return <Image source={{ uri: displayUri }} style={style} contentFit={contentFit} />;
}

function PausedVideoFrame({ publicUrl, style }: { publicUrl: string; style: ThumbStyle }) {
  const [uri, setUri] = useState(publicUrl);
  const sought = useRef(false);

  useEffect(() => {
    sought.current = false;
    setUri(publicUrl);
  }, [publicUrl]);

  useEffect(() => {
    void trySignedUrlFromPostMediaPublicUrl(publicUrl).then((signed) => {
      if (signed) setUri(signed);
    });
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

  useEventListener(player, 'statusChange', ({ status }) => {
    if (status === 'readyToPlay' && !sought.current) {
      sought.current = true;
      try {
        player.currentTime = 0;
        player.pause();
      } catch {
        /* noop */
      }
    }
  });

  return <VideoView player={player} style={style} contentFit="cover" nativeControls={false} />;
}

/**
 * Grid / carousel preview: image URL when available; otherwise a paused first-frame video on native.
 */
export function RecentMediaThumb({ post, style }: { post: Post; style: ThumbStyle }) {
  if (postHasDemoCatalogMedia(post)) {
    return (
      <View style={[style, styles.ph]}>
        <Ionicons name="image-outline" size={26} color={colors.dark.textMuted} />
      </View>
    );
  }

  const staticUri = postStaticImagePreviewUri(post);
  if (staticUri) {
    return <SignedThumbImage uri={staticUri} style={style as StyleProp<ImageStyle>} />;
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
  if (post.type === 'video' && v && Platform.OS !== 'web') {
    return (
      <View style={style}>
        <PausedVideoFrame publicUrl={v} style={StyleSheet.absoluteFillObject} />
        <VideoBrandWatermark compact position="bottom-center" edgeOffset={6} variant="subtle" />
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
});
