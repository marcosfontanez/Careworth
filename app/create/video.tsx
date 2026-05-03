import React, { useState, useEffect, useRef, useMemo } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet,
  ScrollView, ActivityIndicator,
  KeyboardAvoidingView, Platform,
} from 'react-native';
import { VideoView, useVideoPlayer } from 'expo-video';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { usePost } from '@/hooks/useQueries';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import * as Haptics from 'expo-haptics';
import { colors } from '@/theme';
import { useAuth } from '@/contexts/AuthContext';
import { storageService } from '@/lib/storage';
import { postsService } from '@/services/supabase';
import { checkRateLimit } from '@/lib/rateLimit';
import { analytics } from '@/lib/analytics';
import { SuccessAnimation } from '@/components/ui/SuccessAnimation';
import { useToast } from '@/components/ui/Toast';
import { saveDraft, loadDraft, clearDraft } from '@/lib/drafts';
import { recordVideo, pickVideoFromGallery, VIDEO_MIN_SECONDS, VIDEO_MAX_SECONDS, type MediaAsset } from '@/lib/media';
import { compressVideoIfTooLarge, VIDEO_UPLOAD_MAX_LONG_EDGE } from '@/lib/videoCompression';
import { queryClient } from '@/lib/queryClient';
import { invalidatePostRelatedQueries } from '@/lib/invalidatePostQueries';
import { VideoBrandWatermark } from '@/components/feed/VideoBrandWatermark';
import { consumePendingVideoCapture } from '@/lib/pendingVideoCapture';
import { makeVideoThumbnail } from '@/lib/videoMetadata';
import { tintForLook, VIDEO_LOOKS, type VideoLookId } from '@/lib/videoFilters';
import { scanForPhi, highestSeverity } from '@/lib/phiGuardrail';
import { loadBrandKit, saveBrandKit, type BrandKit } from '@/lib/brandKit';
import type { MoodPreset, MoodPresetId } from '@/lib/moodPresets';
import { appendHashtag } from '@/lib/hashtagStudio';
import { startNewSeries, type SeriesSelection } from '@/lib/seriesMode';

import { PHIGuardrailBanner } from '@/components/create/PHIGuardrailBanner';
import { EducationModeToggle, type EducationCitation } from '@/components/create/EducationModeToggle';
import { SeriesModePicker } from '@/components/create/SeriesModePicker';
import { SchedulePostPicker } from '@/components/create/SchedulePostPicker';
import { BrandKitEditor } from '@/components/create/BrandKitEditor';
import { MoodPresetPicker } from '@/components/create/MoodPresetPicker';
import { ThumbnailStudio } from '@/components/create/ThumbnailStudio';
import { WaveformTimeline } from '@/components/create/WaveformTimeline';
import { ClipSplitterModal } from '@/components/create/ClipSplitterModal';
import { MultiClipStitchModal } from '@/components/create/MultiClipStitchModal';
import { SpeedRampEditor } from '@/components/create/SpeedRampEditor';
import { SmartTrimCard } from '@/components/create/SmartTrimCard';
import { VideoHygieneCard } from '@/components/create/VideoHygieneCard';
import { BrollSoonCard } from '@/components/create/BrollSoonCard';
import { CoCreateRoadmapCard } from '@/components/create/CoCreateRoadmapCard';
import Slider from '@react-native-community/slider';

function buildSourcesBlock(citations: EducationCitation[]): string {
  if (citations.length === 0) return '';
  const lines = citations.map((c) => {
    const bits = [`· ${c.label}: ${c.url}`];
    if (c.doi?.trim()) bits.push(`  DOI ${c.doi.trim()}`);
    if (c.lastReviewed?.trim()) bits.push(`  Last reviewed: ${c.lastReviewed.trim()}`);
    return bits.join('\n');
  });
  return `\n\nSources\n${lines.join('\n')}`;
}

type FilterPreset = VideoLookId;

const EDITOR_FILTER_IDS: VideoLookId[] = VIDEO_LOOKS.map((l) => l.id);

/** Preview-only polish: playback speed, color grade overlay, optional sticker line (burned into caption on post). */
function ComposableVideoPreview({
  uri,
  playbackRate,
  filter,
  overlayText,
  previewMuted = true,
  previewVolume = 0,
}: {
  uri: string;
  playbackRate: number;
  filter: FilterPreset;
  overlayText: string;
  /** When false, play original audio (e.g. hear your upload while picking a separate sound). */
  previewMuted?: boolean;
  previewVolume?: number;
}) {
  const player = useVideoPlayer(uri, (p) => {
    p.loop = true;
    p.muted = previewMuted;
    p.volume = previewMuted ? 0 : Math.max(0, Math.min(1, previewVolume));
    p.playbackRate = playbackRate;
    p.play();
  });

  useEffect(() => {
    player.playbackRate = playbackRate;
  }, [playbackRate, player]);

  useEffect(() => {
    player.muted = previewMuted;
    player.volume = previewMuted ? 0 : Math.max(0, Math.min(1, previewVolume));
  }, [player, previewMuted, previewVolume]);

  const tint = tintForLook(filter);

  return (
    <>
      <VideoView
        player={player}
        style={StyleSheet.absoluteFillObject}
        contentFit="cover"
        nativeControls={false}
      />
      {tint ? (
        <View pointerEvents="none" style={[StyleSheet.absoluteFillObject, { backgroundColor: tint }]} />
      ) : null}
      {overlayText.trim() ? (
        <View style={[styles.previewStickerWrap]} pointerEvents="none">
          <Text style={styles.previewStickerText}>{overlayText.trim()}</Text>
        </View>
      ) : null}
      <VideoBrandWatermark compact position="bottom-center" edgeOffset={10} variant="subtle" />
    </>
  );
}

