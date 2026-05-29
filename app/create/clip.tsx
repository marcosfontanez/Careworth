import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  View,
  Text,
  TextInput,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Switch,
  Pressable,
} from 'react-native';
import Slider from '@react-native-community/slider';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { openMyPulse } from '@/lib/navigation/pulsePageRoutes';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { VideoView, useVideoPlayer } from 'expo-video';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '@/contexts/AuthContext';
import { usePost } from '@/hooks/useQueries';
import { useFeatureFlags } from '@/lib/featureFlags';
import { useAppStore } from '@/store/useAppStore';
import { canClipFeedPost, canDownloadFeedPost } from '@/lib/feedClipPermissions';
import {
  FEED_CLIP_MAX_SECONDS,
  FEED_CLIP_MIN_SECONDS,
  validateFeedClipRange,
} from '@/lib/feedClipValidation';
import { feedClipCreatorAttribution } from '@/lib/feedClipPublish';
import { feedClipsService } from '@/services/supabase/feedClips';
import { waitForCreatorMediaJob } from '@/services/supabase/creatorMediaJobs';
import { shareToMyPulseAsClip } from '@/lib/share';
import { shareDownloadedPostMedia } from '@/lib/postMediaActions';
import { withLinkedCommunityMeta } from '@/lib/postLinkedCommunityMeta';
import { patchPostLinkedCommunityMeta } from '@/lib/postLinkedCommunityCache';
import { invalidatePostRelatedQueries } from '@/lib/invalidatePostQueries';
import { queryClient } from '@/lib/queryClient';
import { profileUpdateKeys } from '@/lib/queryKeys';
import { liveStreamHref } from '@/lib/navigation/liveRoutes';
import { WaveformTimeline } from '@/components/create/WaveformTimeline';
import { VideoCirclePicker } from '@/components/create/VideoCirclePicker';
import { FeedClipSuccessSheet } from '@/components/create/FeedClipSuccessSheet';
import { PulseButton } from '@/components/ui/pulse/PulseButton';
import { StackScreenHeader } from '@/components/ui/StackScreenHeader';
import { useToast } from '@/components/ui/Toast';
import { pulseColors, pulseGradients, pulseRadius, pulseSpacing, pulseTypography } from '@/lib/theme/pulseTheme';
import type { Community } from '@/types';

const DEFAULT_DURATION = 30;

