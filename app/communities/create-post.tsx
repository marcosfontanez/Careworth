import React, { useEffect, useMemo, useState, useRef, useCallback } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet,
  ScrollView, ActivityIndicator, KeyboardAvoidingView, Platform,
} from 'react-native';
import { Image } from 'expo-image';
import { VideoView, useVideoPlayer } from 'expo-video';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import * as Haptics from 'expo-haptics';
import * as ImagePicker from 'expo-image-picker';
import { useQuery } from '@tanstack/react-query';
import { colors, borderRadius } from '@/theme';
import { pulseImageFeedHeroProps } from '@/lib/pulseImage';
import { useAuth } from '@/contexts/AuthContext';
import { useAppStore } from '@/store/useAppStore';
import { storageService } from '@/lib/storage';
import { postsService, communitiesService } from '@/services/supabase';
import { looksLikeRlsPolicyDenial } from '@/services/supabase/posts';
import { profileUpdatesService } from '@/services/profileUpdates';
import { circleContentService } from '@/services/circleContent';
import { queryClient } from '@/lib/queryClient';
import { invalidatePostRelatedQueries } from '@/lib/invalidatePostQueries';
import { communityKeys, circleContentKeys, profileUpdateKeys } from '@/lib/queryKeys';
import { useToast } from '@/components/ui/Toast';
import { SuccessAnimation } from '@/components/ui/SuccessAnimation';
import { clearDraft } from '@/lib/drafts';
import { getCircleAccent } from '@/lib/circleAccents';
import {
  CirclePostTypeChips,
  type CirclePostType,
} from '@/components/circles/CirclePostTypeChips';
import {
  CircleSettingsCard,
  type CirclePostSettings,
} from '@/components/circles/CircleSettingsCard';
import { CircleContextFooter } from '@/components/circles/CircleContextFooter';
import { CircleComposerFlairPicker } from '@/components/circles/CircleComposerFlairPicker';
import { AccentComposerFrame, AccentCharCount } from '@/components/ui/AccentComposerFrame';
import { resolveThreadCreateFlair, type CircleFlairTag } from '@/lib/circleFlairs';
import { PHIGuardrailBanner } from '@/components/create/PHIGuardrailBanner';
import { checkRateLimit } from '@/lib/rateLimit';
import { scanForPhi, highestSeverity } from '@/lib/phiGuardrail';
import { isAnonymousConfessionCircle, CONFESSIONS_BETA_DISCLOSURE } from '@/lib/anonymousCircle';
import { clampVideoOverlayText, VIDEO_OVERLAY_TEXT_MAX_LEN } from '@/lib/videoOverlayText';
import { isMediaUriReadable, pickVideoFromGallery, VIDEO_MAX_SECONDS, type MediaAsset } from '@/lib/media';
import { makeVideoThumbnail, probeVideoFile } from '@/lib/videoMetadata';
import { compressVideoIfTooLarge, VIDEO_UPLOAD_MAX_LONG_EDGE } from '@/lib/videoCompression';
import { useFeatureFlags } from '@/lib/featureFlags';

/** Legacy AsyncStorage key for circle drafts — purged on open/post so nothing lingers. */
const LEGACY_CIRCLE_DRAFT = 'circle';

function deriveCircleThreadTitle(raw: string): string {
  const t = raw.trim();
  if (!t) return 'Discussion';
  const first = (t.split('\n')[0] ?? t).trim();
  return first.length > 200 ? `${first.slice(0, 197)}…` : first;
}

/**
 * Live video preview tile for the Circle composer.
 *
 * Why this exists: the old composer rendered only a static poster thumbnail
 * (or, in Expo Go where `react-native-compressor` isn't linked, an empty
 * dark box with a play icon). Users reported "no preview / can't see the
 * video." This component plays the selected file inline via `expo-video`
 * so the user sees their actual footage, looping and muted, before posting.
 *
 * The `posterUri` (if available) is used as the player poster so a frame
 * paints immediately while the video buffers — eliminates the empty-tile
 * flash that triggered the original bug report.
 */
function CircleVideoPreviewTile({
  uri,
  posterUri,
  thumbLoading,
}: {
  uri: string;
  posterUri: string | null;
  thumbLoading: boolean;
}) {
  const player = useVideoPlayer(uri, (p) => {
    p.loop = true;
    p.muted = true;
    p.volume = 0;
    p.play();
  });

  const [ready, setReady] = useState(false);
  useEffect(() => {
    const sub = player.addListener('statusChange', ({ status }) => {
      if (status === 'readyToPlay') setReady(true);
      if (status === 'idle' || status === 'loading') setReady(false);
    });
    return () => sub.remove();
  }, [player]);

  return (
    <>
      <VideoView
        player={player}
        style={StyleSheet.absoluteFillObject}
        contentFit="cover"
        nativeControls={false}
        {...(Platform.OS === 'android' ? { surfaceType: 'textureView' as const } : {})}
      />
      {/* Poster fades out once the video frame paints; on iOS expo-video
          paints the first frame fast, so this is mostly a buffering bridge. */}
      {!ready && posterUri ? (
        <Image
          source={{ uri: posterUri }}
          style={StyleSheet.absoluteFillObject}
          contentFit="cover"
          {...pulseImageFeedHeroProps}
        />
      ) : null}
      {!ready && !posterUri && thumbLoading ? (
        <View style={[StyleSheet.absoluteFillObject, styles.videoThumbFallback]}>
          <ActivityIndicator color="#FFFFFFE6" />
        </View>
      ) : null}
    </>
  );
}

