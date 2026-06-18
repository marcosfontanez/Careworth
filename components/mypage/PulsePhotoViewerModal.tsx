import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Dimensions,
  Modal,
  Platform,
  Pressable,
  Share,
  StatusBar,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  type NativeScrollEvent,
  type NativeSyntheticEvent,
} from 'react-native';
import { FlatList, Gesture, GestureDetector } from 'react-native-gesture-handler';
import Animated, {
  Extrapolation,
  interpolate,
  runOnJS,
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  withTiming,
} from 'react-native-reanimated';
import { Image } from 'expo-image';
import { BlurView } from 'expo-blur';
import * as Haptics from 'expo-haptics';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useQueryClient } from '@tanstack/react-query';
import { AvatarDisplay } from '@/components/profile/AvatarBuilder';
import { PulsePhotoZoomSlide } from '@/components/mypage/PulsePhotoZoomSlide';
import { useAuth } from '@/contexts/AuthContext';
import { pushPostViewer, resolvePostViewerHref } from '@/lib/postViewerRoute';
import { navigateToCircleThread } from '@/lib/communityCache';
import {
  syncPostLikeInCaches,
  syncProfileUpdateLikeInCaches,
} from '@/lib/media/syncPulsePhotoLikeCache';
import { profileUpdateKeys } from '@/lib/queryKeys';
import type {
  OpenPulsePhotoViewerInput,
  PulsePhotoLikeTarget,
  PulsePhotoViewerCreator,
  PulsePhotoViewerItem,
} from '@/lib/media/pulsePhotoViewerTypes';
import { profileUpdatesService } from '@/services/profileUpdates';
import { postsService } from '@/services/supabase/posts';
import { colors, borderRadius, pulseverse } from '@/theme';
import { formatCount } from '@/utils/format';

const { width: SCREEN_W, height: SCREEN_H } = Dimensions.get('window');
const DISMISS_DRAG_PX = Math.min(SCREEN_H * 0.22, 140);
const DISMISS_VELOCITY = 850;
const PULSE_LIKE_COLOR = '#FF2D92';

function applyLikeToItems(
  prev: PulsePhotoViewerItem[],
  target: PulsePhotoLikeTarget,
  nextLiked: boolean,
): PulsePhotoViewerItem[] {
  const delta = nextLiked ? 1 : -1;
  return prev.map((item) => {
    if (!item.likeTarget) return item;
    const same = item.likeTarget.kind === target.kind && item.likeTarget.id === target.id;
    if (!same) return item;
    return {
      ...item,
      liked: nextLiked,
      likeCount: Math.max(0, (item.likeCount ?? 0) + delta),
    };
  });
}

type HostProps = OpenPulsePhotoViewerInput & {
  defaultCreator: PulsePhotoViewerCreator;
  onClose: () => void;
};

export function PulsePhotoViewerModalHost({
  items,
  initialIndex = 0,
  creator,
  defaultCreator,
  onClose,
}: HostProps) {
  if (!items?.length) return null;
  const resolvedCreator = creator ?? defaultCreator;
  const safeInitial = Math.min(Math.max(0, initialIndex), Math.max(0, items.length - 1));

  return (
    <PulsePhotoViewerModal
      visible
      items={items}
      initialIndex={safeInitial}
      creator={resolvedCreator}
      onClose={onClose}
    />
  );
}

type ModalProps = {
  visible: boolean;
  items: PulsePhotoViewerItem[];
  initialIndex?: number;
  creator: PulsePhotoViewerCreator;
  onClose: () => void;
};

