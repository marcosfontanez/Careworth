import React, { useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Pressable,
  Animated,
  Easing,
  ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useMediaExportUiStore } from '@/store/mediaExportUiStore';
import { shareDownloadedRemoteUrl } from '@/lib/postMediaActions';
import { analytics } from '@/lib/analytics';
import { colors, typography, spacing, borderRadius } from '@/theme';

/**
 * Non-blocking, slide-down progress banner pinned to the top of the screen.
 *
 * Mirrors TikTok's compact download UI: shows progress / completion / error in a small
 * horizontal pill so the user can keep scrolling and using the app while a branded export
 * runs in the background. The wrapper uses pointer-events="box-none" so all touches outside
 * the pill itself pass through to the underlying screen.
 */
export function MediaExportOverlay() {
  const insets = useSafeAreaInsets();
  const mode = useMediaExportUiStore((s) => s.mode);
  const headline = useMediaExportUiStore((s) => s.headline);
  const detail = useMediaExportUiStore((s) => s.detail);
  const progress = useMediaExportUiStore((s) => s.progress);
  const successSavedToPhotos = useMediaExportUiStore((s) => s.successSavedToPhotos);
  const dismiss = useMediaExportUiStore((s) => s.dismiss);
  const cancelInFlight = useMediaExportUiStore((s) => s.cancelInFlight);
  const fallbackPost = useMediaExportUiStore((s) => s.fallbackPost);
  const fallbackRemote = useMediaExportUiStore((s) => s.fallbackRemote);

  const visible = mode !== 'hidden';
  const slideY = useRef(new Animated.Value(-140)).current;
  const opacity = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(slideY, {
        toValue: visible ? 0 : -140,
        duration: 260,
        easing: Easing.out(Easing.quad),
        useNativeDriver: true,
      }),
      Animated.timing(opacity, {
        toValue: visible ? 1 : 0,
        duration: 220,
        useNativeDriver: true,
      }),
    ]).start();
  }, [visible, slideY, opacity]);

  useEffect(() => {
    if (mode !== 'success') return;
    // Stay visible long enough that the user can actually read "Download Complete"
    // even if they were focused on the bottom of the screen / a different post when
    // the export finished. The minimum visible window is ~4s after slide-in (260ms
    // in + 260ms out + ~3.5s readable).
    const ms = successSavedToPhotos ? 4500 : 6000;
    const t = setTimeout(() => dismiss(), ms);
    return () => clearTimeout(t);
  }, [mode, successSavedToPhotos, dismiss]);

  // Pulse the banner once on success so it's easier to notice — small scale-up
  // and back down. This runs on top of the existing slide-in animation.
  const pulse = useRef(new Animated.Value(1)).current;
  useEffect(() => {
    if (mode !== 'success') return;
    pulse.setValue(0.96);
    Animated.spring(pulse, {
      toValue: 1,
      friction: 5,
      tension: 90,
      useNativeDriver: true,
    }).start();
  }, [mode, pulse]);

  const onCancelOrDismiss = () => {
    if (mode === 'progress') {
      void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      const pid = useMediaExportUiStore.getState().activePostId;
      if (pid) {
        analytics.track('media_export_fail', { postId: pid, reason: 'user_cancelled' });
      }
      cancelInFlight();
    }
    dismiss();
  };

  const onTapBanner = () => {
    if (mode !== 'error') return;
    const post = fallbackPost;
    const remote = fallbackRemote;
    dismiss();
    if (!post || !remote?.trim()) return;
    if (post.type === 'video') {
      analytics.track('post_media_download_raw', { postId: post.id, source: 'export_error_fallback' });
    }
    void shareDownloadedRemoteUrl(remote, `pulseverse-${post.id}`, {
      mimeType: post.type === 'video' ? 'video/mp4' : 'image/jpeg',
      utiIos: post.type === 'video' ? 'public.mpeg-4' : 'public.jpeg',
      saveToGallery: true,
    });
  };

  const accentColor =
    mode === 'success' ? colors.primary.teal : mode === 'error' ? colors.status.error : colors.primary.teal;

  const icon =
    mode === 'success' ? (
      <Ionicons name="checkmark-circle" size={22} color={colors.primary.teal} />
    ) : mode === 'error' ? (
      <Ionicons name="alert-circle-outline" size={22} color={colors.status.error} />
    ) : (
      <ActivityIndicator size="small" color={colors.primary.teal} />
    );

  const determinate = typeof progress === 'number' ? Math.max(0.06, Math.min(1, progress)) : null;
  const showProgressBar = mode === 'progress';

  return (
    <View
      style={[styles.wrap, { paddingTop: insets.top + 6 }]}
      pointerEvents="box-none"
      accessible={false}
    >
      <Animated.View
        style={[
          styles.banner,
          mode === 'success' ? styles.bannerSuccess : null,
          {
            transform: [{ translateY: slideY }, { scale: pulse }],
            opacity,
            borderColor: mode === 'success' ? colors.primary.teal : `${accentColor}66`,
          },
        ]}
        pointerEvents={visible ? 'auto' : 'none'}
      >
        <Pressable
          style={styles.row}
          onPress={onTapBanner}
          android_ripple={{ color: 'rgba(255,255,255,0.06)' }}
        >
          <View style={styles.iconCol}>{icon}</View>
          <View style={styles.textCol}>
            <Text style={styles.headline} numberOfLines={1}>
              {headline}
            </Text>
            {detail ? (
              <Text style={styles.detail} numberOfLines={1}>
                {detail}
              </Text>
            ) : null}
          </View>
          {mode === 'progress' || mode === 'error' ? (
            <TouchableOpacity
              onPress={onCancelOrDismiss}
              hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
              style={styles.closeBtn}
              accessibilityLabel={mode === 'progress' ? 'Cancel export' : 'Dismiss'}
            >
              <Ionicons name="close" size={18} color={colors.dark.textMuted} />
            </TouchableOpacity>
          ) : null}
        </Pressable>
        {showProgressBar ? (
          <View style={styles.track}>
            <View
              style={[
                styles.bar,
                {
                  width: `${Math.round((determinate ?? 0.12) * 100)}%`,
                  backgroundColor: accentColor,
                },
              ]}
            />
          </View>
        ) : null}
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    zIndex: 9999,
    paddingHorizontal: spacing.md,
  },
  banner: {
    backgroundColor: 'rgba(10,22,40,0.94)',
    borderRadius: borderRadius.lg,
    paddingHorizontal: spacing.md,
    paddingVertical: 10,
    borderWidth: 1,
    shadowColor: '#000',
    shadowOpacity: 0.4,
    shadowRadius: 14,
    shadowOffset: { width: 0, height: 6 },
    elevation: 14,
  },
  bannerSuccess: {
    backgroundColor: 'rgba(8,40,46,0.96)',
    borderWidth: 2,
    shadowColor: colors.primary.teal,
    shadowOpacity: 0.55,
    shadowRadius: 16,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  iconCol: { width: 24, alignItems: 'center' },
  textCol: { flex: 1 },
  headline: {
    ...typography.bodySmall,
    fontWeight: '800',
    color: colors.dark.text,
  },
  detail: {
    ...typography.caption,
    color: colors.dark.textSecondary,
    marginTop: 1,
  },
  closeBtn: {
    width: 28,
    height: 28,
    alignItems: 'center',
    justifyContent: 'center',
  },
  track: {
    height: 3,
    borderRadius: 2,
    backgroundColor: colors.dark.cardAlt,
    marginTop: 10,
    overflow: 'hidden',
  },
  bar: {
    height: '100%',
    borderRadius: 2,
  },
});