export default function CreateVideoScreen() {
  const router = useRouter();
  const { mode, soundPostId: soundPostIdRaw, duetPostId: duetPostIdRaw } =
    useLocalSearchParams<{
      mode?: 'record' | 'upload';
      soundPostId?: string;
      duetPostId?: string;
    }>();
  const soundPostId = Array.isArray(soundPostIdRaw) ? soundPostIdRaw[0] : soundPostIdRaw;
  const soundPostIdTrim = soundPostId?.trim() ?? '';
  const duetPostId = Array.isArray(duetPostIdRaw) ? duetPostIdRaw[0] : duetPostIdRaw;
  const duetPostIdTrim = duetPostId?.trim() ?? '';
  const { data: soundSourcePost, isPending: soundSourceLoading } = usePost(soundPostIdTrim);
  const { data: duetParentPost, isPending: duetParentLoading } = usePost(duetPostIdTrim, {
    enabled: Boolean(duetPostIdTrim),
  });
  const insets = useSafeAreaInsets();
  const { user } = useAuth();
  const toast = useToast();
  const [caption, setCaption] = useState('');
  const [hashtags, setHashtags] = useState('');
  /**
   * Creator-set name for an original recording. Optional; when empty the
   * server-side RPCs (search_sound_library / get_viral_sounds_this_week)
   * fall back to caption -> "Sound by @handle". Only meaningful when the
   * user is NOT borrowing someone else's audio (sid below).
   */
  const [soundTitle, setSoundTitle] = useState('');
  const [media, setMedia] = useState<MediaAsset | null>(null);
  const [posting, setPosting] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);
  const [compressPct, setCompressPct] = useState<number | null>(null);
  const [privacy, setPrivacy] = useState<'public' | 'followers'>('public');
  const [commentsOn, setCommentsOn] = useState(true);
  const [evidenceUrl, setEvidenceUrl] = useState('');
  const [evidenceLabel, setEvidenceLabel] = useState('');
  /** Shorts-style headline — prepended to caption on post. */
  const [shortTitle, setShortTitle] = useState('');
  /** On-preview sticker; also prepended to caption (not burned into video file). */
  const [overlayLine, setOverlayLine] = useState('');
  const [filterPreset, setFilterPreset] = useState<FilterPreset>('none');
  const [previewPlaybackRate, setPreviewPlaybackRate] = useState(1);
  const [showDraftHint, setShowDraftHint] = useState(false);
  const openedPickerRef = useRef(false);

  const [brandKit, setBrandKit] = useState<BrandKit | null>(null);
  const [brandKitOpen, setBrandKitOpen] = useState(false);
  const [phiAck, setPhiAck] = useState(false);
  const [educationOn, setEducationOn] = useState(false);
  const [citations, setCitations] = useState<EducationCitation[]>([]);
  const [seriesSelection, setSeriesSelection] = useState<SeriesSelection | null>(null);
  const [scheduledAt, setScheduledAt] = useState<Date | null>(null);
  const [moodId, setMoodId] = useState<MoodPresetId | null>(null);
  const [originalAudioOn, setOriginalAudioOn] = useState(false);
  /** 0–1 preview mix for embedded track when not using a borrowed sound (upload is unchanged). */
  const [originalAudioMix, setOriginalAudioMix] = useState(1);
  const [customCoverUri, setCustomCoverUri] = useState<string | null>(null);
  const [coverAltUri, setCoverAltUri] = useState<string | null>(null);
  const [thumbStudioOpen, setThumbStudioOpen] = useState(false);
  const [thumbStudioMode, setThumbStudioMode] = useState<'primary' | 'alt'>('primary');
  const [clipSplitOpen, setClipSplitOpen] = useState(false);
  const [stitchOpen, setStitchOpen] = useState(false);
  const [speedRamp, setSpeedRamp] = useState({ start: 1 as number, mid: 1 as number, end: 1 as number });
  const [followUpClips, setFollowUpClips] = useState<MediaAsset[]>([]);
  const [trimStart, setTrimStart] = useState(0);
  const [trimEnd, setTrimEnd] = useState<number | null>(null);

  useEffect(() => {
    setTrimStart(0);
    setTrimEnd(media?.duration ?? null);
  }, [media?.uri, media?.duration]);

  useEffect(() => {
    if (!user?.id) return;
    loadBrandKit(user.id).then(setBrandKit);
  }, [user?.id]);

  useEffect(() => {
    setCustomCoverUri(null);
    setCoverAltUri(null);
  }, [media?.uri]);

  const phiFindings = useMemo(
    () => scanForPhi(caption, shortTitle, overlayLine, hashtags, soundTitle),
    [caption, shortTitle, overlayLine, hashtags, soundTitle],
  );
  const phiSev = highestSeverity(phiFindings);

  const applyMoodPreset = (preset: MoodPreset | null) => {
    if (!preset) {
      setMoodId(null);
      return;
    }
    setMoodId(preset.id);
    setFilterPreset(preset.look);
    preset.suggestedHashtags.forEach((t) => {
      setHashtags((h) => appendHashtag(h, t));
    });
    if (preset.suggestedSoundTitle && !soundPostIdTrim) {
      setSoundTitle(preset.suggestedSoundTitle.slice(0, 60));
    }
  };

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const pending = consumePendingVideoCapture();
      if (pending && !cancelled) {
        setMedia(pending.asset);
        openedPickerRef.current = true;
        if (pending.lookId) setFilterPreset(pending.lookId);
        if (pending.soundTitle && !soundPostIdTrim) setSoundTitle(pending.soundTitle);
      }

      const draft = await loadDraft('video');
      if (cancelled) return;
      if (draft) {
        setCaption(draft.caption ?? '');
        setHashtags(draft.hashtags ?? '');
        if (!pending?.soundTitle) setSoundTitle(draft.soundTitle ?? '');
        if (draft.mediaUris?.[0] && !pending) {
          const u = draft.mediaUris[0];
          setMedia({
            uri: u,
            type: 'video',
            mimeType: 'video/mp4',
            fileName: 'draft_clip.mp4',
          });
          openedPickerRef.current = true;
        }
        if ((draft.caption || draft.hashtags || draft.soundTitle || draft.mediaUris?.length) && !pending) {
          setShowDraftHint(true);
        }
      }
      if (!openedPickerRef.current && !cancelled) {
        if (mode === 'record') {
          const asset = await recordVideo();
          if (!cancelled && asset) setMedia(asset);
        } else if (mode === 'upload') {
          const asset = await pickVideoFromGallery();
          if (!cancelled && asset) setMedia(asset);
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [mode]);

  useEffect(() => {
    if (caption || hashtags || soundTitle || media) {
      saveDraft('video', {
        caption,
        hashtags,
        soundTitle,
        mediaUris: media ? [media.uri] : undefined,
      });
    }
  }, [caption, hashtags, soundTitle, media]);

  const handleUpload = async () => {
    const asset = await pickVideoFromGallery();
    if (asset) setMedia(asset);
  };

  const handlePost = async () => {
    let composedCaption = [shortTitle.trim(), overlayLine.trim(), caption.trim()]
      .filter(Boolean)
      .join('\n\n')
      .trim();

    if (!composedCaption && !media) {
      toast.show('Add a video or something to say', 'error');
      return;
    }
    if (media?.duration != null && media.duration > VIDEO_MAX_SECONDS) {
      toast.show(`Video can't exceed ${VIDEO_MAX_SECONDS / 60} minutes`, 'error');
      return;
    }
    if (!checkRateLimit('post')) return;

    if (phiFindings.length > 0 && !phiAck) {
      toast.show('Review the privacy banner and confirm before posting', 'error');
      return;
    }
    if (phiSev === 'high') {
      toast.show('High-risk PHI pattern — reword before posting', 'error');
      return;
    }

    if (!user) {
      toast.show('Not signed in', 'error');
      return;
    }

    setPosting(true);
    try {
      let tags = hashtags.split(/[\s,]+/).filter((t) => t.startsWith('#')).map((t) => t.slice(1));

      const citeBlock =
        educationOn && citations.length > 0 ? buildSourcesBlock(citations.slice(0, 5)) : '';
      composedCaption = `${composedCaption}${citeBlock}`.trim();

      let mediaUrl: string | undefined;
      if (media) {
        try {
          const longEdge = Math.max(media.width ?? 0, media.height ?? 0);
          const willCompress = longEdge > VIDEO_UPLOAD_MAX_LONG_EDGE;
          if (willCompress) setCompressPct(0);
          const ready = await compressVideoIfTooLarge(media, (p) => {
            setCompressPct(Math.round(p * 100));
          });
          setCompressPct(null);
          mediaUrl = await storageService.uploadPostMedia(user.id, {
            uri: ready.uri,
            type: ready.mimeType,
            name: ready.fileName,
          });
        } catch (uploadErr: unknown) {
          setCompressPct(null);
          const msg =
            uploadErr && typeof uploadErr === 'object' && 'message' in uploadErr
              ? String((uploadErr as { message: string }).message)
              : String(uploadErr);
          toast.show(msg.length > 120 ? `${msg.slice(0, 117)}…` : msg, 'error');
        }
      }

      if (media && !mediaUrl?.trim()) {
        toast.show('Could not upload video. Check your connection and try again.', 'error');
        return;
      }

      let thumbnailUrl: string | undefined;
      let coverAltRemote: string | undefined;
      if (mediaUrl?.trim() && media?.uri) {
        const localThumb =
          customCoverUri ?? (await makeVideoThumbnail(media.uri));
        if (localThumb) {
          try {
            thumbnailUrl = await storageService.uploadPostMedia(user.id, {
              uri: localThumb,
              type: 'image/jpeg',
              name: `poster_${Date.now()}.jpg`,
            });
          } catch {
            /* feed still works without custom poster */
          }
        }
      }
      if (coverAltUri?.trim() && user.id) {
        try {
          coverAltRemote = await storageService.uploadPostMedia(user.id, {
            uri: coverAltUri,
            type: 'image/jpeg',
            name: `poster_alt_${Date.now()}.jpg`,
          });
        } catch {
          /* A/B cover optional */
        }
      }

      const postType = mediaUrl?.trim() ? 'video' : 'text';
      const sid = soundPostIdTrim;
      if (postType === 'video' && sid && soundSourceLoading) {
        toast.show('Still loading sound — wait a moment and try again', 'info');
        return;
      }
      if (postType === 'video' && duetPostIdTrim && duetParentLoading) {
        toast.show('Still loading duet reference — wait a moment and try again', 'info');
        return;
      }
      if (postType === 'video' && duetPostIdTrim && !mediaUrl?.trim()) {
        toast.show('Record or upload your side of the duet first', 'error');
        return;
      }
      const sourceMedia =
        soundSourcePost?.soundSourceMediaUrl?.trim() || soundSourcePost?.mediaUrl?.trim();
      if (postType === 'video' && sid && soundSourcePost && !sourceMedia) {
        toast.show('This sound has no media file to attach. Pick another sound or post without it.', 'error');
        return;
      }
      const sourceHandle =
        soundSourcePost?.creator?.username?.trim()
          ? `@${soundSourcePost.creator.username.trim()}`
          : (soundSourcePost?.creator?.displayName?.trim() ?? '');
      const soundPayload =
        postType === 'video' && sid && soundSourcePost && sourceMedia
          ? {
              sound_title:
                soundSourcePost.soundTitle?.trim()
                || (sourceHandle ? `Sound by ${sourceHandle}` : 'Original sound'),
              sound_source_post_id: sid,
              sound_source_media_url: sourceMedia,
            }
          : {};

      const ownSoundPayload =
        postType === 'video' && !sid && mediaUrl?.trim() && soundTitle.trim()
          ? { sound_title: soundTitle.trim().slice(0, 80) }
          : {};

      const evUrl = evidenceUrl.trim();
      const evLab = evidenceLabel.trim();
      const duetPayload =
        postType === 'video' && duetPostIdTrim
          ? {
              duet_parent_id: duetPostIdTrim,
              ...(evUrl ? { evidence_url: evUrl.startsWith('http') ? evUrl : `https://${evUrl}` } : {}),
              ...(evLab ? { evidence_label: evLab } : {}),
            }
          : {};

      const scheduleIso = scheduledAt ? scheduledAt.toISOString() : null;

      const created = await postsService.create({
        creator_id: user.id,
        type: postType,
        caption: composedCaption,
        media_url: mediaUrl?.trim(),
        thumbnail_url: thumbnailUrl,
        hashtags: tags.length > 0 ? tags : undefined,
        feed_type_eligible: ['forYou', 'following'],
        privacy_mode: privacy,
        is_education: educationOn || undefined,
        education_citations:
          educationOn && citations.length > 0
            ? citations.slice(0, 5).map((c) => ({
                label: c.label,
                url: c.url,
                ...(c.doi ? { doi: c.doi } : {}),
                ...(c.lastReviewed ? { last_reviewed: c.lastReviewed } : {}),
              }))
            : undefined,
        series_id: seriesSelection?.seriesId,
        series_part: seriesSelection?.seriesPart,
        series_total: seriesSelection?.seriesTotal,
        scheduled_at: scheduleIso,
        scheduled_status: scheduleIso ? 'scheduled' : 'live',
        cover_alt_url: coverAltRemote,
        mood_preset: moodId ?? undefined,
        ...soundPayload,
        ...ownSoundPayload,
        ...duetPayload,
      });
      if (postType === 'video' && !created.mediaUrl?.trim()) {
        await invalidatePostRelatedQueries(queryClient, { creatorId: user.id });
        toast.show(
          'Post was saved but the video URL is missing. In Supabase: Storage → post-media → Public, and confirm uploads are not 0 bytes.',
          'error',
        );
        return;
      }
      analytics.track('post_created', { type: postType });
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      await invalidatePostRelatedQueries(queryClient, { creatorId: user.id });

      if (followUpClips.length > 0) {
        const [next, ...rest] = followUpClips;
        setFollowUpClips(rest);
        setMedia(next);
        setCustomCoverUri(null);
        setCoverAltUri(null);
        setSeriesSelection((prev) =>
          prev
            ? {
                ...prev,
                seriesPart: prev.seriesPart + 1,
                seriesTotal: Math.max(prev.seriesTotal, prev.seriesPart + 1 + rest.length),
              }
            : null,
        );
        toast.show(`Part posted — ${rest.length} more in queue. Edit caption and tap Post again.`, 'success');
        return;
      }

      clearDraft('video');
      setShowSuccess(true);
    } catch (err: any) {
      toast.show(err.message ?? 'Something went wrong', 'error');
    } finally {
      setPosting(false);
    }
  };

  const durationSec = media?.duration ?? 0;
  const durationValid = !media || (durationSec >= VIDEO_MIN_SECONDS && durationSec <= VIDEO_MAX_SECONDS);
  const canPost =
    (!!media || shortTitle.trim() || overlayLine.trim() || caption.trim()) && durationValid;

  const formatDuration = (sec: number) => {
    const m = Math.floor(sec / 60);
    const s = Math.round(sec % 60);
    return m > 0 ? `${m}:${s.toString().padStart(2, '0')}` : `0:${s.toString().padStart(2, '0')}`;
  };
  const durationStr = media?.duration ? formatDuration(media.duration) : '';

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      keyboardVerticalOffset={0}
    >
      <SuccessAnimation
        visible={showSuccess}
        message="Posted!"
        onComplete={() => router.replace('/(tabs)/feed')}
      />

      <BrandKitEditor
        visible={brandKitOpen}
        initial={brandKit ?? {}}
        onClose={() => setBrandKitOpen(false)}
        onSave={async (next) => {
          setBrandKit(next);
          if (user?.id) await saveBrandKit(user.id, next);
        }}
      />

      {media ? (
        <ThumbnailStudio
          visible={thumbStudioOpen}
          onClose={() => setThumbStudioOpen(false)}
          media={media}
          onPick={(uri, _atSec) => {
            if (thumbStudioMode === 'primary') setCustomCoverUri(uri);
            else setCoverAltUri(uri);
          }}
        />
      ) : null}
      <ClipSplitterModal
        visible={clipSplitOpen}
        onClose={() => setClipSplitOpen(false)}
        durationSec={Math.max(8, media?.duration ?? 60)}
        onSplit={(slices) => {
          setClipSplitOpen(false);
          const total = slices.length;
          setSeriesSelection((prev) =>
            prev
              ? { ...prev, seriesTotal: Math.max(prev.seriesTotal, total) }
              : startNewSeries({ totalPlanned: total }),
          );
          toast.show(
            `Marked as ${total}-part series (plan). Same upload — trim per part in an external editor until in-app trim ships.`,
            'info',
          );
        }}
      />
      <MultiClipStitchModal
        visible={stitchOpen}
        onClose={() => setStitchOpen(false)}
        primary={media}
        onConfirm={(clips) => {
          setFollowUpClips(clips);
          setSeriesSelection((prev) => {
            const total = 1 + clips.length;
            if (prev) return { ...prev, seriesTotal: Math.max(prev.seriesTotal, total) };
            return startNewSeries({ totalPlanned: total });
          });
          setStitchOpen(false);
          toast.show(`${clips.length} clip(s) queued — post this video first, then tap Post for each queued clip.`, 'success');
        }}
      />

      <View style={[styles.header, { paddingTop: insets.top + 8 }]}>
        <TouchableOpacity onPress={() => router.back()} activeOpacity={0.7}>
          <Ionicons name="arrow-back" size={24} color={colors.dark.text} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>
          {mode === 'record' ? 'Record Video' : 'Upload Video'}
        </Text>
        <TouchableOpacity onPress={handlePost} activeOpacity={0.7} disabled={posting || !canPost}>
          {posting ? (
            <View style={styles.postingRow}>
              <ActivityIndicator size="small" color={colors.primary.teal} />
              {compressPct != null ? (
                <Text style={styles.postingText}>Optimizing {compressPct}%</Text>
              ) : null}
            </View>
          ) : (
            <LinearGradient
              colors={canPost ? [colors.primary.teal, colors.primary.royal] : [colors.dark.cardAlt, colors.dark.cardAlt]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={styles.postBtnGradient}
            >
              <Text style={[styles.postBtnText, !canPost && { opacity: 0.4 }]}>Post</Text>
            </LinearGradient>
          )}
        </TouchableOpacity>
      </View>

      {soundPostIdTrim && soundSourcePost ? (
        <View style={styles.soundBanner}>
          <Ionicons name="musical-notes" size={18} color={colors.primary.gold} />
          <Text style={styles.soundBannerText} numberOfLines={2}>
            Filming with sound from {soundSourcePost.creator.displayName}
            {soundSourcePost.soundTitle ? ` · ${soundSourcePost.soundTitle}` : ''}
          </Text>
        </View>
      ) : null}

      {duetPostIdTrim && duetParentPost ? (
        <View style={styles.duetBanner}>
          <Ionicons name="git-branch-outline" size={18} color={colors.primary.teal} />
          <Text style={styles.duetBannerText} numberOfLines={3}>
            Duet: original clip from {duetParentPost.creator.displayName} appears on the left in the feed. Record your
            reaction on the right.
          </Text>
        </View>
      ) : null}

      {showDraftHint ? (
        <View style={styles.draftHint}>
          <Ionicons name="document-text-outline" size={18} color={colors.primary.teal} />
          <Text style={styles.draftHintText}>Picking up where you left off — draft fields loaded.</Text>
          <TouchableOpacity onPress={() => setShowDraftHint(false)} hitSlop={10}>
            <Ionicons name="close" size={20} color={colors.dark.textMuted} />
          </TouchableOpacity>
        </View>
      ) : null}

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
        {media ? (
          <>
            <View style={styles.videoPreviewWrap}>
            <ComposableVideoPreview
              key={media.uri}
              uri={media.uri}
              playbackRate={previewPlaybackRate}
              filter={filterPreset}
              overlayText={overlayLine}
              previewMuted={Boolean(soundPostIdTrim) || !originalAudioOn}
              previewVolume={originalAudioOn && !soundPostIdTrim ? originalAudioMix : 0}
            />
            {durationStr ? (
              <View style={[styles.durationBadge, !durationValid && styles.durationBadgeError]}>
                <Ionicons name="time-outline" size={12} color={colors.onVideo.primary} />
                <Text style={styles.durationText}>{durationStr}</Text>
                {!durationValid && (
                  <Text style={styles.durationText}>
                    {durationSec < VIDEO_MIN_SECONDS ? '(too short)' : '(too long)'}
                  </Text>
                )}
              </View>
            ) : null}
            <TouchableOpacity style={styles.removeBtn} onPress={() => setMedia(null)}>
              <Ionicons name="close-circle" size={26} color={colors.onVideo.primary} />
            </TouchableOpacity>
          </View>
            <View style={styles.waveOuter}>
              <WaveformTimeline
                uri={media.uri}
                durationSec={media.duration ?? null}
                trimStart={trimStart}
                trimEnd={trimEnd ?? media.duration ?? null}
              />
            </View>
            {media.duration != null &&
            media.duration >= VIDEO_MIN_SECONDS &&
            media.duration > 6 ? (
              <View style={{ width: '100%', paddingHorizontal: 16, marginBottom: 8, gap: 6 }}>
                <Text style={styles.proSub}>
                  Trim in / out (planning markers — full file still uploads until server-side trim lands)
                </Text>
                <Text style={{ fontSize: 10, fontWeight: '700', color: colors.dark.textMuted }}>
                  Start {trimStart.toFixed(1)}s · End {(trimEnd ?? media.duration).toFixed(1)}s
                </Text>
                <Slider
                  style={{ width: '100%', height: 32 }}
                  minimumValue={0}
                  maximumValue={Math.max(0, (trimEnd ?? media.duration!) - 5)}
                  value={trimStart}
                  onValueChange={(v) => {
                    const d = media.duration;
                    if (d == null) return;
                    const end = trimEnd ?? d;
                    const nextStart = Math.min(v, end - 5);
                    setTrimStart(nextStart);
                  }}
                  minimumTrackTintColor={colors.primary.teal}
                  maximumTrackTintColor={colors.dark.border}
                  thumbTintColor={colors.primary.teal}
                />
                <Slider
                  style={{ width: '100%', height: 32 }}
                  minimumValue={trimStart + 5}
                  maximumValue={media.duration!}
                  value={Math.max(trimStart + 5, trimEnd ?? media.duration!)}
                  onValueChange={(v) => {
                    const d = media.duration;
                    if (d == null) return;
                    setTrimEnd(Math.min(v, d));
                  }}
                  minimumTrackTintColor={colors.primary.teal}
                  maximumTrackTintColor={colors.dark.border}
                  thumbTintColor={colors.primary.gold}
                />
              </View>
            ) : null}
            {durationSec >= 50 ? <SmartTrimCard durationSec={durationSec} /> : null}
          </>
        ) : null}

        {media ? (
          <View style={styles.proPanel}>
            <Text style={styles.proLabel}>Creator tools</Text>
            <VideoHygieneCard />
            <BrollSoonCard />
            <CoCreateRoadmapCard />
            <Text style={styles.aspectHint}>Vertical 9:16 looks best in the feed — preview is cropped to fill.</Text>
            <Text style={styles.proSub}>Preview playback speed (does not change the uploaded file yet)</Text>
            <View style={styles.chipRow}>
              {[0.5, 1, 1.5, 2].map((r) => (
                <TouchableOpacity
                  key={r}
                  style={[styles.miniChip, previewPlaybackRate === r && styles.miniChipOn]}
                  onPress={() => setPreviewPlaybackRate(r)}
                >
                  <Text style={[styles.miniChipText, previewPlaybackRate === r && styles.miniChipTextOn]}>
                    {r === 1 ? '1×' : `${r}×`}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
            <Text style={styles.proSub}>Color grade (preview only)</Text>
            <View style={styles.chipRow}>
              {EDITOR_FILTER_IDS.map((f) => {
                const meta = VIDEO_LOOKS.find((l) => l.id === f);
                if (!meta) return null;
                return (
                  <TouchableOpacity
                    key={f}
                    style={[styles.miniChip, filterPreset === f && styles.miniChipOn]}
                    onPress={() => setFilterPreset(f)}
                  >
                    <Text style={[styles.miniChipText, filterPreset === f && styles.miniChipTextOn]}>
                      {meta.label}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>
            <SpeedRampEditor
              rates={speedRamp}
              onChange={(r) => {
                setSpeedRamp(r);
                setPreviewPlaybackRate(r.mid);
              }}
              effectivePreview={previewPlaybackRate}
              onPreviewChange={setPreviewPlaybackRate}
            />
            {!soundPostIdTrim ? (
              <TouchableOpacity
                style={styles.secondaryFullBtn}
                onPress={() => setOriginalAudioOn(!originalAudioOn)}
                activeOpacity={0.85}
              >
                <Ionicons
                  name={originalAudioOn ? 'volume-high-outline' : 'volume-mute-outline'}
                  size={18}
                  color={colors.primary.teal}
                />
                <Text style={styles.secondaryFullBtnText}>
                  {originalAudioOn ? 'Original audio ON in preview' : 'Original audio muted in preview'}
                </Text>
              </TouchableOpacity>
            ) : null}
            {originalAudioOn && !soundPostIdTrim ? (
              <View style={{ marginBottom: 10, paddingHorizontal: 2 }}>
                <Text style={styles.proSub}>Original level in preview (upload file unchanged)</Text>
                <Slider
                  style={{ width: '100%', height: 36 }}
                  minimumValue={0}
                  maximumValue={1}
                  value={originalAudioMix}
                  onValueChange={setOriginalAudioMix}
                  minimumTrackTintColor={colors.primary.teal}
                  maximumTrackTintColor={colors.dark.border}
                  thumbTintColor={colors.primary.teal}
                />
              </View>
            ) : null}
            <TouchableOpacity
              style={styles.secondaryFullBtn}
              onPress={() => {
                setThumbStudioMode('primary');
                setThumbStudioOpen(true);
              }}
              activeOpacity={0.85}
            >
              <Ionicons name="image-outline" size={18} color={colors.primary.teal} />
              <Text style={styles.secondaryFullBtnText}>Thumbnail studio</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.secondaryFullBtn}
              onPress={() => {
                setThumbStudioMode('alt');
                setThumbStudioOpen(true);
              }}
              activeOpacity={0.85}
            >
              <Ionicons name="layers-outline" size={18} color={colors.primary.teal} />
              <Text style={styles.secondaryFullBtnText}>Alt cover (A/B test)</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.secondaryFullBtn} onPress={() => setClipSplitOpen(true)} activeOpacity={0.85}>
              <Ionicons name="albums-outline" size={18} color={colors.primary.teal} />
              <Text style={styles.secondaryFullBtnText}>Clip split planner</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.secondaryFullBtn} onPress={() => {
              if (!media) {
                toast.show('Add a video first', 'info');
                return;
              }
              setStitchOpen(true);
            }} activeOpacity={0.85}>
              <Ionicons name="git-merge-outline" size={18} color={colors.primary.teal} />
              <Text style={styles.secondaryFullBtnText}>Queue clips for series</Text>
            </TouchableOpacity>
            <View style={styles.soundDiscoverRow}>
              <TouchableOpacity
                style={styles.secondaryFullBtn}
                onPress={() => router.push('/discover')}
                activeOpacity={0.85}
              >
                <Ionicons name="musical-notes-outline" size={18} color={colors.primary.teal} />
                <Text style={styles.secondaryFullBtnText}>Browse sounds & trends</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.secondaryFullBtn}
                onPress={() => router.push('/create/video-camera')}
                activeOpacity={0.85}
              >
                <Ionicons name="videocam-outline" size={18} color={colors.primary.teal} />
                <Text style={styles.secondaryFullBtnText}>Open full-screen camera</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.secondaryFullBtn}
                onPress={async () => {
                  const a = await pickVideoFromGallery();
                  if (a) setMedia(a);
                }}
                activeOpacity={0.85}
              >
                <Ionicons name="cut-outline" size={18} color={colors.primary.teal} />
                <Text style={styles.secondaryFullBtnText}>Replace / re-trim video (Gallery)</Text>
              </TouchableOpacity>
            </View>
          </View>
        ) : null}

        {media ? null : (
          <View style={styles.emptyPreview}>
            <View style={styles.emptyIconWrap}>
              <Ionicons
                name={mode === 'record' ? 'videocam' : 'cloud-upload'}
                size={48}
                color={colors.dark.textMuted}
              />
            </View>
            <Text style={styles.emptyText}>Use Studio camera or Gallery to add a clip</Text>
            <Text style={styles.durationHint}>
              Up to {VIDEO_MAX_SECONDS / 60} min  •  Go Live for longer content
            </Text>
          </View>
        )}

        <View style={styles.mediaActions}>
          <TouchableOpacity
            style={styles.actionBtn}
            onPress={() => router.push('/create/video-camera')}
            activeOpacity={0.8}
          >
            <LinearGradient
              colors={['#EF444420', '#DC262608']}
              style={styles.actionBtnInner}
            >
              <View style={styles.actionIconWrap}>
                <Ionicons name="videocam" size={22} color="#EF4444" />
              </View>
              <Text style={[styles.actionText, { color: '#EF4444' }]}>Studio camera</Text>
            </LinearGradient>
          </TouchableOpacity>
          <TouchableOpacity style={styles.actionBtn} onPress={handleUpload} activeOpacity={0.8}>
            <LinearGradient
              colors={['#3B82F620', '#2563EB08']}
              style={styles.actionBtnInner}
            >
              <View style={styles.actionIconWrap}>
                <Ionicons name="cloud-upload" size={22} color="#3B82F6" />
              </View>
              <Text style={[styles.actionText, { color: '#3B82F6' }]}>Gallery</Text>
            </LinearGradient>
          </TouchableOpacity>
        </View>

        <View style={styles.proPanel}>
          <Text style={styles.proLabel}>More creator tools</Text>
          <TouchableOpacity
            style={styles.secondaryFullBtn}
            onPress={() => setBrandKitOpen(true)}
            activeOpacity={0.85}
          >
            <Ionicons name="color-wand-outline" size={18} color={colors.primary.teal} />
            <Text style={styles.secondaryFullBtnText}>Brand kit</Text>
          </TouchableOpacity>
          <MoodPresetPicker selected={moodId} onSelect={applyMoodPreset} />
          <View style={{ gap: 10 }}>
            <PHIGuardrailBanner findings={phiFindings} acknowledged={phiAck} onAcknowledge={() => setPhiAck(true)} />
            <EducationModeToggle
              enabled={educationOn}
              onToggle={setEducationOn}
              citations={citations}
              onChange={(next) => setCitations(next.slice(0, 5))}
            />
            <SeriesModePicker userId={user?.id ?? null} selection={seriesSelection} onChange={setSeriesSelection} />
            <SchedulePostPicker scheduledAt={scheduledAt} onChange={setScheduledAt} />
          </View>
        </View>

        <View style={styles.fieldGroup}>
          <Text style={styles.label}>Headline (optional)</Text>
          <TextInput
            style={styles.input}
            value={shortTitle}
            onChangeText={setShortTitle}
            placeholder="Short title — shows above your caption in the feed"
            placeholderTextColor={colors.dark.textMuted}
            editable={!posting}
            maxLength={120}
          />
        </View>

        <View style={styles.fieldGroup}>
          <Text style={styles.label}>On-video text (optional)</Text>
          <TextInput
            style={styles.input}
            value={overlayLine}
            onChangeText={setOverlayLine}
            placeholder="Sticker-style line on the preview — also added to caption when you post"
            placeholderTextColor={colors.dark.textMuted}
            editable={!posting}
            maxLength={80}
          />
        </View>

        <View style={styles.fieldGroup}>
          <Text style={styles.label}>Caption</Text>
          <TextInput
            style={styles.captionInput}
            value={caption}
            onChangeText={setCaption}
            placeholder="What's on your mind?"
            placeholderTextColor={colors.dark.textMuted}
            multiline
            numberOfLines={4}
            editable={!posting}
          />
        </View>

        {!soundPostIdTrim ? (
          <View style={styles.fieldGroup}>
            <View style={styles.labelRow}>
              <Text style={styles.label}>Name this sound (optional)</Text>
              <Text style={styles.labelHint}>{soundTitle.length}/60</Text>
            </View>
            <TextInput
              style={styles.input}
              value={soundTitle}
              onChangeText={(t) => setSoundTitle(t.slice(0, 60))}
              placeholder="e.g. ICU shift vibes · part 2"
              placeholderTextColor={colors.dark.textMuted}
              editable={!posting}
              maxLength={60}
              returnKeyType="done"
            />
            <Text style={styles.helperText}>
              Shown in the Sounds search and on every clip that uses your audio. Leave blank and we&apos;ll attribute it to your handle.
            </Text>
          </View>
        ) : null}

        <View style={styles.fieldGroup}>
          <Text style={styles.label}>Hashtags</Text>
          <TextInput
            style={styles.input}
            value={hashtags}
            onChangeText={setHashtags}
            placeholder="#NurseLife #ICU #NightShift"
            placeholderTextColor={colors.dark.textMuted}
            editable={!posting}
          />
        </View>

        {duetPostIdTrim ? (
          <View style={styles.fieldGroup}>
            <Text style={styles.label}>Evidence link (optional)</Text>
            <TextInput
              style={styles.input}
              value={evidenceUrl}
              onChangeText={setEvidenceUrl}
              placeholder="https://guideline.org/… or PubMed link"
              placeholderTextColor={colors.dark.textMuted}
              editable={!posting}
              autoCapitalize="none"
              keyboardType="url"
            />
            <Text style={styles.label}>Evidence label (optional)</Text>
            <TextInput
              style={styles.input}
              value={evidenceLabel}
              onChangeText={setEvidenceLabel}
              placeholder="e.g. CDC hand hygiene 2024"
              placeholderTextColor={colors.dark.textMuted}
              editable={!posting}
            />
          </View>
        ) : null}

        <View style={styles.optionsRow}>
          <TouchableOpacity
            style={[styles.optionChip, privacy === 'followers' && styles.optionChipActive]}
            activeOpacity={0.7}
            onPress={() => setPrivacy(privacy === 'public' ? 'followers' : 'public')}
          >
            <Ionicons
              name={privacy === 'public' ? 'earth-outline' : 'people-outline'}
              size={18}
              color={privacy === 'public' ? colors.dark.textSecondary : colors.primary.teal}
            />
            <Text style={[styles.optionText, privacy === 'followers' && styles.optionTextActive]}>
              {privacy === 'public' ? 'Public' : 'Followers'}
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.optionChip, !commentsOn && styles.optionChipActive]}
            activeOpacity={0.7}
            onPress={() => setCommentsOn(!commentsOn)}
          >
            <Ionicons
              name={commentsOn ? 'chatbubble-outline' : 'chatbubble-ellipses-outline'}
              size={18}
              color={commentsOn ? colors.dark.textSecondary : '#EF4444'}
            />
            <Text style={[styles.optionText, !commentsOn && { color: '#EF4444' }]}>
              {commentsOn ? 'Comments On' : 'Comments Off'}
            </Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.dark.bg },
  header: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingHorizontal: 16, paddingBottom: 12,
    borderBottomWidth: 1, borderBottomColor: colors.dark.border,
  },
  headerTitle: { fontSize: 17, fontWeight: '800', color: colors.dark.text },
  soundBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginHorizontal: 16,
    marginBottom: 10,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 12,
    backgroundColor: colors.dark.card,
    borderWidth: 1,
    borderColor: colors.primary.gold + '44',
  },
  soundBannerText: { flex: 1, fontSize: 13, fontWeight: '600', color: colors.dark.textSecondary, lineHeight: 18 },
  duetBanner: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
    marginHorizontal: 16,
    marginBottom: 10,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 12,
    backgroundColor: colors.dark.card,
    borderWidth: 1,
    borderColor: colors.primary.teal + '55',
  },
  duetBannerText: { flex: 1, fontSize: 13, fontWeight: '600', color: colors.dark.textSecondary, lineHeight: 18 },
  shiftRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 8 },
  shiftChip: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: colors.dark.cardAlt,
    borderWidth: 1,
    borderColor: colors.dark.border,
  },
  shiftChipOn: {
    borderColor: colors.primary.teal,
    backgroundColor: colors.primary.teal + '22',
  },
  shiftChipText: { fontSize: 12, fontWeight: '700', color: colors.dark.textSecondary, textTransform: 'capitalize' },
  shiftChipTextOn: { color: colors.primary.teal },
  postBtnGradient: {
    paddingHorizontal: 20, paddingVertical: 8, borderRadius: 20,
  },
  postBtnText: { fontSize: 14, fontWeight: '800', color: colors.dark.text },
  postingRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  postingText: { fontSize: 12, fontWeight: '700', color: colors.primary.teal },
  content: { padding: 16, gap: 20, paddingBottom: 100 },

  videoPreviewWrap: {
    height: 240, borderRadius: 20, overflow: 'hidden',
    backgroundColor: colors.dark.card, borderWidth: 1, borderColor: colors.dark.border,
  },
  waveOuter: { alignItems: 'center', marginBottom: 4 },
  durationBadge: {
    position: 'absolute', bottom: 12, left: 12,
    backgroundColor: 'rgba(0,0,0,0.7)', paddingHorizontal: 10, paddingVertical: 5,
    borderRadius: 8, flexDirection: 'row', alignItems: 'center', gap: 4,
  },
  durationText: { color: colors.onVideo.primary, fontSize: 12, fontWeight: '700' },
  durationBadgeError: { backgroundColor: 'rgba(239,68,68,0.85)' },
  removeBtn: {
    position: 'absolute', top: 10, right: 10,
    backgroundColor: 'rgba(0,0,0,0.5)', borderRadius: 13,
  },

  emptyPreview: {
    height: 200, borderRadius: 20, overflow: 'hidden',
    backgroundColor: colors.dark.card, borderWidth: 1, borderColor: colors.dark.border,
    borderStyle: 'dashed', alignItems: 'center', justifyContent: 'center', gap: 12,
  },
  emptyIconWrap: {
    width: 80, height: 80, borderRadius: 40,
    backgroundColor: colors.dark.cardAlt,
    alignItems: 'center', justifyContent: 'center',
  },
  emptyText: { fontSize: 14, color: colors.dark.textMuted, fontWeight: '500' },
  durationHint: {
    fontSize: 12, color: colors.dark.textMuted, fontWeight: '600',
    opacity: 0.7, marginTop: 4,
  },

  mediaActions: { flexDirection: 'row', gap: 12 },
  actionBtn: { flex: 1 },
  actionBtnInner: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: 8, paddingVertical: 14, borderRadius: 14,
    borderWidth: 1, borderColor: colors.dark.border,
  },
  actionIconWrap: {
    width: 36, height: 36, borderRadius: 10,
    alignItems: 'center', justifyContent: 'center',
  },
  actionText: { fontSize: 14, fontWeight: '700' },

  fieldGroup: { gap: 8 },
  label: { fontSize: 13, fontWeight: '700', color: colors.dark.textSecondary, marginLeft: 4 },
  labelRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginRight: 4 },
  labelHint: { fontSize: 12, fontWeight: '600', color: colors.dark.textMuted },
  helperText: { fontSize: 12, color: colors.dark.textMuted, marginLeft: 4, marginTop: 2, lineHeight: 16 },
  captionInput: {
    backgroundColor: colors.dark.card, borderRadius: 14,
    paddingHorizontal: 16, paddingVertical: 14, fontSize: 15,
    color: colors.dark.text, height: 110, textAlignVertical: 'top',
    borderWidth: 1, borderColor: colors.dark.border,
  },
  input: {
    backgroundColor: colors.dark.card, borderRadius: 14,
    paddingHorizontal: 16, paddingVertical: 14, fontSize: 15,
    color: colors.dark.text, borderWidth: 1, borderColor: colors.dark.border,
  },

  optionsRow: { flexDirection: 'row', gap: 10 },
  optionChip: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    backgroundColor: colors.dark.card, borderRadius: 12,
    paddingHorizontal: 14, paddingVertical: 10,
    borderWidth: 1, borderColor: colors.dark.border,
  },
  optionText: { fontSize: 13, fontWeight: '600', color: colors.dark.textSecondary },
  optionChipActive: { borderColor: colors.primary.teal },
  optionTextActive: { color: colors.primary.teal },

  draftHint: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginHorizontal: 16,
    marginBottom: 8,
    padding: 12,
    borderRadius: 12,
    backgroundColor: colors.primary.teal + '18',
    borderWidth: 1,
    borderColor: colors.primary.teal + '44',
  },
  draftHintText: { flex: 1, fontSize: 13, fontWeight: '600', color: colors.dark.textSecondary },

  previewStickerWrap: {
    position: 'absolute',
    bottom: 52,
    left: 12,
    right: 12,
    alignItems: 'center',
  },
  previewStickerText: {
    color: '#FFF',
    fontSize: 16,
    fontWeight: '900',
    textAlign: 'center',
    textShadowColor: 'rgba(0,0,0,0.75)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 4,
  },

  proPanel: {
    gap: 8,
    padding: 14,
    borderRadius: 16,
    backgroundColor: colors.dark.card,
    borderWidth: 1,
    borderColor: colors.dark.border,
  },
  proLabel: { fontSize: 14, fontWeight: '800', color: colors.dark.text },
  proSub: { fontSize: 12, fontWeight: '600', color: colors.dark.textMuted, marginTop: 4 },
  aspectHint: {
    fontSize: 12,
    color: colors.dark.textSecondary,
    lineHeight: 17,
    fontWeight: '600',
  },
  chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 6 },
  miniChip: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 999,
    backgroundColor: colors.dark.cardAlt,
    borderWidth: 1,
    borderColor: colors.dark.border,
  },
  miniChipOn: {
    borderColor: colors.primary.teal,
    backgroundColor: colors.primary.teal + '22',
  },
  miniChipText: { fontSize: 12, fontWeight: '800', color: colors.dark.textMuted },
  miniChipTextOn: { color: colors.primary.teal },
  soundDiscoverRow: { gap: 10, marginTop: 8 },
  secondaryFullBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingVertical: 12,
    paddingHorizontal: 12,
    borderRadius: 12,
    backgroundColor: colors.dark.cardAlt,
    borderWidth: 1,
    borderColor: colors.dark.border,
  },
  secondaryFullBtnText: { flex: 1, fontSize: 13, fontWeight: '700', color: colors.dark.text },
});