export function PulsePhotoViewerModal({
  visible,
  items,
  initialIndex = 0,
  creator,
  onClose,
}: ModalProps) {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const listRef = useRef<FlatList<PulsePhotoViewerItem>>(null);
  const [index, setIndex] = useState(initialIndex);
  const [itemStates, setItemStates] = useState(items);
  const [likeBusy, setLikeBusy] = useState(false);
  const [zoomActive, setZoomActive] = useState(false);
  const dismissY = useSharedValue(0);

  useEffect(() => {
    if (!visible) {
      dismissY.value = 0;
    }
  }, [visible, dismissY]);

  const dismissPan = useMemo(
    () =>
      Gesture.Pan()
        .enabled(!zoomActive)
        .activeOffsetY([-18, 18])
        .failOffsetX([-28, 28])
        .onUpdate((e) => {
          dismissY.value = e.translationY;
        })
        .onEnd((e) => {
          const dy = e.translationY;
          const shouldClose =
            Math.abs(dy) > DISMISS_DRAG_PX || Math.abs(e.velocityY) > DISMISS_VELOCITY;
          if (shouldClose) {
            const target = dy >= 0 ? SCREEN_H : -SCREEN_H;
            dismissY.value = withTiming(target, { duration: 220 }, (finished) => {
              if (finished) runOnJS(onClose)();
            });
            return;
          }
          dismissY.value = withSpring(0, { damping: 22, stiffness: 280 });
        }),
    [dismissY, onClose, zoomActive],
  );

  const shellStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: dismissY.value }],
    opacity: interpolate(
      Math.abs(dismissY.value),
      [0, SCREEN_H * 0.45],
      [1, 0.38],
      Extrapolation.CLAMP,
    ),
  }));

  useEffect(() => {
    if (!visible) return;
    setIndex(initialIndex);
    setItemStates(items);
    setLikeBusy(false);
    setZoomActive(false);
    requestAnimationFrame(() => {
      listRef.current?.scrollToIndex({ index: initialIndex, animated: false });
    });
  }, [visible, initialIndex, items]);

  useEffect(() => {
    setZoomActive(false);
  }, [index]);

  useEffect(() => {
    if (!visible || itemStates.length < 2) return;
    const preload = (i: number) => {
      const url =
        itemStates[i]?.thumbnailUrl?.trim() || itemStates[i]?.imageUrl?.trim();
      if (url) void Image.prefetch(url);
    };
    preload(index + 1);
    preload(index - 1);
  }, [visible, index, itemStates]);

  const current = itemStates[index];
  const showLike = Boolean(current?.likeTarget);
  const liked = current?.liked === true;
  const likeCount = current?.likeCount ?? 0;

  const onToggleLike = useCallback(async () => {
    const target = current?.likeTarget;
    if (!target || likeBusy) return;
    if (!user?.id) {
      Alert.alert('Sign in', 'You need an account to Pulse this post.');
      return;
    }
    void Haptics.selectionAsync().catch(() => {});
    const nextLiked = !liked;
    setItemStates((prev) => applyLikeToItems(prev, target, nextLiked));
    setLikeBusy(true);
    try {
      if (target.kind === 'post') {
        const serverLiked = await postsService.toggleLike(user.id, target.id);
        syncPostLikeInCaches(queryClient, {
          viewerId: user.id,
          profileUserId: creator.id,
          postId: target.id,
          liked: serverLiked,
        });
      } else {
        const serverLiked = await profileUpdatesService.toggleLike(target.id);
        syncProfileUpdateLikeInCaches(queryClient, {
          ownerUserId: creator.id,
          updateId: target.id,
          liked: serverLiked,
          viewerId: user?.id ?? null,
        });
        queryClient.invalidateQueries({ queryKey: profileUpdateKeys.byId(target.id) });
      }
    } catch {
      setItemStates((prev) => applyLikeToItems(prev, target, !nextLiked));
      Alert.alert('Couldn’t update', 'Please try again in a moment.');
    } finally {
      setLikeBusy(false);
    }
  }, [creator.id, current?.likeTarget, likeBusy, liked, queryClient, user?.id]);

  const syncIndexFromOffset = useCallback(
    (offsetX: number) => {
      const next = Math.round(offsetX / SCREEN_W);
      if (Number.isFinite(next) && next >= 0 && next < itemStates.length) {
        setIndex(next);
      }
    },
    [itemStates.length],
  );

  const onMomentumScrollEnd = useCallback(
    (e: NativeSyntheticEvent<NativeScrollEvent>) => {
      syncIndexFromOffset(e.nativeEvent.contentOffset.x);
    },
    [syncIndexFromOffset],
  );

  const onScrollEndDrag = useCallback(
    (e: NativeSyntheticEvent<NativeScrollEvent>) => {
      syncIndexFromOffset(e.nativeEvent.contentOffset.x);
    },
    [syncIndexFromOffset],
  );

  const navigateToSource = useCallback(
    async (focusComments: boolean) => {
      if (!current) return;
      onClose();

      const circleSlug = current.linkedCircleSlug?.trim();
      const threadId = current.linkedThreadId?.trim();

      if (threadId && circleSlug && !current.sourcePostId) {
        await navigateToCircleThread(
          router,
          queryClient,
          circleSlug,
          threadId,
          user?.id ?? null,
          focusComments ? 'photoViewer:comment' : 'photoViewer:view',
        );
        return;
      }

      if (current.pulseUpdateId && !current.sourcePostId) {
        router.push(
          (focusComments
            ? `/my-pulse/${current.pulseUpdateId}?focusComments=1`
            : `/my-pulse/${current.pulseUpdateId}`) as never,
        );
        return;
      }
      if (current.post) {
        router.push(
          resolvePostViewerHref(current.post, {
            focusComments,
            circle: circleSlug,
          }) as never,
        );
        return;
      }
      if (current.sourcePostId) {
        await pushPostViewer(router, current.sourcePostId, {
          focusComments,
          circle: circleSlug,
          viewerId: user?.id ?? null,
        });
      }
    },
    [current, onClose, queryClient, router, user?.id],
  );

  const handleShare = useCallback(async () => {
    if (!current?.imageUrl) return;
    try {
      await Share.share({
        message: current.caption?.trim()
          ? `${current.caption.trim()}\n${current.imageUrl}`
          : current.imageUrl,
      });
    } catch {
      /* user dismissed */
    }
  }, [current]);

  const headerTitle = current?.isAnonymous ? 'Anonymous post' : creator.displayName;
  const countLabel = itemStates.length > 1 ? `${index + 1} of ${itemStates.length}` : null;

  const renderSlide = useCallback(
    ({ item }: { item: PulsePhotoViewerItem }) => (
      <View style={styles.slide}>
        <PulsePhotoZoomSlide
          uri={item.imageUrl}
          style={styles.slideImageWrap}
          onZoomActiveChange={setZoomActive}
          loadingIndicator={<ActivityIndicator color={pulseverse.accentCyan} />}
        />
      </View>
    ),
    [],
  );

  if (!itemStates.length) return null;

  return (
    <Modal
      visible={visible}
      animationType="fade"
      transparent
      statusBarTranslucent
      onRequestClose={onClose}
    >
      <StatusBar barStyle="light-content" />
      <GestureDetector gesture={dismissPan}>
        <Animated.View style={[styles.root, shellStyle]}>
        <LinearGradient
          colors={['rgba(4,8,18,0.96)', 'rgba(2,6,16,0.98)', 'rgba(4,8,18,0.96)']}
          style={StyleSheet.absoluteFill}
        />

        <FlatList
          ref={listRef}
          data={itemStates}
          keyExtractor={(item) => item.id}
          renderItem={renderSlide}
          horizontal
          pagingEnabled
          scrollEnabled={!zoomActive && itemStates.length > 1}
          showsHorizontalScrollIndicator={false}
          bounces={itemStates.length > 1}
          decelerationRate="fast"
          disableIntervalMomentum
          initialScrollIndex={Math.min(initialIndex, itemStates.length - 1)}
          getItemLayout={(_, i) => ({ length: SCREEN_W, offset: SCREEN_W * i, index: i })}
          onMomentumScrollEnd={onMomentumScrollEnd}
          onScrollEndDrag={onScrollEndDrag}
          onScrollToIndexFailed={(info) => {
            listRef.current?.scrollToOffset({
              offset: info.averageItemLength * info.index,
              animated: false,
            });
          }}
          style={styles.carousel}
        />

        <View style={styles.chrome} pointerEvents="box-none">
          <View style={[styles.header, { paddingTop: insets.top + 8 }]} pointerEvents="auto">
            {Platform.OS === 'ios' ? (
              <BlurView intensity={36} tint="dark" style={StyleSheet.absoluteFill} />
            ) : (
              <View style={[StyleSheet.absoluteFill, styles.headerAndroidFill]} />
            )}
            <LinearGradient
              colors={['rgba(6,14,26,0.88)', 'rgba(6,14,26,0.45)', 'transparent']}
              style={StyleSheet.absoluteFill}
              pointerEvents="none"
            />
            <View style={styles.headerRow}>
              {!current?.isAnonymous ? (
                <AvatarDisplay
                  size={36}
                  avatarUrl={creator.avatarUrl ?? undefined}
                  prioritizeRemoteAvatar
                  showEdit={false}
                  ringColor={colors.primary.teal}
                />
              ) : (
                <View style={styles.anonAvatar}>
                  <Ionicons name="eye-off-outline" size={16} color={pulseverse.accentCyan} />
                </View>
              )}
              <View style={styles.headerCopy}>
                <Text style={styles.headerName} numberOfLines={1}>
                  {headerTitle}
                </Text>
                {current?.sourceLabel ? (
                  <Text style={styles.headerMeta} numberOfLines={1}>
                    {current.sourceLabel}
                    {countLabel ? ` · ${countLabel}` : ''}
                  </Text>
                ) : null}
              </View>
              <TouchableOpacity
                style={styles.closeBtn}
                onPress={onClose}
                hitSlop={12}
                accessibilityRole="button"
                accessibilityLabel="Close"
              >
                <Ionicons name="close" size={22} color="#FFF" />
              </TouchableOpacity>
            </View>
            {current?.caption ? (
              <Text style={styles.caption} numberOfLines={2}>
                {current.caption}
              </Text>
            ) : null}
          </View>

          {itemStates.length > 1 ? (
            <>
              {index > 0 ? (
                <TouchableOpacity
                  style={[styles.navBtn, styles.navLeft, { top: SCREEN_H * 0.42 }]}
                  onPress={() => listRef.current?.scrollToIndex({ index: index - 1, animated: true })}
                  accessibilityLabel="Previous photo"
                >
                  <Ionicons name="chevron-back" size={22} color="#FFF" />
                </TouchableOpacity>
              ) : null}
              {index < itemStates.length - 1 ? (
                <TouchableOpacity
                  style={[styles.navBtn, styles.navRight, { top: SCREEN_H * 0.42 }]}
                  onPress={() => listRef.current?.scrollToIndex({ index: index + 1, animated: true })}
                  accessibilityLabel="Next photo"
                >
                  <Ionicons name="chevron-forward" size={22} color="#FFF" />
                </TouchableOpacity>
              ) : null}
            </>
          ) : null}

          {showLike ? (
            <View
              style={[styles.likeRail, { bottom: insets.bottom + 96 }]}
              pointerEvents="box-none"
            >
              <TouchableOpacity
                style={[styles.likeBtn, liked ? styles.likeBtnActive : null]}
                onPress={() => void onToggleLike()}
                disabled={likeBusy}
                activeOpacity={0.88}
                accessibilityRole="button"
                accessibilityLabel={liked ? 'Remove Pulse' : 'Pulse this photo'}
                accessibilityState={{ selected: liked, disabled: likeBusy }}
              >
                <Ionicons
                  name={liked ? 'heart' : 'heart-outline'}
                  size={24}
                  color={liked ? PULSE_LIKE_COLOR : '#F8FAFC'}
                />
              </TouchableOpacity>
              {likeCount > 0 ? (
                <Text style={styles.likeCount}>{formatCount(likeCount)}</Text>
              ) : null}
            </View>
          ) : null}

          <View style={[styles.footer, { paddingBottom: insets.bottom + 12 }]} pointerEvents="auto">
            {Platform.OS === 'ios' ? (
              <BlurView intensity={40} tint="dark" style={StyleSheet.absoluteFill} />
            ) : (
              <View style={[StyleSheet.absoluteFill, styles.footerAndroidFill]} />
            )}
            <LinearGradient
              colors={['transparent', 'rgba(6,14,26,0.72)', 'rgba(6,14,26,0.92)']}
              style={StyleSheet.absoluteFill}
              pointerEvents="none"
            />
            <View style={styles.actionsRow}>
              {showLike ? (
                <ActionChip
                  icon={liked ? 'heart' : 'heart-outline'}
                  label={liked ? 'Pulsed' : 'Pulse'}
                  onPress={() => void onToggleLike()}
                  accent={liked ? PULSE_LIKE_COLOR : pulseverse.accentCyan}
                  disabled={likeBusy}
                />
              ) : null}
              {current?.showViewPost ? (
                <ActionChip
                  icon="open-outline"
                  label="View post"
                  onPress={() => void navigateToSource(false)}
                />
              ) : null}
              {current?.showComment ? (
                <ActionChip
                  icon="chatbubble-outline"
                  label={
                    typeof current.commentCount === 'number' && current.commentCount > 0
                      ? `Comment · ${current.commentCount}`
                      : 'Comment'
                  }
                  onPress={() => void navigateToSource(true)}
                />
              ) : null}
              {Platform.OS !== 'web' ? (
                <ActionChip icon="share-outline" label="Share" onPress={() => void handleShare()} />
              ) : null}
            </View>
          </View>
        </View>
        </Animated.View>
      </GestureDetector>
    </Modal>
  );
}

