import React, { useState, useEffect } from 'react';
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

/** RN `Image` cannot decode video URIs — use expo-video so gallery/camera clips show a real preview. */
function DraftVideoPreview({ uri }: { uri: string }) {
  const player = useVideoPlayer(uri, (p) => {
    p.loop = true;
    p.muted = true;
    p.volume = 0;
    p.play();
  });

  return (
    <>
      <VideoView
        player={player}
        style={StyleSheet.absoluteFillObject}
        contentFit="cover"
        nativeControls={false}
      />
      <VideoBrandWatermark compact position="bottom-center" edgeOffset={10} variant="subtle" />
    </>
  );
}

export default function CreateVideoScreen() {
  const router = useRouter();
  const { mode, soundPostId: soundPostIdRaw, duetPostId: duetPostIdRaw } = useLocalSearchParams<{
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
  const [community, setCommunity] = useState('');
  const [privacy, setPrivacy] = useState<'public' | 'followers'>('public');
  const [commentsOn, setCommentsOn] = useState(true);
  const [evidenceUrl, setEvidenceUrl] = useState('');
  const [evidenceLabel, setEvidenceLabel] = useState('');
  const [shiftContext, setShiftContext] = useState<'' | 'day' | 'night' | 'weekend' | 'any'>('');

  useEffect(() => {
    loadDraft('video').then((draft) => {
      if (draft) {
        setCaption(draft.caption ?? '');
        setHashtags(draft.hashtags ?? '');
        setSoundTitle(draft.soundTitle ?? '');
      }
    });

    if (mode === 'record') handleRecord();
    else if (mode === 'upload') handleUpload();
  }, []);

  useEffect(() => {
    if (caption || hashtags || soundTitle) saveDraft('video', { caption, hashtags, soundTitle });
  }, [caption, hashtags, soundTitle]);

  const handleRecord = async () => {
    const asset = await recordVideo();
    if (asset) setMedia(asset);
  };

  const handleUpload = async () => {
    const asset = await pickVideoFromGallery();
    if (asset) setMedia(asset);
  };

  const handlePost = async () => {
    if (!caption.trim() && !media) {
      toast.show('Add a video or caption', 'error');
      return;
    }
    if (media?.duration != null && media.duration > VIDEO_MAX_SECONDS) {
      toast.show(`Video can't exceed ${VIDEO_MAX_SECONDS / 60} minutes`, 'error');
      return;
    }
    if (!checkRateLimit('post')) return;

    if (!user) {
      toast.show('Not signed in', 'error');
      return;
    }

    setPosting(true);
    try {
      let mediaUrl: string | undefined;
      if (media) {
        try {
          // Re-encode 4K (or anything >1080p) down to 1080p before upload so the
          // server-side export pipeline never has to swallow a 25 Mbps source.
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

      const tags = hashtags.split(/[\s,]+/).filter((t) => t.startsWith('#')).map((t) => t.slice(1));
      const postType = mediaUrl?.trim() ? 'video' : 'text';
      const sid = soundPostIdTrim;
      // Only wait while the sound source query is in flight — if it fails/missing, post video without sound tags.
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
      /**
       * Borrowed-audio path: prefer the source post's existing sound_title,
       * else attribute by handle ("Sound by @handle") rather than the old
       * generic "Original sound · DisplayName" so the search Sounds tab
       * shows something meaningful for everyone re-using this audio.
       */
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

      /**
       * Own-original path: when the creator typed a name in the new "Name
       * this sound" field, seed posts.sound_title so the audio is labelled
       * consistently across the feed and search. When blank we leave the
       * column null and let the server-side RPC fallback do the work.
       */
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
              ...(shiftContext ? { shift_context: shiftContext } : {}),
            }
          : {};

      const created = await postsService.create({
        creator_id: user.id,
        type: postType,
        caption: caption.trim(),
        media_url: mediaUrl?.trim(),
        hashtags: tags.length > 0 ? tags : undefined,
        feed_type_eligible: ['forYou', 'following'],
        privacy_mode: privacy,
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
      clearDraft('video');
      await invalidatePostRelatedQueries(queryClient, { creatorId: user.id });
      setShowSuccess(true);
    } catch (err: any) {
      toast.show(err.message ?? 'Something went wrong', 'error');
    } finally {
      setPosting(false);
    }
  };

  const durationSec = media?.duration ?? 0;
  const durationValid = !media || (durationSec >= VIDEO_MIN_SECONDS && durationSec <= VIDEO_MAX_SECONDS);
  const canPost = (caption.trim().length > 0 || !!media) && durationValid;

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

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
        {media ? (
          <View style={styles.videoPreviewWrap}>
            <DraftVideoPreview key={media.uri} uri={media.uri} />
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
        ) : (
          <View style={styles.emptyPreview}>
            <View style={styles.emptyIconWrap}>
              <Ionicons
                name={mode === 'record' ? 'videocam' : 'cloud-upload'}
                size={48}
                color={colors.dark.textMuted}
              />
            </View>
            <Text style={styles.emptyText}>
              {mode === 'record' ? 'Tap below to start recording' : 'Tap below to choose a video'}
            </Text>
            <Text style={styles.durationHint}>
              Up to {VIDEO_MAX_SECONDS / 60} min  •  Go Live for longer content
            </Text>
          </View>
        )}

        <View style={styles.mediaActions}>
          <TouchableOpacity style={styles.actionBtn} onPress={handleRecord} activeOpacity={0.8}>
            <LinearGradient
              colors={['#EF444420', '#DC262608']}
              style={styles.actionBtnInner}
            >
              <View style={styles.actionIconWrap}>
                <Ionicons name="videocam" size={22} color="#EF4444" />
              </View>
              <Text style={[styles.actionText, { color: '#EF4444' }]}>Record</Text>
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
            <Text style={styles.label}>Shift context (optional)</Text>
            <View style={styles.shiftRow}>
              {(['day', 'night', 'weekend', 'any'] as const).map((k) => (
                <TouchableOpacity
                  key={k}
                  style={[styles.shiftChip, shiftContext === k && styles.shiftChipOn]}
                  onPress={() => setShiftContext((c) => (c === k ? '' : k))}
                  activeOpacity={0.8}
                >
                  <Text style={[styles.shiftChipText, shiftContext === k && styles.shiftChipTextOn]}>{k}</Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>
        ) : null}

        <View style={styles.fieldGroup}>
          <Text style={styles.label}>Community (optional)</Text>
          <TextInput
            style={styles.input}
            value={community}
            onChangeText={setCommunity}
            placeholder="Post to a community..."
            placeholderTextColor={colors.dark.textMuted}
            editable={!posting}
          />
        </View>

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
});
