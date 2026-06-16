import React, { useState, useCallback, useRef, useEffect, useMemo, memo } from 'react';
import {
  View, Text, StyleSheet, Dimensions, TouchableOpacity, Platform,
  Pressable, ActivityIndicator, ScrollView,
} from 'react-native';
import { GestureDetector, Gesture } from 'react-native-gesture-handler';
import { runOnJS } from 'react-native-reanimated';
import { Image } from 'expo-image';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { GradientOverlay } from '@/components/ui/GradientOverlay';
import { HeartBurst } from '@/components/ui/SuccessAnimation';
import { SponsoredBadge } from './SponsoredBadge';
import { FeedActionRail } from './FeedActionRail';
import { FeedOriginalSound } from './FeedOriginalSound';
import { formatCount } from '@/utils/format';
import { colors, typography, borderRadius, spacing } from '@/theme';
import { pulseColors, pulseRadius } from '@/lib/theme/pulseTheme';
import { CaptionWithMentions } from '@/components/ui/CaptionWithMentions';
import { formatFeedCircleChipLabel } from '@/lib/feedCircleChipLabel';
import { FeedClipAttributionRow } from '@/components/feed/FeedClipAttributionChip';
import { useFeedClipAttribution } from '@/hooks/useFeedClipAttribution';
import { ProfileNeonPills } from '@/components/mypage/ProfileNeonPills';
import { buildNeonPillTags } from '@/lib/buildNeonPillTags';
import { feedCaptionForOverlay } from '@/lib/feedCaptionDisplay';
import { feedCreatorHandleOnly } from '@/lib/feedCreatorIdentityLine';
import { useFeatureFlags } from '@/lib/featureFlags';
import { useAuth } from '@/contexts/AuthContext';
import type { Post } from '@/types';
import {
  DEFAULT_OVERLAY_STYLE,
  computeOverlayTopLeft,
  overlayTextStyle,
  type VideoOverlayStyle,
} from '@/lib/videoOverlayStyle';
import { VideoView, useVideoPlayer } from 'expo-video';
import { useEventListener } from 'expo';
import { trySignedUrlFromPostMediaPublicUrl } from '@/lib/storage';
import { pickAbCoverUrl } from '@/lib/coverAbPoster';
import { pulseImageFeedHeroProps } from '@/lib/pulseImage';
import { usePostCoverAbImpression } from '@/hooks/usePostCoverAbImpression';
import { useCommunities, usePost } from '@/hooks/useQueries';
import { useRouter } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { DuetParentPreview } from '@/components/feed/DuetParentPreview';
import { openWebUrlSafely } from '@/lib/safeExternalLink';
import { SendCreatorGiftTray } from '@/components/shop/SendCreatorGiftTray';
import { resolveFeedGradeLookId, tintForLook, type VideoLookId } from '@/lib/videoFilters';

const { width: SCREEN_W, height: SCREEN_H } = Dimensions.get('window');
const SCRUB_HIT_SLOP = 24;

interface Props {
  post: Post;
  /** Tab feed must match measured list height (not full window) or paging snaps wrong → blank pages */
  viewportHeight?: number;
  isActive: boolean;
  isLiked: boolean;
  isSaved: boolean;
  isFollowing: boolean;
  onLike: () => void;
  onComment: () => void;
  onSave: () => void;
  onShare: () => void;
  onFollow: () => void;
  onProfile: () => void;
  onCommunity?: (id: string) => void;
  onHashtag?: (tag: string) => void;
  onReport?: () => void;
  onLongPress?: () => void;
  /** Swipe left (TikTok-style) → open this creator’s video grid; video + non-anonymous only. */
  onOpenCreatorVideos?: () => void;
  /**
   * From the feed tab: increments on `AppState` → `active` so the *active* cell
   * remounts `expo-video` after long background (recovers black decoder surfaces).
   */
  videoSurfaceEpoch?: number;
}

/**
 * Renders the per-post on-video sticker text at the position + style the
 * creator picked in the composer. When `style` is missing (legacy posts),
 * we fall back to the original centered/lower-third layout — visually
 * identical to pre-migration-237 behavior so old posts don't shift.
 *
 * Position math:
 *  - x_norm 0..1 → maps to `left = x_norm * pageWidth`, then translate-X by
 *    -50% so the user's anchor point sits at the visual center of the text.
 *  - y_norm 0..1 → maps to `top = y_norm * pageHeight`, then translate-Y by
 *    -50% so the anchor is the visual middle of the text.
 *  - Clamped to a small margin so the text never paints outside the page.
 */
function FeedOverlayText({
  text,
  style,
  pageWidth,
  pageHeight,
  fallbackBottom,
}: {
  text: string;
  style: VideoOverlayStyle;
  pageWidth: number;
  pageHeight: number;
  /** Legacy fallback: when style is the default, render in the old centered
   *  position (anchored to bottom) so historic posts don't visually shift. */
  fallbackBottom: number;
}) {
  /** Rendered text size, measured via onLayout. We need this to anchor the
   *  visual center at (x_norm * pageWidth, y_norm * pageHeight) — without it
   *  the absolute wrapper would shrink to text width and anchor at top-left,
   *  pushing the text into the upper-left corner. */
  const [textSize, setTextSize] = React.useState<{ w: number; h: number } | null>(null);

  const trimmed = text.trim();
  if (!trimmed) return null;

  const isDefaultPosition =
    Math.abs(style.x_norm - DEFAULT_OVERLAY_STYLE.x_norm) < 0.0001 &&
    Math.abs(style.y_norm - DEFAULT_OVERLAY_STYLE.y_norm) < 0.0001;

  /** Legacy: keep old "centered, anchored to bottom" layout to avoid shifting
   *  every existing post when the new column is empty. */
  if (isDefaultPosition && style.font === DEFAULT_OVERLAY_STYLE.font &&
      style.size === DEFAULT_OVERLAY_STYLE.size && style.color === DEFAULT_OVERLAY_STYLE.color) {
    return (
      <View
        pointerEvents="none"
        style={[styles.videoOverlayWrap, { bottom: fallbackBottom }]}
      >
        <Text style={styles.videoOverlayText} numberOfLines={3}>
          {trimmed}
        </Text>
      </View>
    );
  }

  const anchor = computeOverlayTopLeft(style, pageWidth, pageHeight, textSize);
  return (
    <View
      pointerEvents="none"
      onLayout={(e) => {
        const { width, height } = e.nativeEvent.layout;
        if (!textSize || textSize.w !== width || textSize.h !== height) {
          setTextSize({ w: width, h: height });
        }
      }}
      style={{
        position: 'absolute',
        left: anchor?.left ?? 0,
        top: anchor?.top ?? 0,
        maxWidth: pageWidth * 0.9,
        opacity: anchor ? 1 : 0,
        zIndex: 5,
      }}
    >
      <Text style={[overlayTextStyle(style), styles.feedOverlayChip]} numberOfLines={3}>
        {trimmed}
      </Text>
    </View>
  );
}