function ActionChip({
  icon,
  label,
  onPress,
  accent = pulseverse.accentCyan,
  disabled = false,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  onPress: () => void;
  accent?: string;
  disabled?: boolean;
}) {
  return (
    <TouchableOpacity
      style={[styles.actionChip, disabled ? styles.actionChipDisabled : null]}
      onPress={onPress}
      activeOpacity={0.88}
      disabled={disabled}
    >
      <Ionicons name={icon} size={16} color={accent} />
      <Text style={[styles.actionChipText, { color: accent === PULSE_LIKE_COLOR ? '#FECDD3' : '#E0F2FE' }]}>
        {label}
      </Text>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: '#020617',
  },
  carousel: {
    flex: 1,
    zIndex: 1,
  },
  slide: {
    width: SCREEN_W,
    height: SCREEN_H,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 12,
    paddingVertical: 120,
  },
  slideImageWrap: {
    width: '100%',
    height: '100%',
  },
  slideImage: {
    width: '100%',
    height: '100%',
  },
  chrome: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 4,
  },
  header: {
    paddingHorizontal: 16,
    paddingBottom: 12,
    overflow: 'hidden',
  },
  headerAndroidFill: {
    backgroundColor: 'rgba(6,14,26,0.82)',
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  headerCopy: {
    flex: 1,
    minWidth: 0,
  },
  headerName: {
    fontSize: 15,
    fontWeight: '800',
    color: '#F8FAFC',
    letterSpacing: -0.2,
  },
  headerMeta: {
    marginTop: 2,
    fontSize: 12,
    fontWeight: '600',
    color: 'rgba(148,163,184,0.92)',
  },
  caption: {
    marginTop: 10,
    fontSize: 13,
    lineHeight: 18,
    fontWeight: '600',
    color: 'rgba(226,232,240,0.92)',
  },
  anonAvatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(15,23,42,0.88)',
    borderWidth: 1,
    borderColor: 'rgba(56,189,248,0.35)',
  },
  closeBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(15,23,42,0.72)',
    borderWidth: 1,
    borderColor: 'rgba(148,163,184,0.28)',
  },
  navBtn: {
    position: 'absolute',
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(15,23,42,0.72)',
    borderWidth: 1,
    borderColor: 'rgba(148,163,184,0.28)',
  },
  navLeft: { left: 12 },
  navRight: { right: 12 },
  likeRail: {
    position: 'absolute',
    right: 14,
    alignItems: 'center',
    gap: 6,
    zIndex: 5,
  },
  likeBtn: {
    width: 52,
    height: 52,
    borderRadius: 26,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(15,23,42,0.72)',
    borderWidth: 1,
    borderColor: 'rgba(148,163,184,0.28)',
  },
  likeBtnActive: {
    backgroundColor: 'rgba(255,45,146,0.18)',
    borderColor: 'rgba(255,45,146,0.55)',
    shadowColor: PULSE_LIKE_COLOR,
    shadowOpacity: 0.35,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 0 },
  },
  likeCount: {
    fontSize: 11,
    fontWeight: '800',
    color: '#F8FAFC',
    textShadowColor: 'rgba(0,0,0,0.65)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 4,
  },
  footer: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    paddingTop: 16,
    paddingHorizontal: 16,
    overflow: 'hidden',
  },
  footerAndroidFill: {
    backgroundColor: 'rgba(6,14,26,0.88)',
  },
  actionsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    justifyContent: 'center',
  },
  actionChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: borderRadius.full,
    backgroundColor: 'rgba(12,18,32,0.78)',
    borderWidth: 1,
    borderColor: 'rgba(56,189,248,0.32)',
  },
  actionChipDisabled: {
    opacity: 0.6,
  },
  actionChipText: {
    fontSize: 12,
    fontWeight: '800',
    color: '#E0F2FE',
    letterSpacing: 0.1,
  },
});
