import React, { useState, useCallback, useRef, useEffect, useMemo, memo } from 'react';
import {
  View, Text, StyleSheet, Dimensions, TouchableOpacity, Platform,
  Pressable, ActivityIndicator, Linking,
} from 'react-native';
import { Image } from 'expo-image';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { GradientOverlay } from '@/components/ui/GradientOverlay';
import { RoleBadge } from '@/components/ui/RoleBadge';
import { SpecialtyBadge } from '@/components/ui/SpecialtyBadge';
import { PulseTierBadge } from '@/components/badges/PulseTierBadge';
import { HeartBurst } from '@/components/ui/SuccessAnimation';
import { SponsoredBadge } from './SponsoredBadge';
import { FeedActionRail } from './FeedActionRail';
import { FeedOriginalSound } from './FeedOriginalSound';
import { formatCount } from '@/utils/format';
import { colors, typography, borderRadius, spacing } from '@/theme';
import { CaptionWithMentions } from '@/components/ui/CaptionWithMentions';
import { profileHandleLineForCreator } from '@/utils/profileHandle';
import { useFeatureFlags } from '@/lib/featureFlags';
import type { Post } from '@/types';
import { VideoView, useVideoPlayer } from 'expo-video';
import { useEventListener } from 'expo';
import { trySignedUrlFromPostMediaPublicUrl, avatarThumb } from '@/lib/storage';
import { usePost } from '@/hooks/useQueries';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { DuetParentPreview } from '@/components/feed/DuetParentPreview';

const { width: SCREEN_W, height: SCREEN_H } = Dimensions.get('window');
const PROGRESS_BAR_HEIGHT = 3;
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
}