function VideoFeedPostInner({
  post, viewportHeight, isActive, isLiked, isSaved, isFollowing,
  onLike, onComment, onSave, onShare, onFollow, onProfile,
  onCommunity, onHashtag, onReport, onLongPress, onOpenCreatorVideos,
  videoSurfaceEpoch = 0,
}: Props) {
  const router = useRouter();
  usePostCoverAbImpression(post, isActive);
  const pageH = viewportHeight ?? SCREEN_H;
  /** Tab feed cells are shorter than full window; smaller `bottom` insets keep chrome near the cell bottom. */
  const tabFeedEmbedded = viewportHeight != null;
  const chromeBottom = tabFeedEmbedded
    ? { content: 16, progress: 10, rail: 20 }
    : { content: 88, progress: 82, rail: 112 };
  const isAnon = post.isAnonymous;
  const sponsoredDeliveryEnabled = useFeatureFlags(
    (s) => s.sponsoredPosts && s.sponsoredPlacementDelivery,
  );
  const feedCreatorGifting = useFeatureFlags((s) => s.feedCreatorGifting);
  const { user } = useAuth();
  const [creatorGiftOpen, setCreatorGiftOpen] = useState(false);

  const canOpenFeedGift =
    feedCreatorGifting && Boolean(user?.id) && user!.id !== post.creatorId && !post.isAnonymous;

  const { data: communitiesCatalog } = useCommunities();
  const linkedCommunityId = post.communities[0]?.trim() ?? '';
  const linkedCommunity = useMemo(() => {
    if (!linkedCommunityId || !communitiesCatalog?.length) return null;
    return communitiesCatalog.find((c) => c.id === linkedCommunityId) ?? null;
  }, [linkedCommunityId, communitiesCatalog]);
  const circleChipLabel = useMemo(
    () =>
      formatFeedCircleChipLabel(
        post.linkedCommunityName ?? linkedCommunity?.name,
        post.linkedCommunitySlug ?? linkedCommunity?.slug,
        linkedCommunityId || null,
      ),
    [post.linkedCommunityName, post.linkedCommunitySlug, linkedCommunity, linkedCommunityId],
  );
  const clipAttribution = useFeedClipAttribution(post);
  const feedCaption = useMemo(() => feedCaptionForOverlay(post.caption), [post.caption]);
  const neonPillTags = useMemo(() => buildNeonPillTags(post.creator), [post.creator]);
  const creatorHandle = useMemo(() => feedCreatorHandleOnly(post.creator), [post.creator]);

  useEffect(() => {
    setCreatorGiftOpen(false);
  }, [post.id]);

  const [localPaused, setLocalPaused] = useState(false);
  const [showHeart, setShowHeart] = useState(false);
  const [showPauseIcon, setShowPauseIcon] = useState(false);
  const lastTap = useRef(0);
  const pauseTimer = useRef<ReturnType<typeof setTimeout>>(undefined);
  const videoUri = post.mediaUrl?.trim() ?? '';
  const hasVideo = post.type === 'video' && videoUri.length > 0;
  const mediaCombineFailed =
    Boolean(user?.id && user.id === post.creatorId) &&
    (post.mediaProcessingStatus ?? '').trim().toLowerCase() === 'failed';
  const posterUri = useMemo(() => pickAbCoverUrl(post), [post]);

  const carouselUrls = useMemo(() => {
    const main = post.mediaUrl?.trim();
    const extras = (post.additionalMedia ?? [])
      .map((u) => u?.trim())
      .filter((u): u is string => Boolean(u));
    if (post.type !== 'image') return [] as string[];
    if (main) return [main, ...extras];
    return extras;
  }, [post.type, post.mediaUrl, post.additionalMedia]);

  const showImageCarousel = carouselUrls.length > 1;
  const [carouselIndex, setCarouselIndex] = useState(0);
  useEffect(() => {
    setCarouselIndex(0);
  }, [post.id]);

  const gradeLookId = useMemo(
    () => resolveFeedGradeLookId({ videoLookId: post.videoLookId }),
    [post.videoLookId],
  );
  const feedGradeTint = useMemo(
    () => (gradeLookId ? tintForLook(gradeLookId) : null),
    [gradeLookId],
  );
  const seriesLabel = useMemo(() => {
    const part = post.seriesPart;
    const total = post.seriesTotal;
    if (part != null && total != null && total > 0) return `Part ${part} of ${total}`;
    if (part != null) return `Part ${part}`;
    return null;
  }, [post.seriesPart, post.seriesTotal]);

  const duetParentId = post.duetParentId?.trim() ?? '';
  const soundSourceId = post.soundSourcePostId?.trim() ?? '';
  const { data: fetchedSoundSource } = usePost(soundSourceId, {
    enabled: Boolean(hasVideo && soundSourceId && !post.soundSourceMediaUrl?.trim()),
  });
  const attributedSoundUri =
    (post.soundSourceMediaUrl?.trim() || fetchedSoundSource?.mediaUrl?.trim()) || '';
  const canUseSecondarySoundPlayer = Platform.OS !== 'web';
  const playAttributedOverlay =
    hasVideo && Boolean(soundSourceId) && Boolean(attributedSoundUri) && canUseSecondarySoundPlayer;

  const [attributedSoundFailed, setAttributedSoundFailed] = useState(false);
  useEffect(() => {
    setAttributedSoundFailed(false);
  }, [attributedSoundUri, soundSourceId, post.id]);

  const useAttributedSoundPip = playAttributedOverlay && !attributedSoundFailed;

  const [speedUp, setSpeedUp] = useState(false);

  const paused = !isActive || localPaused;

  const handleTap = () => {
    const now = Date.now();
    if (now - lastTap.current < 300) {
      if (!isLiked) {
        onLike();
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      }
      setShowHeart(true);
      setTimeout(() => setShowHeart(false), 900);
      lastTap.current = 0;
      return;
    }
    lastTap.current = now;

    setTimeout(() => {
      if (lastTap.current !== now) return;
      if (hasVideo) {
        setLocalPaused((p) => !p);
        setShowPauseIcon(true);
        clearTimeout(pauseTimer.current);
        pauseTimer.current = setTimeout(() => setShowPauseIcon(false), 800);
      }
    }, 300);
  };

  const handleLongPressRight = (evt: any): boolean => {
    if (!hasVideo) return false;
    const x = evt.nativeEvent.locationX ?? evt.nativeEvent.pageX;
    if (x > SCREEN_W * 0.5) {
      setSpeedUp(true);
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      return true;
    }
    return false;
  };

  const handlePressOut = () => {
    if (speedUp) {
      setSpeedUp(false);
    }
  };

  const fireOpenCreatorVideos = useCallback(() => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    onOpenCreatorVideos?.();
  }, [onOpenCreatorVideos]);

  const swipeOpenCreatorGrid = useMemo(
    () =>
      Gesture.Pan()
        .enabled(Boolean(onOpenCreatorVideos && hasVideo && !post.isAnonymous))
        /** Prefer vertical feed paging unless the user clearly drags left. */
        .failOffsetY([-72, 72])
        .activeOffsetX(-10)
        .maxPointers(1)
        .onEnd((e) => {
          'worklet';
          const { translationX, translationY, velocityX } = e;
          const horizontalIntent =
            Math.abs(translationY) <= Math.abs(translationX) * 0.9;
          const farEnough = translationX <= -44;
          const fastFlick = velocityX <= -320 && translationX <= -22;
          if (!horizontalIntent) return;
          if (!farEnough && !fastFlick) return;
          runOnJS(fireOpenCreatorVideos)();
        }),
    [onOpenCreatorVideos, hasVideo, post.isAnonymous, fireOpenCreatorVideos],
  );

  const body = (
    <Pressable
      style={[styles.container, { height: pageH }]}
      onPress={handleTap}
      onLongPress={(evt) => {
        const handled = hasVideo ? handleLongPressRight(evt) : false;
        if (!handled) {
          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
          onLongPress?.();
        }
      }}
      accessibilityLabel={
        post.caption
          ? `${post.type === 'video' ? 'Video' : 'Post'}: ${post.caption.slice(0, 80)}`
          : post.type === 'video'
            ? 'Video post'
            : 'Post'
      }
      onPressOut={handlePressOut}
      delayLongPress={400}
    >
      {duetParentId ? (
        <DuetParentPreview
          parentPostId={duetParentId}
          pageHeight={pageH}
          layoutMode={post.duetLayoutMode ?? 'strip'}
          enablePlayback={hasVideo && isActive}
          paused={paused}
          isActive={isActive}
          referenceMuted
          playbackRate={speedUp ? 2 : 1}
        />
      ) : null}

      {post.evidenceUrl?.trim() ? (
        <TouchableOpacity
          style={styles.evidencePill}
          activeOpacity={0.85}
          onPress={() => {
            const u = post.evidenceUrl!.trim();
            openWebUrlSafely(u);
          }}
          accessibilityRole="link"
          accessibilityLabel={post.evidenceLabel?.trim() || 'Open evidence link'}
        >
          <Text style={styles.evidenceText} numberOfLines={1}>
            {post.evidenceLabel?.trim() || 'Source'} · tap to open
          </Text>
        </TouchableOpacity>
      ) : null}

      {hasVideo ? (
        <>
          <FeedVideoPlayer
            key={`${videoUri}|${isActive ? videoSurfaceEpoch : 0}`}
            uri={videoUri}
            paused={paused}
            isActive={isActive}
            muteEmbeddedAudio={useAttributedSoundPip}
            speedUp={speedUp}
            progressBarBottom={chromeBottom.progress}
            lookId={gradeLookId}
          />
          {useAttributedSoundPip ? (
            <FeedAttributedSoundPlayer
              publicUri={attributedSoundUri}
              active={isActive}
              paused={paused}
              speedUp={speedUp}
              onFailed={() => setAttributedSoundFailed(true)}
            />
          ) : null}
          {mediaCombineFailed ? (
            <View
              style={[styles.mediaProcessingFailedBanner, { top: tabFeedEmbedded ? 40 : 52 }]}
              pointerEvents="none"
              accessibilityRole="alert"
              accessibilityLabel="Video processing failed; only you can see this post. Your original clip is showing."
            >
              <Text style={styles.mediaProcessingFailedText}>
                Processing failed — only you can see this. Your original video is showing while the edit didn’t finish. Repost to try again, or remove this from your profile.
              </Text>
            </View>
          ) : null}
          {post.videoOverlayText?.trim() ? (
            <FeedOverlayText
              text={post.videoOverlayText}
              style={post.videoOverlayStyle ?? DEFAULT_OVERLAY_STYLE}
              pageWidth={SCREEN_W}
              pageHeight={pageH}
              fallbackBottom={chromeBottom.content + 220}
            />
          ) : null}
        </>
      ) : showImageCarousel ? (
        <View style={styles.bg}>
          <ScrollView
            horizontal
            pagingEnabled
            showsHorizontalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
            onMomentumScrollEnd={(e) => {
              const x = e.nativeEvent.contentOffset.x;
              setCarouselIndex(Math.round(x / SCREEN_W));
            }}
          >
            {carouselUrls.map((uri) => (
              <Image
                key={uri}
                source={{ uri }}
                style={{ width: SCREEN_W, height: pageH }}
                contentFit="cover"
                {...pulseImageFeedHeroProps}
              />
            ))}
          </ScrollView>
          {feedGradeTint ? (
            <View
              pointerEvents="none"
              style={[StyleSheet.absoluteFillObject, { backgroundColor: feedGradeTint, zIndex: 2 }]}
            />
          ) : null}
          <View style={styles.carouselDots} pointerEvents="none">
            {carouselUrls.map((_, i) => (
              <View
                key={`dot-${i}`}
                style={[styles.carouselDot, i === carouselIndex && styles.carouselDotActive]}
              />
            ))}
          </View>
          {post.videoOverlayText?.trim() ? (
            <FeedOverlayText
              text={post.videoOverlayText}
              style={post.videoOverlayStyle ?? DEFAULT_OVERLAY_STYLE}
              pageWidth={SCREEN_W}
              pageHeight={pageH}
              fallbackBottom={chromeBottom.content + 220}
            />
          ) : null}
        </View>
      ) : posterUri || (post.type === 'image' && post.mediaUrl) ? (
        <View style={styles.bg}>
          <Image
            source={{ uri: posterUri || post.mediaUrl }}
            style={StyleSheet.absoluteFillObject}
            contentFit="cover"
            {...pulseImageFeedHeroProps}
          />
          {feedGradeTint ? (
            <View
              pointerEvents="none"
              style={[StyleSheet.absoluteFillObject, { backgroundColor: feedGradeTint, zIndex: 2 }]}
            />
          ) : null}
          {post.videoOverlayText?.trim() ? (
            <FeedOverlayText
              text={post.videoOverlayText}
              style={post.videoOverlayStyle ?? DEFAULT_OVERLAY_STYLE}
              pageWidth={SCREEN_W}
              pageHeight={pageH}
              fallbackBottom={chromeBottom.content + 220}
            />
          ) : null}
        </View>
      ) : (
        <View style={[styles.bg, styles.textBg]}>
          {post.type === 'video' && !videoUri ? (
            <Text style={styles.videoMissingHint}>Video link missing — re-upload from Create, or check Storage (post-media) is public.</Text>
          ) : null}
          <CaptionWithMentions text={feedCaption} style={styles.textPostCaption} />
        </View>
      )}

      <HeartBurst visible={showHeart} />

      <GradientOverlay position="top" intensity="light" />
      <LinearGradient
        colors={['transparent', 'rgba(7,17,31,0.42)', 'rgba(7,17,31,0.78)']}
        style={styles.bottomReadabilityVeil}
        pointerEvents="none"
      />
      <GradientOverlay position="bottom" intensity="medium" />

      <FeedActionRail
        post={post}
        isFeedCellActive={isActive}
        bottomInset={chromeBottom.rail}
        isLiked={isLiked}
        isSaved={isSaved}
        isFollowing={isFollowing}
        onLike={onLike}
        onComment={onComment}
        onSave={onSave}
        onShare={onShare}
        onFollow={onFollow}
        onProfile={onProfile}
        onGift={canOpenFeedGift ? () => setCreatorGiftOpen(true) : undefined}
        onReport={onReport}
        videoSoundSlot={
          hasVideo ? <FeedOriginalSound post={post} isSoundCellActive={isActive} /> : undefined
        }
      />

      <View style={[styles.content, { bottom: chromeBottom.content }]}>
        {sponsoredDeliveryEnabled && post.isSponsored && post.sponsorInfo && (
          <SponsoredBadge sponsor={post.sponsorInfo} />
        )}

        {!isAnon && (
          <View style={styles.identityBlock}>
            <View style={styles.nameLine}>
              <TouchableOpacity onPress={onProfile} activeOpacity={0.85} style={styles.identityPress}>
                <Text style={styles.creatorIdentity} numberOfLines={1}>
                  {creatorHandle}
                </Text>
              </TouchableOpacity>
              {post.creator.isVerified ? (
                <Ionicons name="checkmark-circle" size={14} color={pulseColors.teal} />
              ) : null}
              {neonPillTags.length > 0 ? (
                <ProfileNeonPills tags={neonPillTags} style={styles.feedNeonPills} />
              ) : null}
            </View>
          </View>
        )}

        {isAnon && (
          <View style={styles.anonRow}>
            <Ionicons name="eye-off-outline" size={16} color={colors.onVideo.progressFill} />
            <Text style={styles.anonLabel}>Anonymous</Text>
          </View>
        )}

        {feedCaption ? (
          <CaptionWithMentions
            text={feedCaption}
            style={[styles.caption, typography.captionOverlay]}
            numberOfLines={2}
          />
        ) : null}

        {post.hashtags.length > 0 && (
          <View style={styles.tagRow}>
            {post.hashtags.slice(0, 3).map((tag) => (
              <TouchableOpacity key={tag} onPress={() => onHashtag?.(tag)} activeOpacity={0.7}>
                <Text style={[styles.hashtag, typography.overlayMicro]}>#{tag}</Text>
              </TouchableOpacity>
            ))}
          </View>
        )}

        {(post.isEducation || seriesLabel) ? (
          <View style={styles.creatorMetaChips}>
            {post.isEducation ? (
              <View style={styles.metaChip}>
                <Ionicons name="school-outline" size={12} color={colors.onVideo.emphasis} />
                <Text style={styles.metaChipText}>Educational</Text>
              </View>
            ) : null}
            {seriesLabel ? (
              <View style={styles.metaChip}>
                <Ionicons name="layers-outline" size={12} color={colors.onVideo.emphasis} />
                <Text style={styles.metaChipText}>{seriesLabel}</Text>
              </View>
            ) : null}
            {post.isEducation && post.educationCitations?.length ? (
              <TouchableOpacity
                style={styles.metaChip}
                activeOpacity={0.85}
                onPress={() => {
                  const u = post.educationCitations?.find((c) => c.url?.trim())?.url?.trim();
                  if (u) openWebUrlSafely(u);
                }}
                accessibilityRole="link"
                accessibilityLabel="Open citation source"
              >
                <Ionicons name="link-outline" size={12} color={colors.onVideo.emphasis} />
                <Text style={styles.metaChipText}>Sources</Text>
              </TouchableOpacity>
            ) : null}
          </View>
        ) : null}

        {!isAnon &&
        post.seriesId &&
        post.seriesPart != null &&
        post.seriesTotal != null &&
        post.seriesPart < post.seriesTotal ? (
          <TouchableOpacity
            style={styles.seriesNextRow}
            onPress={() => router.push(`/creator-videos/${post.creatorId}` as never)}
            activeOpacity={0.85}
          >
            <Ionicons name="play-forward-outline" size={14} color={colors.onVideo.emphasis} />
            <Text style={styles.seriesNextText}>More parts — open this creator’s video grid</Text>
          </TouchableOpacity>
        ) : null}

        <FeedClipAttributionRow attribution={clipAttribution} variant="feed" />

        {circleChipLabel && linkedCommunityId ? (
          <TouchableOpacity
            style={styles.circleChip}
            onPress={() => onCommunity?.(linkedCommunityId)}
            activeOpacity={0.82}
            accessibilityRole="button"
            accessibilityLabel={circleChipLabel}
          >
            <Ionicons name="people-outline" size={11} color={pulseColors.teal} />
            <Text style={styles.circleChipText} numberOfLines={1}>
              {circleChipLabel}
            </Text>
            <Ionicons name="chevron-forward" size={11} color={pulseColors.textQuiet} />
          </TouchableOpacity>
        ) : null}

        {post.soundTitle && !hasVideo ? (
          <View style={styles.soundRow}>
            <Ionicons name="musical-notes" size={14} color={colors.primary.gold} />
            <Text style={[styles.soundTitle, typography.overlayMicro]} numberOfLines={1}>
              {post.soundTitle}
            </Text>
          </View>
        ) : null}

        <View style={styles.footerMeta}>
          <View style={styles.footerSpacer} />
          <Text style={[styles.viewCount, typography.overlayQuiet]}>
            {formatCount(post.viewCount)} views
          </Text>
        </View>
      </View>

      {/* Pause icon overlay */}
      {hasVideo && showPauseIcon && (
        <View style={styles.pauseOverlay}>
          <View style={styles.pauseCircle}>
            <Ionicons name={localPaused ? 'play' : 'pause'} size={36} color={colors.onVideo.primary} />
          </View>
        </View>
      )}

      {/* 2x speed indicator */}
      {speedUp && (
        <View style={styles.speedOverlay}>
          <View style={styles.speedBadge}>
            <Ionicons name="speedometer" size={16} color={colors.onVideo.primary} />
            <Text style={styles.speedText}>2x</Text>
          </View>
        </View>
      )}

      {post.type === 'confession' && (
        <View style={[styles.bg, styles.confessionBg]}>
          <Ionicons name="eye-off" size={40} color="rgba(255,255,255,0.15)" />
        </View>
      )}
    </Pressable>
  );

  const creatorGiftTray =
    canOpenFeedGift ? (
      <SendCreatorGiftTray
        visible={creatorGiftOpen}
        onClose={() => setCreatorGiftOpen(false)}
        creatorUserId={post.creatorId}
        creatorDisplayName={post.creator.displayName}
        creatorHandle={post.creator.username}
        creatorAvatarUrl={post.creator.avatarUrl}
        contextType="post"
        contextId={post.id}
      />
    ) : null;

  if (onOpenCreatorVideos && hasVideo && !post.isAnonymous) {
    return (
      <>
        <GestureDetector gesture={swipeOpenCreatorGrid}>
          <View style={{ width: SCREEN_W, height: pageH }} collapsable={false}>
            {body}
          </View>
        </GestureDetector>
        {creatorGiftTray}
      </>
    );
  }

  return (
    <>
      {body}
      {creatorGiftTray}
    </>
  );
}

