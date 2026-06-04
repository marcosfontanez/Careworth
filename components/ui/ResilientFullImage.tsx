import React, { useCallback, useEffect, useRef, useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ActivityIndicator, type StyleProp, type ViewStyle } from 'react-native';
import { Image, type ImageContentFit, type ImageLoadEventData, type ImageProps } from 'expo-image';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '@/theme';
import { rawPublicUrlFromTransform, trySignedUrlFromPostMediaPublicUrl } from '@/lib/storage';

/**
 * Full-bleed image that survives the common reasons a Supabase image fails to
 * load, in order:
 *   1. the given URL (often a `render/image` transform URL),
 *   2. the plain `object/public` URL (when image transforms are unavailable),
 *   3. a time-limited signed URL (when the object isn't publicly readable),
 *   4. a visible "couldn't load" state with a manual retry.
 *
 * The standalone image-viewer and post-detail hero previously rendered a bare
 * `<Image source={{ uri }}>` with no fallback, so any one of the above failures
 * left a permanently blank frame.
 */
type Phase = 'original' | 'raw' | 'signed' | 'failed';

export function ResilientFullImage({
  uri,
  style,
  contentFit = 'contain',
  imageProps,
  onLoad,
}: {
  uri: string;
  style?: StyleProp<ViewStyle>;
  contentFit?: ImageContentFit;
  imageProps?: Pick<ImageProps, 'cachePolicy' | 'priority' | 'transition'>;
  /** Forwarded from the underlying image once a source successfully loads. */
  onLoad?: (event: ImageLoadEventData) => void;
}) {
  const trimmed = (uri ?? '').trim();
  const [displayUri, setDisplayUri] = useState(trimmed);
  const [loading, setLoading] = useState(true);
  const phase = useRef<Phase>('original');

  const reset = useCallback(() => {
    phase.current = 'original';
    setDisplayUri(trimmed);
    setLoading(!!trimmed);
  }, [trimmed]);

  useEffect(() => {
    reset();
  }, [reset]);

  const advance = useCallback(() => {
    // Step 1: drop the transform and try the plain public object URL.
    if (phase.current === 'original') {
      const raw = rawPublicUrlFromTransform(trimmed);
      if (raw && raw !== trimmed) {
        phase.current = 'raw';
        setDisplayUri(raw);
        return;
      }
      phase.current = 'raw';
    }
    // Step 2: try a signed URL (private object / RLS-gated read).
    if (phase.current === 'raw') {
      phase.current = 'signed';
      void trySignedUrlFromPostMediaPublicUrl(trimmed).then((signed) => {
        if (signed) {
          setDisplayUri(signed);
        } else {
          phase.current = 'failed';
          setLoading(false);
          setDisplayUri('');
        }
      });
      return;
    }
    // Step 3: give up.
    phase.current = 'failed';
    setLoading(false);
    setDisplayUri('');
  }, [trimmed]);

  if (phase.current === 'failed' || !trimmed) {
    return (
      <View style={[styles.center, style]}>
        <Ionicons name="image-outline" size={40} color={colors.dark.textMuted} />
        <Text style={styles.failedText}>Couldn’t load this photo</Text>
        {trimmed ? (
          <TouchableOpacity
            style={styles.retryBtn}
            onPress={reset}
            activeOpacity={0.85}
            accessibilityRole="button"
            accessibilityLabel="Retry loading photo"
          >
            <Ionicons name="refresh" size={15} color="#FFF" />
            <Text style={styles.retryText}>Try again</Text>
          </TouchableOpacity>
        ) : null}
      </View>
    );
  }

  return (
    <View style={style}>
      <Image
        source={{ uri: displayUri }}
        style={StyleSheet.absoluteFillObject}
        contentFit={contentFit}
        onLoadStart={() => setLoading(true)}
        onLoad={(e) => {
          setLoading(false);
          onLoad?.(e);
        }}
        onError={advance}
        {...imageProps}
      />
      {loading ? (
        <View style={styles.loaderOverlay} pointerEvents="none">
          <ActivityIndicator size="small" color={colors.primary.teal} />
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  center: {
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
  },
  loaderOverlay: {
    ...StyleSheet.absoluteFillObject,
    alignItems: 'center',
    justifyContent: 'center',
  },
  failedText: {
    color: colors.dark.textMuted,
    fontSize: 13,
    fontWeight: '600',
  },
  retryBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 999,
    backgroundColor: colors.primary.teal,
  },
  retryText: {
    color: '#FFF',
    fontSize: 13,
    fontWeight: '800',
  },
});