export default function CommunityCreatePostScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{
    communityId: string;
    communityName: string;
    communitySlug: string;
    intent?: string;
    /** Set when the composer was opened from a Circle "This Week" prompt card. */
    weeklyPromptId?: string;
  }>();
  const insets = useSafeAreaInsets();
  const { user, profile } = useAuth();
  const joinedIds = useAppStore((s) => s.joinedCommunityIds);
  const toast = useToast();

  const communityName = params.communityName ?? 'Community';
  const slug = (params.communitySlug ?? '').toLowerCase();
  /** Attribution to a "This Week" prompt (Part 7) — null for normal posts. */
  const weeklyPromptId = (params.weeklyPromptId ?? '').trim() || null;
  const isConfessionsRoom = isAnonymousConfessionCircle(slug);
  const accent = useMemo(() => getCircleAccent(slug), [slug]);
  const initialType: CirclePostType = useMemo(() => {
    if (params.intent === 'meme') return 'meme';
    if (params.intent === 'thread') return 'thread';
    return slug === 'memes' || slug === 'funny-medical-memes' ? 'meme' : 'thread';
  }, [params.intent, slug]);

  const { data: community } = useQuery({
    queryKey: ['communityForCompose', params.communityId],
    queryFn: () => communitiesService.getById(params.communityId!),
    enabled: !!params.communityId,
    staleTime: 60_000,
  });

  const [postType, setPostType] = useState<CirclePostType>(initialType);
  const [body, setBody] = useState('');
  /**
   * Picked media — image flow stores just the URI like before; video flow keeps
   * a full `MediaAsset` so the upload path knows the correct MIME (.mov vs .mp4
   * vs .webm), duration, and dimensions. The legacy "always `video/mp4`" string
   * caused Storage uploads to mis-tag .mov files and broke iOS playback.
   */
  const [mediaUri, setMediaUri] = useState<string | null>(null);
  const [mediaKind, setMediaKind] = useState<'image' | 'video' | null>(null);
  const [videoAsset, setVideoAsset] = useState<MediaAsset | null>(null);
  /**
   * Local poster frame for the picked video. We render this in the preview
   * tile instead of feeding the video URI to `<Image>` (which renders nothing
   * for video files and was the root cause of the "no preview" bug). It is
   * also re-uploaded as `posts.thumbnail_url` so feed cards have a thumbnail.
   * `null` = pending or unavailable (compressor lib not linked in Expo Go).
   */
  const [videoThumbUri, setVideoThumbUri] = useState<string | null>(null);
  const [videoThumbLoading, setVideoThumbLoading] = useState(false);
  /** Visible upload progress label for the docked CTA spinner (compress %, then 'Uploading…'). */
  const [uploadLabel, setUploadLabel] = useState<string | null>(null);
  /** Same contract as main composers → `posts.video_overlay_text` / feed sticker. */
  const [overlayLine, setOverlayLine] = useState('');
  const [posting, setPosting] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);
  const pendingThreadNavRef = useRef<{ slug: string; threadId: string } | null>(null);
  const [settings, setSettings] = useState<CirclePostSettings>({
    /* Default ON for memes/threads — except anonymous rooms where My Pulse is blocked. */
    shareToMyPulse: !isConfessionsRoom,
    allowComments: true,
    pinToHighlights: false,
  });
  const [phiAck, setPhiAck] = useState(false);
  const [threadFlairTag, setThreadFlairTag] = useState<CircleFlairTag | null>(null);
  const circleVideoPosting = useFeatureFlags((s) => s.circleVideoPosting);

  const isThreadComposer = postType === 'thread' || postType === 'question';

  /** Video tile + chip is fully gated by `circleVideoPosting` (safety-net flag). */
  const videoTypeAvailable = circleVideoPosting;
  const allowsMedia = postType === 'meme' || (postType === 'video' && videoTypeAvailable);

  /** Remove any saved circle drafts — feature disabled; avoids stale keys and room-banner checks. */
  React.useEffect(() => {
    void (async () => {
      if (slug) await clearDraft(`circle:${slug}`);
      await clearDraft(LEGACY_CIRCLE_DRAFT);
    })();
  }, [slug]);

  React.useEffect(() => {
    if (isConfessionsRoom && settings.shareToMyPulse) {
      setSettings((prev) => ({ ...prev, shareToMyPulse: false }));
    }
  }, [isConfessionsRoom, settings.shareToMyPulse]);

  React.useEffect(() => {
    if (!allowsMedia) {
      setMediaUri(null);
      setMediaKind(null);
      setVideoAsset(null);
      setVideoThumbUri(null);
      setVideoThumbLoading(false);
      setOverlayLine('');
    }
  }, [allowsMedia]);

  /** Flag flipped off while user is on the Video tab → bounce them to Thread so we never render the broken affordance. */
  React.useEffect(() => {
    if (postType === 'video' && !videoTypeAvailable) {
      setPostType('thread');
    }
  }, [postType, videoTypeAvailable]);

  /** Soft default when switching to Question — user can clear via chip toggle. */
  React.useEffect(() => {
    if (postType === 'question') {
      setThreadFlairTag((prev) => (prev == null ? 'question' : prev));
    }
  }, [postType]);

  const phiFindings = useMemo(() => scanForPhi(body, overlayLine), [body, overlayLine]);
  const phiSev = highestSeverity(phiFindings);

  const placeholder = postType === 'question'
    ? 'What do you want to ask the room?'
    : postType === 'thread'
      ? 'Start a discussion…'
      : postType === 'video'
        ? 'Add a caption for your video…'
        : 'What\u2019s worth sharing today?';

  /**
   * Generate a local poster frame for the picked video and stash it for preview
   * + later upload. We swallow individual failures because the compressor lib
   * isn't linked in Expo Go — in that case we simply fall back to a play-icon
   * placeholder; the post still uploads with `thumbnail_url = null`.
   */
  const generateAndSetVideoThumb = useCallback(async (uri: string) => {
    setVideoThumbLoading(true);
    setVideoThumbUri(null);
    try {
      const thumb = await makeVideoThumbnail(uri);
      setVideoThumbUri(thumb);
    } catch (e) {
      if (__DEV__) console.warn('[circle-create] thumbnail generation failed', e);
      setVideoThumbUri(null);
    } finally {
      setVideoThumbLoading(false);
    }
  }, []);

  const pickMedia = async () => {
    const wantVideos = postType === 'video';

    /* ── Video flow: delegates to the shared Feed picker (`pickVideoFromGallery`)
     *    so we get duration validation, proper MIME (.mov vs .mp4 vs .webm),
     *    dimensions, and the iOS H264_1920x1080 export preset. The legacy
     *    `ImagePicker.launchImageLibraryAsync` path returned only `uri` and the
     *    composer assumed `video/mp4` for every file — which broke Storage on
     *    `.mov` (the iOS-default container) and produced 0-byte uploads on some
     *    Android `content://` URIs. ── */
    if (wantVideos) {
      if (!videoTypeAvailable) return;
      const asset = await pickVideoFromGallery();
      if (!asset) return;
      const readable = await isMediaUriReadable(asset.uri, asset.webBlob);
      if (!readable) {
        toast.show('This video file could not be read. Please choose another video.', 'error');
        return;
      }
      setVideoAsset(asset);
      setMediaUri(asset.uri);
      setMediaKind('video');
      void generateAndSetVideoThumb(asset.uri);
      return;
    }

    /* ── Image flow: unchanged from the original composer (still uses ImagePicker
     *    directly so we keep `allowsEditing: false` for the full-bleed meme crop).
     *    Permission check stays here because pickVideoFromGallery handles its own
     *    permission prompt internally. ── */
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      toast.show('Photo library access is needed to attach media.', 'info');
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      /** Full-bleed photos — native crop sheet was forcing an unwanted square crop on memes. */
      allowsEditing: false,
      quality: 0.85,
    });
    if (!result.canceled && result.assets?.[0]) {
      setMediaUri(result.assets[0].uri);
      setMediaKind('image');
      setVideoAsset(null);
      setVideoThumbUri(null);
    }
  };

  const removeMedia = () => {
    setMediaUri(null);
    setMediaKind(null);
    setVideoAsset(null);
    setVideoThumbUri(null);
    setVideoThumbLoading(false);
    setOverlayLine('');
  };

  const onChangeSettings = (next: Partial<CirclePostSettings>) =>
    setSettings((prev) => ({ ...prev, ...next }));

  const handlePost = async () => {
    if (!body.trim() && !mediaUri) {
      toast.show('Add some content for your post', 'error');
      return;
    }
    if (!user) {
      toast.show('Not signed in', 'error');
      return;
    }
    if (phiSev === 'high') {
      toast.show('High-risk privacy pattern — remove or reword before posting', 'error');
      return;
    }
    if (phiFindings.length > 0 && !phiAck) {
      toast.show('Review the privacy banner and confirm before posting', 'error');
      return;
    }
    if (!checkRateLimit('post')) return;
    if (params.communityId && !joinedIds.has(params.communityId)) {
      toast.show('Join this Circle before posting.', 'error');
      return;
    }

    setPosting(true);
    try {
      /* ── Questions tab: real `circle_threads` rows (not wall posts). ── */
      if (postType === 'thread' || postType === 'question') {
        if (!body.trim()) {
          toast.show('Add some content for your post', 'error');
          return;
        }
        if (!params.communityId) {
          toast.show('Missing circle — go back and open the room again.', 'error');
          return;
        }
        const threadBody = body.trim().slice(0, 12000);
        const title = deriveCircleThreadTitle(threadBody);
        const { kind: threadKind, flairTag } = resolveThreadCreateFlair({
          postType: postType === 'question' ? 'question' : 'thread',
          flairTag: threadFlairTag,
        });
        let createdThread;
        try {
          createdThread = await circleContentService.createThread({
            communityId: params.communityId,
            authorId: user.id,
            kind: threadKind,
            flairTag,
            title,
            body: threadBody,
            weeklyPromptId,
          });
        } catch (e: unknown) {
          if (looksLikeRlsPolicyDenial(e)) {
            toast.show('Join this Circle before posting.', 'error');
            return;
          }
          toast.show(e instanceof Error ? e.message : 'Could not start discussion', 'error');
          return;
        }

        if (!isConfessionsRoom && settings.shareToMyPulse && createdThread?.id) {
          try {
            await profileUpdatesService.add(user.id, {
              type: 'link_circle',
              content: `${title} — on My Pulse`,
              previewText: threadBody.slice(0, 140),
              linkedCircleSlug: params.communitySlug,
              linkedDiscussionTitle: title,
              linkedThreadId: createdThread.id,
            });
          } catch (mirrorErr) {
            console.warn('[community-create-post] My Pulse mirror failed', mirrorErr);
            toast.show(
              'Discussion posted — My Pulse pin did not save. Open the thread and use Share to My Pulse.',
              'info',
            );
          }
        }

        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
        await queryClient.invalidateQueries({
          queryKey: [...circleContentKeys.threadsForRoom(slug || '__', params.communityId), 'inf'],
        });
        if (!isConfessionsRoom && settings.shareToMyPulse && user.id) {
          await queryClient.invalidateQueries({ queryKey: profileUpdateKeys.forUser(user.id) });
        }
        if (slug) await clearDraft(`circle:${slug}`);
        await clearDraft(LEGACY_CIRCLE_DRAFT);
        pendingThreadNavRef.current =
          slug && createdThread.id ? { slug, threadId: createdThread.id } : null;
        setShowSuccess(true);
        return;
      }

      let mediaUrl: string | undefined;
      let thumbnailUrl: string | undefined;
      let postKind: 'image' | 'video' | 'text' = 'text';
      if (mediaUri) {
        const isVideo = mediaKind === 'video';
        try {
          if (isVideo) {
            /* ── Video upload pipeline (matches Feed `/create/video`) ──
             *   1. Verify the local URI is actually readable on this device
             *      (Android `content://` URIs can resolve to 0-byte payloads
             *      when the originating app is killed between picker + post).
             *   2. Probe duration/dimensions if we don't have them yet.
             *   3. Compress only if the long edge exceeds `VIDEO_UPLOAD_MAX_LONG_EDGE`
             *      so we never push raw 4K bytes through Storage.
             *   4. Stream the file via `uploadPostMediaWithMeta` (the same proven
             *      path the Feed composer uses — handles `ph://`, file://, blob:).
             *   5. Generate + upload a poster thumbnail so `posts.thumbnail_url`
             *      is populated for the Circle feed card. If thumbnail generation
             *      fails (e.g. Expo Go w/o react-native-compressor) we still ship
             *      the post — the feed card will fall back to a placeholder.
             */
            const asset = videoAsset ?? {
              uri: mediaUri,
              type: 'video' as const,
              mimeType: 'video/mp4',
              fileName: `circle_video_${Date.now()}.mp4`,
            };

            const readable = await isMediaUriReadable(asset.uri, asset.webBlob);
            if (!readable) {
              toast.show('This video file could not be read. Please choose another video.', 'error');
              return;
            }

            let hydrated: MediaAsset = asset;
            if (hydrated.duration == null || hydrated.width == null) {
              const probed = await probeVideoFile(hydrated.uri);
              hydrated = {
                ...hydrated,
                duration: hydrated.duration ?? probed.duration,
                width: hydrated.width ?? probed.width,
                height: hydrated.height ?? probed.height,
              };
            }

            if (hydrated.duration != null && hydrated.duration > VIDEO_MAX_SECONDS) {
              toast.show(`This video is too long — pick a clip under ${Math.round(VIDEO_MAX_SECONDS / 60)} minutes.`, 'error');
              return;
            }

            const longEdge = Math.max(hydrated.width ?? 0, hydrated.height ?? 0);
            const needsCompress = longEdge > VIDEO_UPLOAD_MAX_LONG_EDGE;
            let ready: MediaAsset = hydrated;
            if (needsCompress) {
              setUploadLabel('Compressing 0%');
              try {
                ready = await compressVideoIfTooLarge(hydrated, (p) =>
                  setUploadLabel(`Compressing ${Math.round(p * 100)}%`),
                );
              } catch (compressErr) {
                if (__DEV__) console.warn('[circle-create] compress failed', compressErr);
                toast.show('This video could not be prepared for upload. Try a shorter clip.', 'error');
                setUploadLabel(null);
                return;
              }
            }

            setUploadLabel('Uploading…');
            let uploadMeta: { publicUrl: string };
            try {
              uploadMeta = await storageService.uploadPostMediaWithMeta(user.id, {
                uri: ready.uri,
                type: ready.mimeType,
                name: ready.fileName ?? `circle_video_${Date.now()}.mp4`,
                webBlob: ready.webBlob,
              });
            } catch (uploadErr) {
              setUploadLabel(null);
              throw uploadErr;
            }
            mediaUrl = uploadMeta.publicUrl;

            /* Thumbnail upload — best-effort. We already grabbed the frame in the
             * picker; if it's missing (compressor not linked / failed to grab)
             * re-try once here in case the user picked through a flaky path. */
            let thumbUri = videoThumbUri;
            if (!thumbUri) {
              try {
                thumbUri = await makeVideoThumbnail(ready.uri);
              } catch {
                thumbUri = null;
              }
            }
            if (thumbUri) {
              try {
                thumbnailUrl = await storageService.uploadPostMedia(user.id, {
                  uri: thumbUri,
                  type: 'image/jpeg',
                  name: `circle_video_thumb_${Date.now()}.jpg`,
                });
              } catch (thumbErr) {
                if (__DEV__) console.warn('[circle-create] thumbnail upload failed', thumbErr);
                /* Non-fatal — feed card will fall back to a video placeholder. */
              }
            }

            setUploadLabel(null);
            postKind = 'video';
          } else {
            /* ── Image upload pipeline (unchanged) ── */
            setUploadLabel('Uploading…');
            mediaUrl = await storageService.uploadPostMedia(user.id, {
              uri: mediaUri,
              type: 'image/jpeg',
              name: `community_${Date.now()}.jpg`,
            });
            setUploadLabel(null);
            postKind = 'image';
          }
        } catch (uploadErr: unknown) {
          setUploadLabel(null);
          if (__DEV__) console.warn('[circle-create] media upload failed', uploadErr);
          /* Specific user-facing copy per Section C of the audit — surface the
           * actionable case to the user instead of the catch-all "check your
           * connection" toast that the original implementation always shipped. */
          const msg = uploadErr instanceof Error ? uploadErr.message.toLowerCase() : '';
          if (msg.includes('signed in') || msg.includes('jwt') || msg.includes('session')) {
            toast.show('We could not verify your session. Please sign in again.', 'error');
          } else if (msg.includes('empty') || msg.includes('could not read')) {
            toast.show('This video file could not be read. Please choose another video.', 'error');
          } else if (msg.includes('413') || msg.includes('too large') || msg.includes('payload')) {
            toast.show('This video is too large. Please choose a shorter video.', 'error');
          } else if (msg.includes('timeout') || msg.includes('timed out')) {
            toast.show('Upload timed out. Try again.', 'error');
          } else if (msg.includes('storage upload failed (4')) {
            toast.show('Media upload is temporarily unavailable. Try again in a moment.', 'error');
          } else {
            toast.show('Check your connection and try again.', 'error');
          }
          return;
        }
      }

      /* Auto-tag with the post type so circle highlights / search can group
       * memes vs. questions vs. threads without storing a separate column. */
      const tags = [postType];

      const isConfessions = isConfessionsRoom;

      const created = await postsService.create({
        creator_id: user.id,
        type: postKind,
        caption: body.trim(),
        media_url: mediaUrl,
        thumbnail_url: thumbnailUrl,
        hashtags: tags,
        communities: params.communityId ? [params.communityId] : undefined,
        /* Circle posts stay in the community feed; if Share to My Pulse is
         * on, we mirror the row into profile_updates below so it surfaces
         * on the user's Pulse Page without duplicating it on the main For
         * You / Following feeds. */
        feed_type_eligible: ['community'],
        privacy_mode: 'public',
        is_anonymous: isConfessions,
        weekly_prompt_id: weeklyPromptId ?? undefined,
        comments_disabled: !settings.allowComments || undefined,
        /* Circle videos don't run through the creator-media-jobs queue (that's
         * for stitch/broll on the Feed composer). Setting the column to null
         * keeps the row in the "ready" state for feed display. */
        media_processing_status: postKind === 'video' ? null : undefined,
        video_overlay_text:
          (postKind === 'video' || postKind === 'image') && overlayLine.trim()
            ? clampVideoOverlayText(overlayLine)
            : undefined,
      });

      /* Circle highlights — curated pins table (RLS: PulseVerse staff only). */
      if (
        settings.pinToHighlights &&
        created?.id &&
        params.communityId &&
        profile?.roleAdmin === true
      ) {
        const pinned = await communitiesService.pinPostToCommunityHighlights(params.communityId, created.id);
        if (!pinned) {
          toast.show('Posted — highlight pin did not save (staff queue only).', 'info');
        }
      }

      /* My Pulse mirror — only when the user explicitly opted in.
       * Deliberately swallow errors so the post itself isn't lost if the
       * Pulse insert fails (the user can re-pin later from their profile). */
      if (!isConfessionsRoom && settings.shareToMyPulse && created?.id) {
        try {
          await profileUpdatesService.add(user.id, {
            type: 'link_post',
            content: body.trim().slice(0, 180) || `New post in ${communityName}`,
            previewText: body.trim().slice(0, 140),
            linkedPostId: created.id,
            linkedCircleSlug: params.communitySlug,
          });
        } catch (mirrorErr) {
          console.warn('[community-create-post] My Pulse mirror failed', mirrorErr);
          toast.show('Posted to the circle — My Pulse pin did not save. You can pin it later from your profile.', 'info');
        }
      }

      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: communityKeys.postsAllViewers(params.communityId) }),
        invalidatePostRelatedQueries(queryClient, { creatorId: user.id }),
      ]);
      if (slug) await clearDraft(`circle:${slug}`);
      await clearDraft(LEGACY_CIRCLE_DRAFT);
      pendingThreadNavRef.current = null;
      setShowSuccess(true);
    } catch (err: unknown) {
      if (looksLikeRlsPolicyDenial(err)) {
        toast.show('Join this Circle before posting.', 'error');
        return;
      }
      toast.show(err instanceof Error ? err.message : 'Failed to post', 'error');
    } finally {
      setPosting(false);
      setUploadLabel(null);
    }
  };

  const canPost = body.trim().length > 0 || !!mediaUri;

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <SuccessAnimation
        visible={showSuccess}
        message="Posted!"
        onComplete={() => {
          const nav = pendingThreadNavRef.current;
          pendingThreadNavRef.current = null;
          if (nav) {
            router.replace(`/communities/${nav.slug}/thread/${nav.threadId}` as never);
            return;
          }
          if (params.communitySlug) router.replace(`/communities/${params.communitySlug}`);
          else router.back();
        }}
      />

      {/* ============================ HEADER ============================
          Three-stop accent bleed (stronger at top, fades into the page)
          so the composer feels like an extension of the room banner —
          not a generic form screen. The "Posting in Circle" label is
          now a small accent-tinted pill so the room identity is the
          first thing the user reads above their typing. */}
      <LinearGradient
        colors={[`${accent.color}38`, `${accent.color}12`, 'transparent']}
        locations={[0, 0.6, 1]}
        style={[styles.header, { paddingTop: insets.top + 6 }]}
      >
        <View style={styles.headerRow}>
          <TouchableOpacity onPress={() => router.back()} style={styles.iconBtn} hitSlop={6}>
            <Ionicons name="arrow-back" size={22} color={colors.dark.text} />
          </TouchableOpacity>
          <View style={styles.headerCenter}>
            <View
              style={[
                styles.headerIcon,
                { backgroundColor: `${accent.color}26`, borderColor: `${accent.color}55` },
              ]}
            >
              <Text style={{ fontSize: 18 }}>{community?.icon ?? '💬'}</Text>
            </View>
            <View style={{ flex: 1, minWidth: 0 }}>
              <Text style={styles.headerTitle} numberOfLines={1}>{communityName}</Text>
              <View
                style={[
                  styles.postingPill,
                  { backgroundColor: `${accent.color}1A`, borderColor: `${accent.color}55` },
                ]}
              >
                <View style={[styles.headerDot, { backgroundColor: accent.color }]} />
                <Text style={[styles.postingPillText, { color: accent.color }]}>
                  Posting in Circle
                </Text>
              </View>
            </View>
          </View>
          <View style={{ width: 36 }} />
        </View>
      </LinearGradient>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollPad}
        keyboardShouldPersistTaps="handled"
      >
        {/* ===================== POST TYPE CHIPS ===================== */}
        <CirclePostTypeChips active={postType} accent={accent} onSelect={setPostType} />

        {isAnonymousConfessionCircle(slug) ? (
          <View style={styles.confessionsDisclosure}>
            <Ionicons name="shield-outline" size={16} color={accent.color} />
            <Text style={styles.confessionsDisclosureText}>{CONFESSIONS_BETA_DISCLOSURE}</Text>
          </View>
        ) : null}

        {isThreadComposer ? (
          <CircleComposerFlairPicker
            accent={accent}
            slug={slug}
            categories={community?.categories}
            selected={threadFlairTag}
            onSelect={setThreadFlairTag}
            isConfessions={isConfessionsRoom}
            disabled={posting}
          />
        ) : null}

        {/* ===================== MAIN COMPOSER ====================== */}
        <AccentComposerFrame
          accentColor={accent.color}
          hint={accent.composerPrompt}
          style={{ marginHorizontal: 14 }}
          footer={
            <AccentCharCount
              length={body.length}
              max={500}
              accentColor={accent.color}
              warnWithin={100}
              hideWhenEmpty={false}
            />
          }
        >
          <TextInput
            style={styles.composerInput}
            value={body}
            onChangeText={setBody}
            placeholder={placeholder}
            placeholderTextColor={colors.dark.textMuted}
            multiline
            maxLength={500}
            textAlignVertical="top"
          />
        </AccentComposerFrame>

        <View style={{ marginHorizontal: 14 }}>
          <PHIGuardrailBanner findings={phiFindings} acknowledged={phiAck} onAcknowledge={() => setPhiAck(true)} />
        </View>

        {/* ====================== MEDIA TILES =======================
            Video tile renders a **live `expo-video` preview** (looping,
            muted) so the user sees their actual footage before posting.
            Older versions rendered only a static poster — and on Expo Go
            (where `react-native-compressor` isn't linked) no poster was
            generated at all, producing the empty-tile "no preview" bug.
            The thumbnail still gets generated separately and uploaded as
            `posts.thumbnail_url` so the feed card has a poster. */}
        {allowsMedia && (
          <View style={styles.mediaTiles}>
            {mediaUri ? (
              <View style={styles.mediaTile}>
                {mediaKind === 'video' ? (
                  <CircleVideoPreviewTile
                    uri={mediaUri}
                    posterUri={videoThumbUri}
                    thumbLoading={videoThumbLoading}
                  />
                ) : (
                  <Image
                    source={{ uri: mediaUri }}
                    style={styles.mediaImg}
                    contentFit="cover"
                    {...pulseImageFeedHeroProps}
                  />
                )}
                {mediaKind === 'video' && videoAsset?.duration != null && (
                  <View style={styles.durationBadge}>
                    <Text style={styles.durationBadgeText}>
                      {Math.max(1, Math.round(videoAsset.duration))}s
                    </Text>
                  </View>
                )}
                <TouchableOpacity
                  style={styles.removeBtn}
                  onPress={removeMedia}
                  disabled={posting}
                  accessibilityLabel="Remove attached media"
                >
                  <Ionicons name="close" size={16} color="#FFFFFF" />
                </TouchableOpacity>
              </View>
            ) : (
              <View style={[styles.mediaTile, styles.mediaTilePlaceholder]} />
            )}
            <TouchableOpacity
              style={[styles.mediaTile, styles.mediaAddTile]}
              onPress={pickMedia}
              disabled={posting}
              activeOpacity={0.85}
            >
              <View style={styles.mediaAddIcon}>
                <Ionicons
                  name={postType === 'video' ? 'videocam' : 'image'}
                  size={22}
                  color={colors.dark.textMuted}
                />
                <View style={styles.mediaAddPlus}>
                  <Ionicons name="add" size={12} color="#FFF" />
                </View>
              </View>
              <Text style={styles.mediaAddText}>
                {mediaUri
                  ? mediaKind === 'video' ? 'Replace Video' : 'Replace Photo'
                  : postType === 'video' ? 'Add Video' : 'Add Photo'}
              </Text>
            </TouchableOpacity>
          </View>
        )}

        {allowsMedia && mediaUri ? (
          <View style={{ marginHorizontal: 14 }}>
            <AccentComposerFrame
              accentColor={accent.color}
              hint="On-media sticker (optional)"
              compact
              noShadow
              footer={
                <AccentCharCount
                  length={overlayLine.length}
                  max={VIDEO_OVERLAY_TEXT_MAX_LEN}
                  accentColor={accent.color}
                  warnWithin={12}
                  hideWhenEmpty={false}
                />
              }
            >
              <TextInput
                style={styles.overlayInput}
                value={overlayLine}
                onChangeText={setOverlayLine}
                placeholder="Short line shown on your photo or video in the feed"
                placeholderTextColor={colors.dark.textMuted}
                editable={!posting}
                maxLength={VIDEO_OVERLAY_TEXT_MAX_LEN}
              />
            </AccentComposerFrame>
          </View>
        ) : null}

        {/* ====================== POST SETTINGS =====================
            The Circle confirmation row that used to live here was a
            duplicate of the CircleContextFooter below — removed to keep
            the settings card focused on actual decisions, not labels. */}
        <View style={styles.settingsWrap}>
          <CircleSettingsCard
            settings={settings}
            canPin={profile?.roleAdmin === true}
            hideShareToMyPulse={isConfessionsRoom}
            onChange={onChangeSettings}
          />
        </View>

        {/* ===================== CONTEXT FOOTER ===================== */}
        <View style={styles.footerWrap}>
          <CircleContextFooter
            circleIcon={community?.icon ?? '💬'}
            circleAccent={accent.color}
            memberCount={community?.memberCount ?? 0}
            onlineCount={0}
            etiquette={accent.etiquette}
          />
        </View>

        <View style={{ height: 110 }} />
      </ScrollView>

      {/* ======================= BOTTOM CTA BAR =======================
          A thin accent gradient line sits above the bar so the CTA reads
          as part of the room's identity, not a generic system bar. */}
      <View style={[styles.ctaWrap, { paddingBottom: insets.bottom + 10 }]}>
        <LinearGradient
          colors={[`${accent.color}00`, `${accent.color}66`, `${accent.color}00`]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 0 }}
          style={styles.ctaTopLine}
          pointerEvents="none"
        />
        <View style={styles.ctaBar}>
          <TouchableOpacity
            style={styles.postWrap}
            onPress={handlePost}
            disabled={posting || !canPost}
            activeOpacity={0.9}
          >
            <LinearGradient
              colors={canPost ? [accent.color, accent.colorAlt] : [colors.dark.cardAlt, colors.dark.cardAlt]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={[styles.postBtn, !canPost && { opacity: 0.7 }]}
            >
              {posting ? (
                <>
                  <ActivityIndicator size="small" color="#FFFFFF" />
                  {uploadLabel ? <Text style={styles.postText}>{uploadLabel}</Text> : null}
                </>
              ) : (
                <>
                  <Ionicons name="paper-plane" size={15} color="#FFFFFF" />
                  <Text style={styles.postText}>Post to Circle</Text>
                </>
              )}
            </LinearGradient>
          </TouchableOpacity>
        </View>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.dark.bg },

  /* ---- Header ---- */
  header: {
    paddingHorizontal: 14,
    paddingBottom: 14,
  },
  headerRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  iconBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(255,255,255,0.05)',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: colors.dark.border,
  },
  headerCenter: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 10, minWidth: 0 },
  headerIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
  },
  headerTitle: { fontSize: 17, fontWeight: '800', color: colors.dark.text, letterSpacing: -0.3 },
  /** "Posting in Circle" is now an accent-tinted pill instead of an
   *  inline subtitle. Reads as a quiet status badge — small, but it
   *  immediately tells the user where their post is going. */
  postingPill: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    gap: 5,
    paddingHorizontal: 8,
    paddingVertical: 3,
    marginTop: 4,
    borderRadius: 999,
    borderWidth: 1,
  },
  postingPillText: {
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 0.3,
    textTransform: 'uppercase',
  },
  headerDot: { width: 5, height: 5, borderRadius: 2.5 },

  /* ---- Body ---- */
  scrollPad: { paddingBottom: 24, gap: 14 },

  composerInput: {
    minHeight: 130,
    fontSize: 16,
    color: colors.dark.text,
    lineHeight: 22,
    paddingTop: 4,
  },
  overlayInput: {
    minHeight: 44,
    fontSize: 15,
    color: colors.dark.text,
    lineHeight: 20,
    paddingTop: 4,
  },

  /* ---- Media Tiles ---- */
  mediaTiles: {
    flexDirection: 'row',
    gap: 10,
    paddingHorizontal: 14,
  },
  mediaTile: {
    flex: 1,
    aspectRatio: 1,
    borderRadius: borderRadius.card ?? 14,
    backgroundColor: colors.dark.card,
    borderWidth: 1,
    borderColor: colors.dark.border,
    overflow: 'hidden',
    position: 'relative',
  },
  mediaTilePlaceholder: { backgroundColor: 'transparent', borderColor: 'transparent' },
  mediaImg: { width: '100%', height: '100%' },
  /** Shown when react-native-compressor cannot generate a poster frame (e.g. Expo Go). */
  videoThumbFallback: {
    backgroundColor: 'rgba(15, 28, 48, 0.92)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  durationBadge: {
    position: 'absolute',
    bottom: 6,
    right: 6,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
    backgroundColor: 'rgba(0,0,0,0.55)',
  },
  durationBadgeText: {
    fontSize: 10,
    fontWeight: '800',
    color: '#FFFFFF',
    letterSpacing: 0.2,
  },
  removeBtn: {
    position: 'absolute',
    top: 6,
    right: 6,
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: 'rgba(0,0,0,0.55)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  mediaAddTile: {
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    borderStyle: 'dashed',
  },
  mediaAddIcon: { position: 'relative' },
  mediaAddPlus: {
    position: 'absolute',
    right: -6,
    bottom: -6,
    width: 16,
    height: 16,
    borderRadius: 8,
    backgroundColor: colors.dark.bg,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: colors.dark.border,
  },
  mediaAddText: { fontSize: 12, fontWeight: '700', color: colors.dark.textMuted },

  /* ---- Settings + footer ---- */
  settingsWrap: { paddingHorizontal: 14 },
  footerWrap: { paddingHorizontal: 14, paddingTop: 4 },

  /* ---- Bottom CTA bar ---- */
  ctaWrap: {
    backgroundColor: colors.dark.bg,
  },
  /** Hairline accent gradient — fades in/out so it reads as a curated
   *  edge rather than a flat system divider. */
  ctaTopLine: {
    height: 1,
    width: '100%',
  },
  ctaBar: {
    flexDirection: 'row',
    paddingHorizontal: 14,
    paddingTop: 12,
  },
  postWrap: {
    flex: 1,
    borderRadius: borderRadius.button ?? 24,
    overflow: 'hidden',
    /* Soft elevation on the hero CTA. */
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.30,
        shadowRadius: 8,
      },
      android: { elevation: 4 },
      default: {},
    }),
  },
  postBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 13,
    borderRadius: borderRadius.button ?? 24,
  },
  postText: { fontSize: 14, fontWeight: '800', color: '#FFFFFF', letterSpacing: 0.2 },
  confessionsDisclosure: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
    marginHorizontal: 14,
    marginTop: 10,
    marginBottom: 4,
    padding: 12,
    borderRadius: 12,
    backgroundColor: 'rgba(255,255,255,0.04)',
    borderWidth: 1,
    borderColor: colors.dark.border,
  },
  confessionsDisclosureText: {
    flex: 1,
    fontSize: 12,
    lineHeight: 17,
    color: colors.dark.textSecondary,
    fontWeight: '500',
  },
});