/** Ignore unstable callback identities; compare only fields that affect the cell UI. */
function videoFeedPostPropsEqual(prev: Props, next: Props): boolean {
  if (prev.isActive !== next.isActive) return false;
  if (prev.isLiked !== next.isLiked) return false;
  if (prev.isSaved !== next.isSaved) return false;
  if (prev.isFollowing !== next.isFollowing) return false;
  if (prev.viewportHeight !== next.viewportHeight) return false;
  if ((prev.videoSurfaceEpoch ?? 0) !== (next.videoSurfaceEpoch ?? 0)) return false;

  const p = prev.post;
  const n = next.post;
  if (p === n) return true;
  if (p.id !== n.id || p.creatorId !== n.creatorId) return false;

  const pc = p.creator;
  const nc = n.creator;
  const pf = pc.pulseAvatarFrame?.id ?? '';
  const nf = nc.pulseAvatarFrame?.id ?? '';
  if (pf !== nf) return false;

  if (
    pc.displayName !== nc.displayName ||
    pc.username !== nc.username ||
    pc.firstName !== nc.firstName ||
    pc.lastName !== nc.lastName ||
    JSON.stringify(pc.identityTags ?? []) !== JSON.stringify(nc.identityTags ?? []) ||
    pc.avatarUrl !== nc.avatarUrl ||
    pc.role !== nc.role ||
    pc.specialty !== nc.specialty ||
    pc.city !== nc.city ||
    pc.state !== nc.state ||
    pc.isVerified !== nc.isVerified
  ) {
    return false;
  }

  const pcit = JSON.stringify(p.educationCitations ?? []);
  const ncit = JSON.stringify(n.educationCitations ?? []);
  if (pcit !== ncit) return false;

  if (
    p.type !== n.type ||
    p.caption !== n.caption ||
    p.mediaUrl !== n.mediaUrl ||
    p.thumbnailUrl !== n.thumbnailUrl ||
    p.coverAltUrl !== n.coverAltUrl ||
    (p.videoOverlayText ?? '') !== (n.videoOverlayText ?? '') ||
    JSON.stringify(p.videoOverlayStyle ?? null) !== JSON.stringify(n.videoOverlayStyle ?? null) ||
    (p.videoLookId ?? '') !== (n.videoLookId ?? '') ||
    (p.evidenceUrl ?? '') !== (n.evidenceUrl ?? '') ||
    (p.evidenceLabel ?? '') !== (n.evidenceLabel ?? '') ||
    (p.scheduledStatus ?? '') !== (n.scheduledStatus ?? '') ||
    p.isEducation !== n.isEducation ||
    p.seriesPart !== n.seriesPart ||
    p.seriesTotal !== n.seriesTotal ||
    p.seriesId !== n.seriesId ||
    (p.additionalMedia ?? []).join('\0') !== (n.additionalMedia ?? []).join('\0') ||
    p.audioReference !== n.audioReference ||
    p.soundTitle !== n.soundTitle ||
    p.soundSourcePostId !== n.soundSourcePostId ||
    p.stitchSourcePostId !== n.stitchSourcePostId ||
    p.soundSourceMediaUrl !== n.soundSourceMediaUrl ||
    p.isAnonymous !== n.isAnonymous ||
    p.isSponsored !== n.isSponsored ||
    p.likeCount !== n.likeCount ||
    p.commentCount !== n.commentCount ||
    p.shareCount !== n.shareCount ||
    p.viewCount !== n.viewCount ||
    p.saveCount !== n.saveCount ||
    (p.commentsDisabled ?? false) !== (n.commentsDisabled ?? false) ||
    (p.duetParentId ?? '') !== (n.duetParentId ?? '') ||
    (p.duetLayoutMode ?? '') !== (n.duetLayoutMode ?? '') ||
    (p.mediaProcessingStatus ?? '') !== (n.mediaProcessingStatus ?? '')
  ) {
    return false;
  }

  if (prev.onOpenCreatorVideos !== next.onOpenCreatorVideos) return false;

  const ph = p.hashtags.join('\u0001');
  const nh = n.hashtags.join('\u0001');
  if (ph !== nh) return false;
  const pco = p.communities.join('\u0001');
  const nco = n.communities.join('\u0001');
  if (pco !== nco) return false;
  if ((p.linkedCommunityName ?? '') !== (n.linkedCommunityName ?? '')) return false;
  if ((p.linkedCommunitySlug ?? '') !== (n.linkedCommunitySlug ?? '')) return false;
  if ((p.sourceLiveStreamId ?? '') !== (n.sourceLiveStreamId ?? '')) return false;
  if ((p.sourcePostId ?? '') !== (n.sourcePostId ?? '')) return false;
  if ((p.sourceCreatorId ?? '') !== (n.sourceCreatorId ?? '')) return false;

  const ps = p.sponsorInfo;
  const ns = n.sponsorInfo;
  if (!!ps !== !!ns) return false;
  if (ps && ns) {
    if (
      ps.advertiserName !== ns.advertiserName ||
      ps.advertiserLogo !== ns.advertiserLogo ||
      ps.ctaLabel !== ns.ctaLabel ||
      ps.ctaUrl !== ns.ctaUrl ||
      ps.campaignId !== ns.campaignId
    ) {
      return false;
    }
  }

  return true;
}