function VideoFeedPostInner({
  post, viewportHeight, isActive, isLiked, isSaved, isFollowing,
  onLike, onComment, onSave, onShare, onFollow, onProfile,
  onCommunity, onHashtag, onReport, onLongPress,
}: Props) {
  const insets = useSafeAreaInsets();
  const pageH = viewportHeight ?? SCREEN_H;
  /** Tab feed cells are shorter than full window; smaller `bottom` insets keep chrome near the cell bottom. */
  const tabFeedEmbedded = viewportHeight != null;
  const chromeBottom = tabFeedEmbedded
    ? { content: 16, progress: 10, rail: 20 }
    : { content: 88, progress: 82, rail: 112 };
  const isAnon = post.isAnonymous;
  const sponsoredPostsEnabled = useFeatureFlags((s) => s.sponsoredPosts);
  const [localPaused, setLocalPaused] = useState(false);
  const [showHeart, setShowHeart] = useState(false);
  const [showPauseIcon, setShowPauseIcon] = useState(false);
  const lastTap = useRef(0);
  const pauseTimer = useRef<ReturnType<typeof setTimeout>>(undefined);
  const videoUri = post.mediaUrl?.trim() ?? '';
  const hasVideo = post.type === 'video' && videoUri.length > 0;

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

  return (
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
      {duetParentId ? <DuetParentPreview parentPostId={duetParentId} pageHeight={pageH} /> : null}

      {post.evidenceUrl?.trim() ? (
        <TouchableOpacity
          style={styles.evidencePill}
          activeOpacity={0.85}
          onPress={() => {
            const u = post.evidenceUrl!.trim();
            void Linking.openURL(u.startsWith('http') ? u : `https://${u}`);
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
            key={videoUri}
            uri={videoUri}
            paused={paused}
            isActive={isActive}
            muteEmbeddedAudio={useAttributedSoundPip}
            speedUp={speedUp}
            progressBarBottom={chromeBottom.progress}
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
        </>
      ) : post.thumbnailUrl || (post.type === 'image' && post.mediaUrl) ? (
        <Image source={{ uri: post.thumbnailUrl || post.mediaUrl }} style={styles.bg} contentFit="cover" />
      ) : (
        <View style={[styles.bg, styles.textBg]}>
          {post.type === 'video' && !videoUri ? (
            <Text style={styles.videoMissingHint}>Video link missing — re-upload from Create, or check Storage (post-media) is public.</Text>
          ) : null}
          <CaptionWithMentions text={post.caption} style={styles.textPostCaption} />
        </View>
      )}

      <HeartBurst visible={showHeart} />

      <GradientOverlay position="top" intensity="light" />
      <GradientOverlay position="bottom" intensity="heavy" />

      <FeedActionRail
        post={post}
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
        onReport={onReport}
        videoSoundSlot={
          hasVideo ? <FeedOriginalSound post={post} isSoundCellActive={isActive} /> : undefined
        }
      />

      <View style={[styles.content, { bottom: chromeBottom.content }]}>
        {sponsoredPostsEnabled && post.isSponsored && post.sponsorInfo && (
          <SponsoredBadge sponsor={post.sponsorInfo} />
        )}

        {!isAnon && (
          <View style={styles.identityRow}>
            <TouchableOpacity onPress={onProfile} activeOpacity={0.85} style={styles.avatarTouch}>
              <Image source={{ uri: avatarThumb(post.creator.avatarUrl, 36) }} style={styles.creatorAvatar} />
            </TouchableOpacity>
            <View style={styles.identityText}>
              <View style={styles.nameLine}>
                <TouchableOpacity onPress={onProfile} activeOpacity={0.85}>
                  <Text style={[styles.displayName, typography.creatorName]} numberOfLines={1}>
                    {post.creator.displayName}
                  </Text>
                </TouchableOpacity>
                {post.creator.isVerified && (
                  <Ionicons name="checkmark-circle" size={14} color={colors.primary.teal} />
                )}
              </View>
              <Text style={styles.creatorHandle} numberOfLines={1}>
                {profileHandleLineForCreator(post.creator)}
              </Text>
              <View style={styles.badgeRow}>
                <RoleBadge role={post.creator.role} variant="overlay" />
                {post.creator.specialty ? <SpecialtyBadge specialty={post.creator.specialty} /> : null}
                <PulseTierBadge
                  tier={post.creator.pulseTier ?? null}
                  size="xs"
                  hideMurmur
                />
              </View>
              {[post.creator.city, post.creator.state].filter(Boolean).length > 0 ? (
                <Text style={[styles.location, typography.overlayQuiet]} numberOfLines={1}>
                  {[post.creator.city, post.creator.state].filter(Boolean).join(', ')}
                </Text>
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

        <CaptionWithMentions
          text={post.caption}
          style={[styles.caption, typography.captionOverlay]}
          numberOfLines={3}
        />

        {post.soundTitle && !hasVideo ? (
          <View style={styles.soundRow}>
            <Ionicons name="musical-notes" size={14} color={colors.primary.gold} />
            <Text style={[styles.soundTitle, typography.overlayMicro]} numberOfLines={1}>
              {post.soundTitle}
            </Text>
          </View>
        ) : null}

        {post.hashtags.length > 0 && (
          <View style={styles.tagRow}>
            {post.hashtags.slice(0, 2).map((tag) => (
              <TouchableOpacity key={tag} onPress={() => onHashtag?.(tag)} activeOpacity={0.7}>
                <Text style={[styles.hashtag, typography.overlayMicro]}>#{tag}</Text>
              </TouchableOpacity>
            ))}
          </View>
        )}

        <View style={styles.footerMeta}>
          {post.communities.length > 0 ? (
            <TouchableOpacity
              style={styles.communityPill}
              onPress={() => onCommunity?.(post.communities[0])}
              activeOpacity={0.7}
            >
              <Text style={styles.communityText}>Circle</Text>
            </TouchableOpacity>
          ) : (
            <View />
          )}
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
}

/** Ignore unstable callback identities; compare only fields that affect the cell UI. */
function videoFeedPostPropsEqual(prev: Props, next: Props): boolean {
  if (prev.isActive !== next.isActive) return false;
  if (prev.isLiked !== next.isLiked) return false;
  if (prev.isSaved !== next.isSaved) return false;
  if (prev.isFollowing !== next.isFollowing) return false;
  if (prev.viewportHeight !== next.viewportHeight) return false;

  const p = prev.post;
  const n = next.post;
  if (p === n) return true;
  if (p.id !== n.id || p.creatorId !== n.creatorId) return false;

  const pc = p.creator;
  const nc = n.creator;
  if (
    pc.displayName !== nc.displayName ||
    pc.username !== nc.username ||
    pc.avatarUrl !== nc.avatarUrl ||
    pc.role !== nc.role ||
    pc.specialty !== nc.specialty ||
    pc.city !== nc.city ||
    pc.state !== nc.state ||
    pc.isVerified !== nc.isVerified
  ) {
    return false;
  }

  if (
    p.type !== n.type ||
    p.caption !== n.caption ||
    p.mediaUrl !== n.mediaUrl ||
    p.thumbnailUrl !== n.thumbnailUrl ||
    p.audioReference !== n.audioReference ||
    p.soundTitle !== n.soundTitle ||
    p.soundSourcePostId !== n.soundSourcePostId ||
    p.soundSourceMediaUrl !== n.soundSourceMediaUrl ||
    p.isAnonymous !== n.isAnonymous ||
    p.isSponsored !== n.isSponsored ||
    p.likeCount !== n.likeCount ||
    p.commentCount !== n.commentCount ||
    p.shareCount !== n.shareCount ||
    p.viewCount !== n.viewCount ||
    p.saveCount !== n.saveCount
  ) {
    return false;
  }

  const ph = p.hashtags.join('\u0001');
  const nh = n.hashtags.join('\u0001');
  if (ph !== nh) return false;
  const pco = p.communities.join('\u0001');
  const nco = n.communities.join('\u0001');
  if (pco !== nco) return false;

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
  const sourcePhase = useRef<'public' | 'signed'>('public');
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
    if (publicFallbackInFlight.current) return;
    publicFallbackInFlight.current = true;
    void trySignedUrlFromPostMediaPublicUrl(publicUri).then((signed) => {
      publicFallbackInFlight.current = false;
      if (signed) {
        sourcePhase.current = 'signed';
        setFallbackUri(signed);
      } else {
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
}: {
  uri: string;
  paused: boolean;
  isActive: boolean;
  /** When true, silence the clip’s own track so the attributed sound player can be heard. */
  muteEmbeddedAudio?: boolean;
  speedUp?: boolean;
  progressBarBottom?: number;
}) {
  const [fallbackUri, setFallbackUri] = useState<string | null>(null);
  const [loadError, setLoadError] = useState(false);
  const sourcePhase = useRef<'public' | 'signed'>('public');
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
    if (publicFallbackInFlight.current) return;
    publicFallbackInFlight.current = true;
    void trySignedUrlFromPostMediaPublicUrl(uri).then((signed) => {
      publicFallbackInFlight.current = false;
      if (signed) {
        sourcePhase.current = 'signed';
        setFallbackUri(signed);
      } else {
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
        contentFit="cover"
        nativeControls={false}
        {...(Platform.OS === 'android' ? { surfaceType: 'textureView' as const } : {})}
      />

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
  confessionBg: {
    backgroundColor: colors.community?.confessions ?? colors.dark.cardAlt,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 0,
  },
  confessionEmoji: { fontSize: 120, opacity: 0.1 },

  content: {
    position: 'absolute',
    bottom: 88,
    left: 14,
    right: 72,
    zIndex: 5,
  },
  identityRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
    marginBottom: 8,
  },
  avatarTouch: { borderRadius: 18 },
  creatorAvatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
    borderWidth: 1.5,
    borderColor: colors.onVideo.borderAvatar,
    backgroundColor: colors.glass.sm,
  },
  identityText: { flex: 1, minWidth: 0 },
  nameLine: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    marginBottom: 2,
  },
  creatorHandle: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.onVideo.mutedStrong,
    marginBottom: 6,
    textShadowColor: 'rgba(0,0,0,0.45)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 6,
  },
  badgeRow: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: 5 },
  displayName: {
    color: colors.onVideo.primary,
    flexShrink: 1,
    textShadowColor: 'rgba(0,0,0,0.5)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 8,
  },
  location: {
    color: colors.onVideo.soft,
    marginTop: 4,
    textShadowColor: 'rgba(0,0,0,0.35)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 4,
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
    marginBottom: 4,
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
    gap: 8,
    marginBottom: 6,
  },
  hashtag: {
    color: colors.onVideo.tag,
  },
  footerMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
    marginTop: 2,
  },
  communityPill: {
    backgroundColor: colors.glass.sm,
    paddingHorizontal: 9,
    paddingVertical: 4,
    borderRadius: borderRadius.chip,
    borderWidth: 1,
    borderColor: colors.onVideo.borderSoft,
  },
  communityText: {
    color: colors.onVideo.live,
    fontSize: 10,
    fontWeight: '600',
    letterSpacing: 0.2,
  },
  viewCount: {
    color: colors.onVideo.muted,
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