export default function FeedClipComposerScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const toast = useToast();
  const { user } = useAuth();
  const feedClipping = useFeatureFlags((s) => s.feedClipping);
  const followedCreatorIds = useAppStore((s) => s.followedCreatorIds);
  const { sourcePostId: sourcePostIdParam } = useLocalSearchParams<{ sourcePostId?: string }>();
  const sourcePostId = typeof sourcePostIdParam === 'string' ? sourcePostIdParam.trim() : '';

  const { data: sourcePost, isPending, isError } = usePost(sourcePostId, { enabled: Boolean(sourcePostId) });

  const permission = useMemo(() => {
    if (!sourcePost) return null;
    return canClipFeedPost(sourcePost, user, {
      feedClippingEnabled: feedClipping,
      viewerFollowsCreator: followedCreatorIds.has(sourcePost.creatorId),
    });
  }, [sourcePost, user, feedClipping, followedCreatorIds]);

  const videoUri = sourcePost?.mediaUrl?.trim() || sourcePost?.thumbnailUrl?.trim() || '';
  const player = useVideoPlayer(videoUri || null, (p) => {
    p.loop = false;
    p.muted = false;
  });

  const [durationSec, setDurationSec] = useState<number>(DEFAULT_DURATION);
  const [trimStart, setTrimStart] = useState(0);
  const [trimEnd, setTrimEnd] = useState(DEFAULT_DURATION);
  const [caption, setCaption] = useState('');
  const [phiAck, setPhiAck] = useState(false);
  const [selectedCircle, setSelectedCircle] = useState<Community | null>(null);
  const [pinToMyPulse, setPinToMyPulse] = useState(false);
  const [publishing, setPublishing] = useState(false);
  const [publishSuccess, setPublishSuccess] = useState<{
    postId: string;
    jobId: string;
    processing: boolean;
    processingSlow: boolean;
    processingFailed: boolean;
  } | null>(null);

  useEffect(() => {
    if (!player) return;
    const sub = player.addListener('statusChange', (ev) => {
      const d = ev.status === 'readyToPlay' ? player.duration : null;
      if (d != null && Number.isFinite(d) && d > 0) {
        setDurationSec(d);
        setTrimEnd((prev) => (prev > d ? d : prev));
      }
    });
    return () => sub.remove();
  }, [player]);

  useEffect(() => {
    if (durationSec <= 0) return;
    const end = Math.min(durationSec, Math.max(trimStart + FEED_CLIP_MIN_SECONDS, trimEnd));
    if (end !== trimEnd) setTrimEnd(end);
  }, [durationSec, trimStart, trimEnd]);

  const clipValidation = useMemo(
    () => validateFeedClipRange(trimStart, trimEnd, durationSec),
    [trimStart, trimEnd, durationSec],
  );

  const attribution = sourcePost ? feedClipCreatorAttribution(sourcePost.creator) : '';
  const canDownload = sourcePost ? canDownloadFeedPost(sourcePost, user) : false;

  const previewClip = useCallback(() => {
    if (!player || !clipValidation.ok) return;
    player.currentTime = trimStart;
    player.play();
    const ms = Math.max(500, (trimEnd - trimStart) * 1000);
    const t = setTimeout(() => {
      player.pause();
      player.currentTime = trimStart;
    }, ms);
    return () => clearTimeout(t);
  }, [player, trimStart, trimEnd, clipValidation.ok]);

  const handlePublish = async () => {
    if (!user?.id || !sourcePost || !clipValidation.ok) return;
    if (!phiAck) {
      toast.show('Confirm PHI safety before publishing.', 'info');
      return;
    }
    setPublishing(true);
    try {
      const result = await feedClipsService.publish({
        userId: user.id,
        sourcePost,
        trimStartSec: trimStart,
        trimEndSec: trimEnd,
        caption,
        hashtags: [],
        communityId: selectedCircle?.id ?? null,
        phiAcknowledged: phiAck,
      });
      if (!result.ok) {
        toast.show(result.message ?? 'Could not publish clip.', 'error');
        return;
      }

      const enriched = withLinkedCommunityMeta(
        { ...sourcePost, id: result.postId, creatorId: user.id } as any,
        selectedCircle,
      );
      if (selectedCircle) {
        patchPostLinkedCommunityMeta(result.postId, {
          name: selectedCircle.name,
          slug: selectedCircle.slug,
        });
      }
      void enriched;

      if (pinToMyPulse) {
        try {
          const clipPostForPulse = {
            ...sourcePost,
            id: result.postId,
            creatorId: user.id,
            caption: caption.trim() || feedClipCreatorAttribution(sourcePost.creator),
          };
          await shareToMyPulseAsClip(clipPostForPulse, {
            queryClient,
            circleSlug: selectedCircle?.slug,
          });
          queryClient.invalidateQueries({ queryKey: profileUpdateKeys.forUser(user.id) });
        } catch {
          toast.show('Clip queued, but My Pulse pin failed.', 'info');
        }
      }

      await invalidatePostRelatedQueries(queryClient, { creatorId: user.id });
      setPublishSuccess({
        postId: result.postId,
        jobId: result.jobId,
        processing: true,
        processingSlow: false,
        processingFailed: false,
      });
    } finally {
      setPublishing(false);
    }
  };

  useEffect(() => {
    const success = publishSuccess;
    if (!success?.processing || !success.jobId || !user?.id) return;

    let cancelled = false;
    void (async () => {
      try {
        const job = await waitForCreatorMediaJob(success.jobId, { timeoutMs: 120_000, intervalMs: 2000 });
        if (cancelled) return;
        if (job.status === 'succeeded') {
          setPublishSuccess((prev) =>
            prev
              ? { ...prev, processing: false, processingSlow: false, processingFailed: false }
              : null,
          );
          await invalidatePostRelatedQueries(queryClient, {
            creatorId: user.id,
          });
          return;
        }
        setPublishSuccess((prev) =>
          prev ? { ...prev, processing: false, processingSlow: false, processingFailed: true } : null,
        );
      } catch {
        if (cancelled) return;
        setPublishSuccess((prev) => (prev ? { ...prev, processingSlow: true } : null));
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [publishSuccess?.jobId, publishSuccess?.processing, user?.id, queryClient]);

  if (!feedClipping) {
    return (
      <View style={styles.root}>
        <StackScreenHeader insetTop={insets.top} title="Clip video" onPressLeft={() => router.back()} />
        <Text style={styles.blocked}>Feed clipping is turned off.</Text>
      </View>
    );
  }

  if (!sourcePostId || isError) {
    return (
      <View style={styles.root}>
        <StackScreenHeader insetTop={insets.top} title="Clip video" onPressLeft={() => router.back()} />
        <Text style={styles.blocked}>Could not load this video.</Text>
      </View>
    );
  }

  if (isPending || !sourcePost) {
    return (
      <View style={[styles.root, styles.centered]}>
        <ActivityIndicator color={pulseColors.teal} />
      </View>
    );
  }

  if (permission && !permission.allowed) {
    return (
      <View style={styles.root}>
        <StackScreenHeader insetTop={insets.top} title="Clip video" onPressLeft={() => router.back()} />
        <Text style={styles.blocked}>{permission.message}</Text>
      </View>
    );
  }

  const minEnd = trimStart + FEED_CLIP_MIN_SECONDS;
  const maxEnd = Math.min(durationSec, trimStart + FEED_CLIP_MAX_SECONDS);

  return (
    <KeyboardAvoidingView
      style={styles.root}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <LinearGradient colors={[...pulseGradients.screen]} style={StyleSheet.absoluteFill} />
      <StackScreenHeader insetTop={insets.top} title="Clip video" onPressLeft={() => router.back()} />

      <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
        <View style={styles.previewWrap}>
          {videoUri ? (
            <VideoView player={player} style={styles.preview} contentFit="contain" nativeControls />
          ) : (
            <View style={[styles.preview, styles.previewFallback]} />
          )}
        </View>

        <Text style={styles.attribution}>{attribution}</Text>
        {sourcePost.sourceLiveStreamId ? (
          <Text style={styles.liveHint}>Includes Live attribution on publish.</Text>
        ) : null}

        <WaveformTimeline
          uri={videoUri}
          durationSec={durationSec}
          trimStart={trimStart}
          trimEnd={trimEnd}
        />

        <Text style={styles.rangeMeta}>
          {clipValidation.ok
            ? `${clipValidation.durationSec.toFixed(1)}s clip · ${trimStart.toFixed(1)}s → ${trimEnd.toFixed(1)}s`
            : clipValidation.message}
        </Text>

        <Text style={styles.label}>Start</Text>
        <Slider
          style={styles.slider}
          minimumValue={0}
          maximumValue={Math.max(0, durationSec - FEED_CLIP_MIN_SECONDS)}
          value={trimStart}
          onValueChange={(v) => {
            const nextStart = Math.min(v, trimEnd - FEED_CLIP_MIN_SECONDS);
            setTrimStart(Math.max(0, nextStart));
          }}
          minimumTrackTintColor={pulseColors.teal}
          maximumTrackTintColor={pulseColors.border}
          thumbTintColor={pulseColors.teal}
        />

        <Text style={styles.label}>End</Text>
        <Slider
          style={styles.slider}
          minimumValue={minEnd}
          maximumValue={maxEnd}
          value={Math.min(trimEnd, maxEnd)}
          onValueChange={(v) => setTrimEnd(Math.max(minEnd, Math.min(v, maxEnd)))}
          minimumTrackTintColor={pulseColors.teal}
          maximumTrackTintColor={pulseColors.border}
          thumbTintColor={pulseColors.teal}
        />

        <PulseButton label="Preview clip" onPress={() => previewClip()} variant="secondary" fullWidth />

        <TextInput
          style={styles.captionInput}
          placeholder="Add a caption (optional)"
          placeholderTextColor={pulseColors.textQuiet}
          value={caption}
          onChangeText={setCaption}
          multiline
          maxLength={500}
        />

        <VideoCirclePicker
          selectedCommunityId={selectedCircle?.id ?? null}
          onSelect={setSelectedCircle}
          disabled={publishing}
        />

        <View style={styles.toggleRow}>
          <Text style={styles.toggleLabel}>Also pin to My Pulse</Text>
          <Switch
            value={pinToMyPulse}
            onValueChange={setPinToMyPulse}
            trackColor={{ false: pulseColors.border, true: pulseColors.teal }}
          />
        </View>

        <Pressable style={styles.phiRow} onPress={() => setPhiAck((v) => !v)}>
          <Ionicons
            name={phiAck ? 'checkbox' : 'square-outline'}
            size={20}
            color={phiAck ? pulseColors.teal : pulseColors.mutedText}
          />
          <Text style={styles.phiText}>
            I confirm this clip does not contain patient identifiers (PHI).
          </Text>
        </Pressable>

        <View style={styles.actions}>
          <PulseButton
            label={publishing ? 'Publishing…' : 'Publish clip to Feed'}
            onPress={() => void handlePublish()}
            disabled={publishing || !clipValidation.ok || !phiAck}
            fullWidth
          />
          {canDownload ? (
            <PulseButton
              label="Download source video"
              variant="ghost"
              onPress={() => void shareDownloadedPostMedia(sourcePost)}
              fullWidth
            />
          ) : null}
          <PulseButton label="Cancel" variant="ghost" onPress={() => router.back()} fullWidth />
        </View>
      </ScrollView>

      <FeedClipSuccessSheet
        visible={publishSuccess != null}
        processing={publishSuccess?.processing ?? true}
        processingSlow={publishSuccess?.processingSlow ?? false}
        processingFailed={publishSuccess?.processingFailed ?? false}
        pinnedToMyPulse={pinToMyPulse}
        circleName={selectedCircle?.name ?? null}
        sourceLiveStreamId={sourcePost.sourceLiveStreamId ?? null}
        onViewFeed={() => {
          const id = publishSuccess?.postId;
          setPublishSuccess(null);
          if (id) router.replace(`/feed/${id}` as never);
          else router.replace('/(tabs)/feed');
        }}
        onViewMyPulse={
          pinToMyPulse && user?.id
            ? () => {
                setPublishSuccess(null);
                openMyPulse(router, { replace: true });
              }
            : undefined
        }
        onOpenCircle={
          selectedCircle?.slug
            ? () => {
                setPublishSuccess(null);
                router.replace(`/communities/${selectedCircle.slug}` as never);
              }
            : undefined
        }
        onOpenSourceLive={
          sourcePost.sourceLiveStreamId
            ? () => {
                setPublishSuccess(null);
                router.push(liveStreamHref(sourcePost.sourceLiveStreamId!));
              }
            : undefined
        }
        onClipAnother={() => {
          setPublishSuccess(null);
          setCaption('');
          setPhiAck(false);
          setPinToMyPulse(false);
          setSelectedCircle(null);
        }}
        onClose={() => {
          setPublishSuccess(null);
          router.back();
        }}
      />
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  centered: { alignItems: 'center', justifyContent: 'center' },
  scroll: { padding: pulseSpacing.lg, gap: pulseSpacing.md, paddingBottom: 48 },
  blocked: {
    ...pulseTypography.body,
    color: pulseColors.mutedText,
    padding: pulseSpacing.xl,
    textAlign: 'center',
  },
  previewWrap: {
    borderRadius: pulseRadius.lg,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: pulseColors.borderAccent,
    backgroundColor: pulseColors.glass,
  },
  preview: { width: '100%', aspectRatio: 9 / 16, maxHeight: 360, backgroundColor: '#000' },
  previewFallback: { backgroundColor: pulseColors.glassStrong },
  attribution: {
    ...pulseTypography.caption,
    fontWeight: '700',
    color: pulseColors.teal,
    textAlign: 'center',
  },
  liveHint: {
    ...pulseTypography.caption,
    color: pulseColors.mutedText,
    textAlign: 'center',
  },
  rangeMeta: {
    ...pulseTypography.bodySmall,
    color: pulseColors.mutedText,
    textAlign: 'center',
  },
  label: { ...pulseTypography.caption, fontWeight: '700', color: pulseColors.textSecondary },
  slider: { width: '100%', height: 36 },
  captionInput: {
    ...pulseTypography.body,
    minHeight: 72,
    padding: pulseSpacing.md,
    borderRadius: pulseRadius.lg,
    borderWidth: 1,
    borderColor: pulseColors.border,
    backgroundColor: pulseColors.glass,
    color: pulseColors.text,
    textAlignVertical: 'top',
  },
  toggleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: pulseSpacing.sm,
  },
  toggleLabel: { ...pulseTypography.bodySmall, color: pulseColors.text },
  phiRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: pulseSpacing.sm,
    paddingVertical: pulseSpacing.sm,
  },
  phiText: {
    ...pulseTypography.bodySmall,
    color: pulseColors.mutedText,
    flex: 1,
  },
  actions: { gap: pulseSpacing.sm, marginTop: pulseSpacing.sm },
});