export const VideoFeedPost = memo(VideoFeedPostInner, videoFeedPostPropsEqual);

/**
 * Second `expo-video` instance for the borrowed “original sound” clip (no `expo-audio`).
 * Main {@link FeedVideoPlayer} stays muted while this plays; hidden off-screen for audio-only output.
 */
function FeedAttributedSoundPlayer({
  publicUri,
  active,
  paused,
  speedUp,
  onFailed,
}: {
  publicUri: string;
  active: boolean;
  paused: boolean;
  speedUp: boolean;
  onFailed: () => void;
}) {
  const [fallbackUri, setFallbackUri] = useState<string | null>(null);
  const sourcePhase = useRef<'public' | 'signed' | 'failed'>('public');
  const publicFallbackInFlight = useRef(false);

  useEffect(() => {
    sourcePhase.current = 'public';
    publicFallbackInFlight.current = false;
    setFallbackUri(null);
  }, [publicUri]);

  const resolvedUri = fallbackUri ?? publicUri;
  const source = useMemo(
    () => ({ uri: resolvedUri, contentType: 'auto' as const }),
    [resolvedUri],
  );

  const player = useVideoPlayer(source, (p: any) => {
    p.loop = true;
  });

  useEventListener(player, 'statusChange', ({ status, error }) => {
    if (status === 'readyToPlay') return;
    if (status !== 'error' || !error) return;
    if (sourcePhase.current === 'signed') {
      onFailed();
      return;
    }
    /** Signing failed or public URL is unusable — do not retry on every native error tick (Storage spam + main-thread churn). */
    if (sourcePhase.current === 'failed') return;
    if (publicFallbackInFlight.current) return;
    publicFallbackInFlight.current = true;
    void trySignedUrlFromPostMediaPublicUrl(publicUri).then((signed) => {
      publicFallbackInFlight.current = false;
      if (signed) {
        sourcePhase.current = 'signed';
        setFallbackUri(signed);
      } else {
        sourcePhase.current = 'failed';
        onFailed();
      }
    });
  });

  useEffect(() => {
    if (!player) return;
    try {
      player.playbackRate = speedUp ? 2.0 : 1.0;
    } catch {
      /* noop */
    }
  }, [speedUp, player]);

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
      player.muted = false;
      player.volume = 1;
      if (paused) {
        player.pause();
      } else {
        player.play();
      }
    } catch {
      /* noop */
    }
  }, [player, active, paused]);

  return (
    <View
      pointerEvents="none"
      style={styles.attributedSoundHost}
      collapsable={false}
    >
      <VideoView
        player={player}
        style={styles.attributedSoundView}
        contentFit="contain"
        nativeControls={false}
        {...(Platform.OS === 'android' ? { surfaceType: 'textureView' as const } : {})}
      />
    </View>
  );
}

function FeedVideoPlayer({
  uri, paused, isActive, muteEmbeddedAudio = false, speedUp = false, progressBarBottom = 82,
  lookId,
}: {
  uri: string;
  paused: boolean;
  isActive: boolean;
  /** When true, silence the clip’s own track so the attributed sound player can be heard. */
  muteEmbeddedAudio?: boolean;
  speedUp?: boolean;
  progressBarBottom?: number;
  /** Composer color grade — read-side tint overlay (migration 162). */
  lookId?: VideoLookId;
}) {
  const gradeTint = lookId ? tintForLook(lookId) : null;
  const [fallbackUri, setFallbackUri] = useState<string | null>(null);
  const [loadError, setLoadError] = useState(false);
  const sourcePhase = useRef<'public' | 'signed' | 'failed'>('public');
  const publicFallbackInFlight = useRef(false);

  useEffect(() => {
    sourcePhase.current = 'public';
    publicFallbackInFlight.current = false;
    setFallbackUri(null);
    setLoadError(false);
  }, [uri]);

  const resolvedUri = fallbackUri ?? uri;
  const source = React.useMemo(
    () => ({ uri: resolvedUri, contentType: 'auto' as const }),
    [resolvedUri],
  );

  const player = useVideoPlayer(source, (p: any) => {
    p.loop = true;
  });

  useEventListener(player, 'statusChange', ({ status, error }) => {
    if (status === 'readyToPlay') setLoadError(false);
    if (status !== 'error' || !error) return;
    if (sourcePhase.current === 'signed') {
      setLoadError(true);
      return;
    }
    if (sourcePhase.current === 'failed') return;
    if (publicFallbackInFlight.current) return;
    publicFallbackInFlight.current = true;
    void trySignedUrlFromPostMediaPublicUrl(uri).then((signed) => {
      publicFallbackInFlight.current = false;
      if (signed) {
        sourcePhase.current = 'signed';
        setFallbackUri(signed);
      } else {
        sourcePhase.current = 'failed';
        setLoadError(true);
      }
    });
  });

  const [progress, setProgress] = useState(0);
  const [duration, setDuration] = useState(0);
  const [buffering, setBuffering] = useState(true);
  const [scrubbing, setScrubbing] = useState(false);
  const progressInterval = useRef<ReturnType<typeof setInterval>>(undefined);
  const barRef = useRef<View>(null);
  const barWidth = useRef(SCREEN_W - 24);

  useEffect(() => {
    if (!player) return;
    if (!isActive) {
      player.pause();
      player.muted = true;
      return;
    }
    player.muted = muteEmbeddedAudio;
    player.volume = muteEmbeddedAudio ? 0 : 1;
    if (paused) {
      player.pause();
    } else {
      player.play();
    }
  }, [paused, player, isActive, muteEmbeddedAudio]);

  useEffect(() => {
    if (!player) return;
    try {
      player.playbackRate = speedUp ? 2.0 : 1.0;
    } catch { /* noop */ }
  }, [speedUp, player]);

  useEffect(() => {
    if (!player || !isActive) {
      clearInterval(progressInterval.current);
      if (player) {
        player.pause();
        player.muted = true;
      }
      return;
    }

    player.muted = muteEmbeddedAudio;
    player.volume = muteEmbeddedAudio ? 0 : 1;
    setBuffering(false);

    progressInterval.current = setInterval(() => {
      try {
        const cur = player.currentTime ?? 0;
        const dur = player.duration ?? 0;
        if (dur > 0) {
          setProgress(cur / dur);
          setDuration(dur);
          setBuffering(false);
        }
      } catch { /* noop */ }
    }, 100);

    return () => clearInterval(progressInterval.current);
  }, [player, isActive, muteEmbeddedAudio]);

  const handleScrubTouch = (x: number) => {
    const pct = Math.max(0, Math.min(1, x / barWidth.current));
    setProgress(pct);
    if (player && duration > 0) {
      try { player.currentTime = pct * duration; } catch { /* noop */ }
    }
  };

  const formatTime = (sec: number) => {
    const m = Math.floor(sec / 60);
    const s = Math.floor(sec % 60);
    return `${m}:${s.toString().padStart(2, '0')}`;
  };

  return (
    <View style={StyleSheet.absoluteFillObject}>
      <VideoView
        player={player}
        style={StyleSheet.absoluteFillObject}
        // 9:16 (1080×1920) clips in tab feed cells are narrower than the video frame — `cover`
        // scales to height and crops left/right (burned-in captions bleed off). `contain` shows
        // the full frame with subtle letterboxing on `colors.media.videoCanvas`.
        contentFit="contain"
        nativeControls={false}
        {...(Platform.OS === 'android' ? { surfaceType: 'textureView' as const } : {})}
      />

      {gradeTint ? (
        <View
          pointerEvents="none"
          style={[StyleSheet.absoluteFillObject, { backgroundColor: gradeTint, zIndex: 2 }]}
        />
      ) : null}

      {buffering && isActive && !loadError && (
        <View style={styles.bufferingWrap}>
          <ActivityIndicator size="large" color={colors.feed.emptySubtext} />
        </View>
      )}

      {loadError && (
        <View style={styles.playbackErrorWrap} pointerEvents="none">
          <Ionicons name="alert-circle-outline" size={22} color={colors.feed.emptySubtext} />
          <Text style={styles.playbackErrorText}>Could not load this video (check Storage access).</Text>
        </View>
      )}

      <View
        ref={barRef}
        style={[
          styles.progressBarWrap,
          { bottom: progressBarBottom },
          scrubbing && styles.progressBarWrapActive,
        ]}
        onLayout={(e) => { barWidth.current = e.nativeEvent.layout.width - 24; }}
        onStartShouldSetResponder={() => true}
        onMoveShouldSetResponder={() => true}
        onResponderGrant={(e) => {
          setScrubbing(true);
          handleScrubTouch(e.nativeEvent.locationX - 12);
        }}
        onResponderMove={(e) => {
          handleScrubTouch(e.nativeEvent.locationX - 12);
        }}
        onResponderRelease={() => setScrubbing(false)}
        onResponderTerminate={() => setScrubbing(false)}
      >
        {scrubbing && duration > 0 && (
          <View style={styles.scrubTimeRow}>
            <Text style={styles.scrubTime}>{formatTime(progress * duration)}</Text>
            <Text style={styles.scrubTime}>{formatTime(duration)}</Text>
          </View>
        )}
        <View style={[styles.progressBarTrack, scrubbing && styles.progressBarTrackActive]}>
          <View style={[styles.progressBarFill, { width: `${progress * 100}%` }, scrubbing && styles.progressBarFillActive]} />
          {scrubbing && (
            <View style={[styles.scrubThumb, { left: `${progress * 100}%` }]} />
          )}
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    width: SCREEN_W,
    backgroundColor: colors.media.videoCanvas,
  },
  evidencePill: {
    position: 'absolute',
    top: 52,
    right: 86,
    zIndex: 6,
    maxWidth: SCREEN_W * 0.48,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 12,
    backgroundColor: 'rgba(0,0,0,0.58)',
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: 'rgba(255,255,255,0.2)',
  },
  evidenceText: {
    color: colors.onVideo.primary,
    fontSize: 11,
    fontWeight: '700',
  },
  /** Off-screen mini surface so some Android builds still decode audio for the attributed track. */
  attributedSoundHost: {
    position: 'absolute',
    left: -160,
    top: -160,
    width: 8,
    height: 8,
    opacity: 0,
    overflow: 'hidden',
  },
  attributedSoundView: {
    width: 8,
    height: 8,
  },
  bottomReadabilityVeil: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    height: '46%',
    zIndex: 2,
  },
  bg: {
    ...StyleSheet.absoluteFillObject,
  },
  textBg: {
    backgroundColor: colors.dark.bg,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 32,
  },
  textPostCaption: {
    color: colors.onVideo.primary,
    fontSize: 22,
    fontWeight: '700',
    lineHeight: 32,
    textAlign: 'center',
    textShadowColor: 'rgba(0,0,0,0.3)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 4,
    maxWidth: '85%',
  },
  videoMissingHint: {
    color: colors.feed.emptySubtext,
    fontSize: 13,
    fontWeight: '600',
    textAlign: 'center',
    marginBottom: 16,
    paddingHorizontal: 24,
    lineHeight: 18,
  },
  /**
   * On-video sticker line (post.videoOverlayText). Positioned a comfortable
   * distance above the action rail / caption strip and centered horizontally,
   * matching the editor's preview sticker so what creators see while composing
   * matches what viewers see on the feed.
   */
  videoOverlayWrap: {
    position: 'absolute',
    left: 16,
    right: 80,
    alignItems: 'center',
    zIndex: 5,
  },
  /** Padded translucent chip behind dragged-position overlays so any font/color
   *  combo stays readable against arbitrary video frames. The legacy centered
   *  variant uses `videoOverlayText` which already has its own background. */
  feedOverlayChip: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    backgroundColor: 'rgba(0,0,0,0.32)',
    borderRadius: 10,
    overflow: 'hidden',
  },
  videoOverlayText: {
    color: '#FFF',
    fontSize: 18,
    fontWeight: '900',
    textAlign: 'center',
    paddingHorizontal: 12,
    paddingVertical: 6,
    backgroundColor: 'rgba(0,0,0,0.32)',
    borderRadius: 10,
    overflow: 'hidden',
    textShadowColor: 'rgba(0,0,0,0.55)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 6,
    maxWidth: '100%',
  },
  confessionBg: {
    backgroundColor: colors.community?.confessions ?? colors.dark.cardAlt,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 0,
  },
  confessionEmoji: { fontSize: 120, opacity: 0.1 },

  carouselDots: {
    position: 'absolute',
    bottom: 100,
    left: 0,
    right: 0,
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 6,
    zIndex: 4,
  },
  carouselDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: 'rgba(255,255,255,0.35)',
  },
  carouselDotActive: {
    backgroundColor: colors.onVideo.primary,
    width: 14,
  },
  creatorMetaChips: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 5,
    marginBottom: 4,
    alignItems: 'center',
  },
  metaChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: borderRadius.chip,
    backgroundColor: 'rgba(0,0,0,0.45)',
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: 'rgba(255,255,255,0.18)',
    maxWidth: SCREEN_W * 0.7,
  },
  metaChipEmoji: {
    fontSize: 12,
  },
  metaChipText: {
    color: colors.onVideo.emphasis,
    fontSize: 11,
    fontWeight: '700',
    textShadowColor: 'rgba(0,0,0,0.35)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 3,
  },
  seriesNextRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    alignSelf: 'flex-start',
    marginBottom: 6,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: borderRadius.chip,
    backgroundColor: 'rgba(0,0,0,0.4)',
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: 'rgba(255,255,255,0.2)',
  },
  seriesNextText: {
    fontSize: 11,
    fontWeight: '800',
    color: colors.onVideo.emphasis,
    maxWidth: SCREEN_W * 0.62,
  },

  content: {
    position: 'absolute',
    bottom: 88,
    left: 14,
    right: 76,
    zIndex: 5,
  },
  identityBlock: {
    marginBottom: 4,
    alignSelf: 'flex-start',
    maxWidth: '100%',
  },
  identityPress: {
    flexShrink: 0,
  },
  nameLine: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    gap: 5,
    maxWidth: '100%',
  },
  feedNeonPills: {
    marginTop: 0,
    marginBottom: 0,
    flexShrink: 1,
    maxWidth: '100%',
  },
  creatorIdentity: {
    fontSize: 13,
    fontWeight: '800',
    color: pulseColors.text,
    letterSpacing: 0.1,
    textShadowColor: 'rgba(0,0,0,0.55)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 8,
    flexShrink: 0,
  },
  circleChip: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    gap: 5,
    maxWidth: SCREEN_W * 0.72,
    marginBottom: 8,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: pulseRadius.full,
    backgroundColor: 'rgba(15, 28, 48, 0.72)',
    borderWidth: 1,
    borderColor: pulseColors.borderAccent,
  },
  circleChipText: {
    flexShrink: 1,
    fontSize: 11,
    fontWeight: '700',
    color: pulseColors.textSecondary,
    letterSpacing: 0.15,
  },
  liveSourceChip: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    gap: 5,
    maxWidth: SCREEN_W * 0.72,
    marginBottom: 8,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: pulseRadius.full,
    backgroundColor: 'rgba(15, 28, 48, 0.72)',
    borderWidth: 1,
    borderColor: 'rgba(255, 71, 87, 0.35)',
  },
  liveSourceChipText: {
    flexShrink: 1,
    fontSize: 11,
    fontWeight: '700',
    color: pulseColors.textSecondary,
    letterSpacing: 0.15,
  },
  anonRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 8,
  },
  anonLabel: {
    color: colors.onVideo.emphasis,
    fontSize: 14,
    fontWeight: '600',
    textShadowColor: 'rgba(0,0,0,0.4)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 4,
  },
  caption: {
    color: colors.onVideo.primary,
    marginTop: 2,
    marginBottom: 2,
    textShadowColor: 'rgba(0,0,0,0.5)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 6,
  },
  soundRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 6,
  },
  soundTitle: {
    color: colors.onVideo.emphasis,
    flex: 1,
    textShadowColor: 'rgba(0,0,0,0.45)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 4,
  },
  tagRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    marginBottom: 2,
  },
  hashtag: {
    color: colors.onVideo.tag,
  },
  footerMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
    gap: 8,
    marginTop: 2,
  },
  footerSpacer: { flex: 1 },
  viewCount: {
    color: pulseColors.textQuiet,
  },

  bufferingWrap: {
    ...StyleSheet.absoluteFillObject,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 3,
  },
  playbackErrorWrap: {
    ...StyleSheet.absoluteFillObject,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 4,
    paddingHorizontal: 40,
    gap: 8,
  },
  playbackErrorText: {
    color: colors.feed.emptySubtext,
    fontSize: 13,
    fontWeight: '600',
    textAlign: 'center',
    lineHeight: 18,
  },

  // Progress bar — positioned above content area, always visible
  progressBarWrap: {
    position: 'absolute',
    bottom: 82,
    left: 0,
    right: 0,
    zIndex: 25,
    paddingTop: SCRUB_HIT_SLOP,
    paddingBottom: 8,
  },
  progressBarWrapActive: {
    paddingTop: 0,
    paddingBottom: 6,
    backgroundColor: colors.glass.progressScrim,
  },
  progressBarTrack: {
    height: 3,
    backgroundColor: colors.onVideo.progressTrack,
    marginHorizontal: 12,
    borderRadius: 2,
    overflow: 'visible',
  },
  progressBarTrackActive: {
    height: 8,
    borderRadius: 4,
  },
  progressBarFill: {
    height: 3,
    backgroundColor: colors.onVideo.progressFill,
    borderRadius: 2,
  },
  progressBarFillActive: {
    height: 8,
    backgroundColor: colors.primary.teal,
    borderRadius: 4,
  },
  scrubThumb: {
    position: 'absolute',
    top: -6,
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: colors.onVideo.primary,
    marginLeft: -10,
    borderWidth: 2.5,
    borderColor: colors.primary.teal,
    elevation: 4,
  },
  scrubTimeRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingBottom: 6,
    paddingTop: 10,
  },
  scrubTime: {
    color: colors.onVideo.primary,
    fontSize: 12,
    fontWeight: '800',
    textShadowColor: 'rgba(0,0,0,0.6)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 4,
  },
  speedOverlay: {
    position: 'absolute',
    top: 100,
    left: 0,
    right: 0,
    alignItems: 'center',
    zIndex: 15,
  },
  speedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: colors.glass.heavy,
    paddingHorizontal: spacing.lg,
    paddingVertical: 8,
    borderRadius: 20,
  },
  speedText: {
    color: colors.onVideo.primary,
    fontSize: 16,
    fontWeight: '800',
  },

  mediaProcessingFailedBanner: {
    position: 'absolute',
    left: spacing.md,
    right: spacing.md,
    zIndex: 20,
    backgroundColor: 'rgba(153,27,27,0.92)',
    paddingHorizontal: spacing.md,
    paddingVertical: 10,
    borderRadius: borderRadius.md,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.22)',
  },
  mediaProcessingFailedText: {
    color: '#FFF',
    fontSize: 13,
    fontWeight: '800',
    textAlign: 'center',
    lineHeight: 18,
  },

  // Pause/play overlay
  pauseOverlay: {
    ...StyleSheet.absoluteFillObject,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 2,
  },
  pauseCircle: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: colors.glass.progressScrim,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
