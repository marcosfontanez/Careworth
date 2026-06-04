import React, { useCallback, useMemo, useRef, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  TextInput,
  ActivityIndicator,
  Image,
  Platform,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useVideoPlayer, VideoView } from 'expo-video';
import Slider from '@react-native-community/slider';

import { colors } from '@/theme';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/components/ui/Toast';
import { pickVideoFromGallery, pickImageFromGallery, type MediaAsset } from '@/lib/media';
import { probeVideoFile, makeVideoThumbnail } from '@/lib/videoMetadata';
import { compressVideoIfTooLarge, VIDEO_UPLOAD_MAX_LONG_EDGE } from '@/lib/videoCompression';
import { storageService, STORAGE_BUCKETS } from '@/lib/storage';
import { postsService, enqueueCreatorMediaJob, waitForCreatorMediaJob } from '@/services/supabase';
import { invalidatePostRelatedQueries } from '@/lib/invalidatePostQueries';
import { openMyPulse } from '@/lib/navigation/pulsePageRoutes';
import { VideoPublishSuccessSheet } from '@/components/create/VideoPublishSuccessSheet';
import { useQueryClient } from '@tanstack/react-query';
import {
  GREEN_SCREEN_LIMITS,
  GREEN_SCREEN_DEFAULTS,
  GREEN_SCREEN_KEY_PRESETS,
  GREEN_SCREEN_AUDIO_OPTIONS,
  validateGreenScreen,
  buildGreenScreenPayload,
  greenScreenRenderFailureMessage,
  type GreenScreenAudioMode,
  type GreenScreenBackgroundType,
} from '@/lib/broll/greenScreen';

type ForegroundClip = { asset: MediaAsset; durationSec: number };
type Background = { asset: MediaAsset; type: GreenScreenBackgroundType };

/** Approximate preview: background fills the canvas, foreground sits on top (not keyed). */
function GreenScreenPreview({ foreground, background }: { foreground: ForegroundClip; background: Background | null }) {
  const fgPlayer = useVideoPlayer(foreground.asset.uri, (p) => {
    p.loop = true;
    p.muted = true;
    p.play();
  });
  const bgVideoPlayer = useVideoPlayer(background?.type === 'video' ? background.asset.uri : '', (p) => {
    p.loop = true;
    p.muted = true;
    if (background?.type === 'video') p.play();
  });

  return (
    <View style={styles.previewBox}>
      {background ? (
        background.type === 'image' ? (
          <Image source={{ uri: background.asset.uri }} style={StyleSheet.absoluteFillObject} resizeMode="cover" />
        ) : (
          <VideoView
            player={bgVideoPlayer}
            style={StyleSheet.absoluteFillObject}
            contentFit="cover"
            nativeControls={false}
            {...(Platform.OS === 'android' ? { surfaceType: 'textureView' as const } : {})}
          />
        )
      ) : (
        <View style={[StyleSheet.absoluteFillObject, styles.previewEmptyBg]} />
      )}
      <VideoView
        player={fgPlayer}
        style={StyleSheet.absoluteFillObject}
        contentFit="cover"
        nativeControls={false}
        {...(Platform.OS === 'android' ? { surfaceType: 'textureView' as const } : {})}
      />
      <View style={styles.previewBadge}>
        <Ionicons name="sparkles-outline" size={12} color="#fff" />
        <Text style={styles.previewBadgeText}>Green removed on final render</Text>
      </View>
    </View>
  );
}

/** Self-contained Green Screen flow embedded inside B-roll Studio (Green Screen mode). */
export function GreenScreenComposer() {
  const router = useRouter();
  const { user } = useAuth();
  const toast = useToast();
  const queryClient = useQueryClient();

  const [foreground, setForeground] = useState<ForegroundClip | null>(null);
  const [background, setBackground] = useState<Background | null>(null);
  const [keyColor, setKeyColor] = useState<string>(GREEN_SCREEN_DEFAULTS.keyColor);
  const [strength, setStrength] = useState<number>(GREEN_SCREEN_DEFAULTS.strength);
  const [edgeSoftness, setEdgeSoftness] = useState<number>(GREEN_SCREEN_DEFAULTS.edgeSoftness);
  const [audioMode, setAudioMode] = useState<GreenScreenAudioMode>(GREEN_SCREEN_DEFAULTS.audioMode);
  const [caption, setCaption] = useState('');
  const [pickingFg, setPickingFg] = useState(false);
  const [pickingBg, setPickingBg] = useState(false);
  const [posting, setPosting] = useState(false);
  const [progressLabel, setProgressLabel] = useState<string | null>(null);
  const [showSuccess, setShowSuccess] = useState(false);
  const postingRef = useRef(false);

  const fgDur = foreground?.durationSec ?? 0;

  const validation = useMemo(
    () => validateGreenScreen({ hasForeground: !!foreground, hasBackground: !!background, foregroundDurationSec: fgDur }),
    [foreground, background, fgDur],
  );
  const canPost = !!foreground && !!background && !!user?.id && validation.ok && !posting;

  const pickForeground = useCallback(async () => {
    if (pickingFg) return;
    setPickingFg(true);
    try {
      const asset = await pickVideoFromGallery();
      if (!asset) return;
      let dur = asset.duration ?? 0;
      if (!dur) {
        const probed = await probeVideoFile(asset.uri).catch(() => ({}) as { duration?: number });
        dur = probed.duration ?? 0;
      }
      if (dur > 0 && dur > GREEN_SCREEN_LIMITS.foregroundMaxSec + 0.5) {
        toast.show(`Foreground must be ${GREEN_SCREEN_LIMITS.foregroundMaxSec}s or shorter.`, 'error');
        return;
      }
      setForeground({ asset, durationSec: dur });
    } catch {
      toast.show('Could not read this foreground video.', 'error');
    } finally {
      setPickingFg(false);
    }
  }, [pickingFg, toast]);

  const pickBackground = useCallback(
    async (type: GreenScreenBackgroundType) => {
      if (pickingBg) return;
      setPickingBg(true);
      try {
        const asset = type === 'image' ? await pickImageFromGallery() : await pickVideoFromGallery();
        if (!asset) return;
        if (type === 'video') {
          let dur = asset.duration ?? 0;
          if (!dur) {
            const probed = await probeVideoFile(asset.uri).catch(() => ({}) as { duration?: number });
            dur = probed.duration ?? 0;
          }
          if (dur > 0 && dur > GREEN_SCREEN_LIMITS.backgroundMaxSec + 0.5) {
            toast.show(`Background video must be ${GREEN_SCREEN_LIMITS.backgroundMaxSec}s or shorter.`, 'error');
            return;
          }
        }
        setBackground({ asset, type });
      } catch {
        toast.show('Could not read this background.', 'error');
      } finally {
        setPickingBg(false);
      }
    },
    [pickingBg, toast],
  );

  const resetControls = useCallback(() => {
    setKeyColor(GREEN_SCREEN_DEFAULTS.keyColor);
    setStrength(GREEN_SCREEN_DEFAULTS.strength);
    setEdgeSoftness(GREEN_SCREEN_DEFAULTS.edgeSoftness);
  }, []);

  const resetForAnother = useCallback(() => {
    setShowSuccess(false);
    setForeground(null);
    setBackground(null);
    setCaption('');
    resetControls();
    setAudioMode(GREEN_SCREEN_DEFAULTS.audioMode);
  }, [resetControls]);

  const handlePost = useCallback(async () => {
    if (!foreground || !background || !user?.id || postingRef.current) return;
    const check = validateGreenScreen({ hasForeground: true, hasBackground: true, foregroundDurationSec: fgDur });
    if (!check.ok) {
      toast.show(check.error, 'error');
      return;
    }
    postingRef.current = true;
    setPosting(true);
    let createdId: string | null = null;
    try {
      setProgressLabel('Uploading foreground…');
      const fgUp = await uploadMedia(user.id, foreground.asset, 'video');

      let thumbnailUrl: string | undefined;
      try {
        const localThumb = await makeVideoThumbnail(foreground.asset.uri);
        if (localThumb) {
          thumbnailUrl = await storageService.uploadPostMedia(user.id, {
            uri: localThumb,
            type: 'image/jpeg',
            name: `gs_cover_${Date.now()}.jpg`,
          });
        }
      } catch {
        /* non-fatal */
      }

      setProgressLabel('Uploading background…');
      const bgUp = await uploadMedia(user.id, background.asset, background.type);

      setProgressLabel('Creating post…');
      let created;
      try {
        created = await postsService.create({
          creator_id: user.id,
          type: 'video',
          caption: caption.trim(),
          media_url: fgUp.publicUrl,
          thumbnail_url: thumbnailUrl,
          feed_type_eligible: ['forYou', 'following'],
          privacy_mode: 'public',
          scheduled_at: null,
          scheduled_status: 'live',
          media_processing_status: 'queued',
        });
      } catch (e: unknown) {
        const msg = e instanceof Error ? e.message : String(e);
        toast.show(msg.length > 140 ? `${msg.slice(0, 137)}…` : msg, 'error');
        return;
      }
      createdId = created.id;

      setProgressLabel('Starting render…');
      const payload = buildGreenScreenPayload({
        bucket: STORAGE_BUCKETS.postMedia,
        foregroundPath: fgUp.storagePath,
        backgroundPath: bgUp.storagePath,
        backgroundType: background.type,
        keyColor,
        strength,
        edgeSoftness,
        audioMode,
        foregroundDurationSec: fgDur,
        targetPostId: created.id,
      });

      let jobRow;
      try {
        jobRow = await enqueueCreatorMediaJob({
          userId: user.id,
          kind: 'video_composition',
          payload: payload as never,
          idempotencyKey: `green-screen:${created.id}`,
        });
      } catch {
        await postsService
          .updateOwnPostMediaProcessing(created.id, user.id, {
            mediaProcessingStatus: 'failed',
            mediaProcessingError: 'Could not start the Green Screen render job',
          })
          .catch(() => {});
        toast.show('Post saved but the render could not start. Try again from your profile.', 'error');
        await invalidatePostRelatedQueries(queryClient, { creatorId: user.id });
        return;
      }

      try {
        await postsService.updateOwnPostMediaProcessing(created.id, user.id, { mediaProcessingJobId: jobRow.id });
      } catch {
        /* non-fatal */
      }

      setProgressLabel('Rendering your video…');
      let renderFailed = false;
      try {
        const done = await waitForCreatorMediaJob(jobRow.id, { timeoutMs: 180_000, intervalMs: 2500 });
        if (done.status === 'failed') {
          renderFailed = true;
          if (__DEV__ && done.error) console.warn('[green-screen] render failed:', done.last_error_code, done.error);
          toast.show(greenScreenRenderFailureMessage(done.error, done.last_error_code), 'error');
        } else if (done.status === 'succeeded') {
          toast.show('Green Screen video ready!', 'success');
        }
      } catch (e) {
        const msg = e instanceof Error ? e.message : String(e);
        if (msg === 'TIMEOUT') {
          toast.show('Processing is taking longer than expected. It’ll appear when it’s done.', 'info');
        }
      }

      await invalidatePostRelatedQueries(queryClient, { creatorId: user.id });
      if (renderFailed) {
        router.replace('/(tabs)/my-pulse');
        return;
      }
      setShowSuccess(true);
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : String(e);
      if (/network|fetch|ECONN|timeout/i.test(msg)) {
        toast.show('Upload failed. Check your connection and try again.', 'error');
      } else {
        toast.show('Could not post. Please try again.', 'error');
      }
      if (createdId && user?.id) {
        await postsService
          .updateOwnPostMediaProcessing(createdId, user.id, {
            mediaProcessingStatus: 'failed',
            mediaProcessingError: 'Green Screen upload/post failed',
          })
          .catch(() => {});
      }
    } finally {
      postingRef.current = false;
      setPosting(false);
      setProgressLabel(null);
    }
  }, [foreground, background, user?.id, fgDur, keyColor, strength, edgeSoftness, audioMode, caption, queryClient, router, toast]);

  return (
    <View style={styles.flex}>
      <VideoPublishSuccessSheet
        visible={showSuccess}
        scheduled={false}
        pinnedToMyPulse={false}
        onViewFeed={() => {
          setShowSuccess(false);
          requestAnimationFrame(() => router.replace('/(tabs)/feed' as never));
        }}
        onViewMyPulse={() => {
          setShowSuccess(false);
          openMyPulse(router, { replace: true });
        }}
        onCreateAnother={resetForAnother}
        onClose={() => {
          setShowSuccess(false);
          requestAnimationFrame(() => router.replace('/(tabs)/feed' as never));
        }}
      />

      <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
        {foreground ? (
          <GreenScreenPreview foreground={foreground} background={background} />
        ) : (
          <TouchableOpacity style={styles.pickMain} activeOpacity={0.85} onPress={pickForeground} disabled={pickingFg}>
            {pickingFg ? (
              <ActivityIndicator color={colors.primary.teal} />
            ) : (
              <>
                <Ionicons name="person-outline" size={30} color={colors.primary.teal} />
                <Text style={styles.pickMainTitle}>Pick your foreground video</Text>
                <Text style={styles.pickMainSub}>Filmed on a green background · up to {GREEN_SCREEN_LIMITS.foregroundMaxSec}s</Text>
              </>
            )}
          </TouchableOpacity>
        )}

        {foreground ? (
          <>
            <Text style={styles.sectionLabel}>Background</Text>
            <View style={styles.bgRow}>
              <TouchableOpacity
                style={[styles.bgBtn, background?.type === 'image' && styles.bgBtnOn]}
                onPress={() => pickBackground('image')}
                disabled={pickingBg || posting}
                activeOpacity={0.85}
              >
                <Ionicons name="image-outline" size={18} color={background?.type === 'image' ? '#fff' : colors.dark.textSecondary} />
                <Text style={[styles.bgBtnText, background?.type === 'image' && styles.bgBtnTextOn]}>Image</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.bgBtn, background?.type === 'video' && styles.bgBtnOn]}
                onPress={() => pickBackground('video')}
                disabled={pickingBg || posting}
                activeOpacity={0.85}
              >
                <Ionicons name="videocam-outline" size={18} color={background?.type === 'video' ? '#fff' : colors.dark.textSecondary} />
                <Text style={[styles.bgBtnText, background?.type === 'video' && styles.bgBtnTextOn]}>Video</Text>
              </TouchableOpacity>
            </View>
            <Text style={styles.bgChosen}>
              {background
                ? `${background.type === 'image' ? 'Image' : 'Video'} background selected · tap above to change`
                : 'Choose an image or video to sit behind you.'}
            </Text>

            <View style={styles.controls}>
              <View style={styles.controlsHead}>
                <Text style={styles.sectionLabel}>Green removal</Text>
                <TouchableOpacity onPress={resetControls} hitSlop={8} disabled={posting}>
                  <Text style={styles.resetText}>Reset</Text>
                </TouchableOpacity>
              </View>

              <Text style={styles.editorLabel}>Key color</Text>
              <View style={styles.keyRow}>
                {GREEN_SCREEN_KEY_PRESETS.map((p) => {
                  const on = keyColor === p.value;
                  return (
                    <TouchableOpacity
                      key={p.value}
                      style={[styles.keyChip, on && styles.keyChipOn]}
                      onPress={() => setKeyColor(p.value)}
                      disabled={posting}
                      activeOpacity={0.85}
                    >
                      <View style={[styles.keySwatch, { backgroundColor: p.swatch }]} />
                      <Text style={[styles.keyChipText, on && styles.keyChipTextOn]}>{p.label}</Text>
                    </TouchableOpacity>
                  );
                })}
              </View>

              <Text style={styles.editorLabel}>Strength · {Math.round(strength * 100)}%</Text>
              <Slider
                minimumValue={0.05}
                maximumValue={0.8}
                value={strength}
                onValueChange={(v) => setStrength(v)}
                minimumTrackTintColor={colors.primary.teal}
                maximumTrackTintColor={colors.dark.border}
                disabled={posting}
              />

              <Text style={styles.editorLabel}>Edge softness · {Math.round(edgeSoftness * 100)}%</Text>
              <Slider
                minimumValue={0}
                maximumValue={0.4}
                value={edgeSoftness}
                onValueChange={(v) => setEdgeSoftness(v)}
                minimumTrackTintColor={colors.primary.teal}
                maximumTrackTintColor={colors.dark.border}
                disabled={posting}
              />
            </View>

            <Text style={styles.sectionLabel}>Audio</Text>
            <View style={styles.audioRow}>
              {GREEN_SCREEN_AUDIO_OPTIONS.map((opt) => {
                const on = audioMode === opt.mode;
                return (
                  <TouchableOpacity
                    key={opt.mode}
                    style={[styles.audioChip, on && styles.audioChipOn]}
                    onPress={() => setAudioMode(opt.mode)}
                    disabled={posting}
                    activeOpacity={0.8}
                  >
                    <Text style={[styles.audioChipText, on && styles.audioChipTextOn]}>{opt.label}</Text>
                  </TouchableOpacity>
                );
              })}
            </View>
            <Text style={styles.audioHint}>{GREEN_SCREEN_AUDIO_OPTIONS.find((o) => o.mode === audioMode)?.hint}</Text>

            <TextInput
              style={styles.caption}
              placeholder="Add a caption…"
              placeholderTextColor={colors.dark.textMuted}
              value={caption}
              onChangeText={setCaption}
              multiline
              maxLength={2000}
              editable={!posting}
            />

            {!validation.ok ? <Text style={styles.validationText}>{validation.error}</Text> : null}
          </>
        ) : null}
      </ScrollView>

      {foreground ? (
        <View style={styles.footer}>
          <TouchableOpacity
            style={[styles.postBtn, !canPost && styles.postBtnDisabled]}
            activeOpacity={0.9}
            onPress={handlePost}
            disabled={!canPost}
          >
            {posting ? (
              <>
                <ActivityIndicator color="#fff" />
                <Text style={styles.postBtnText}>{progressLabel ?? 'Working…'}</Text>
              </>
            ) : (
              <Text style={styles.postBtnText}>Post Green Screen video</Text>
            )}
          </TouchableOpacity>
        </View>
      ) : null}
    </View>
  );
}

/** Compress (videos, if oversized) + upload media; returns its public URL + user-scoped storage path. */
async function uploadMedia(
  userId: string,
  asset: MediaAsset,
  type: GreenScreenBackgroundType | 'video',
): Promise<{ publicUrl: string; storagePath: string }> {
  let ready = asset;
  if (type === 'video') {
    const longEdge = Math.max(asset.width ?? 0, asset.height ?? 0);
    ready = longEdge > VIDEO_UPLOAD_MAX_LONG_EDGE ? await compressVideoIfTooLarge(asset, () => {}) : asset;
  }
  const ext = type === 'image' ? 'jpg' : 'mp4';
  const meta = await storageService.uploadPostMediaWithMeta(userId, {
    uri: ready.uri,
    type: ready.mimeType,
    name: ready.fileName ?? `gs_${type}_${Date.now()}.${ext}`,
    webBlob: ready.webBlob,
  });
  return { publicUrl: meta.publicUrl, storagePath: meta.storagePath };
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  scroll: { padding: 16, paddingBottom: 40, gap: 14 },
  pickMain: {
    height: 220,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: colors.primary.teal + '55',
    backgroundColor: colors.primary.teal + '12',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  pickMainTitle: { fontSize: 15, fontWeight: '800', color: colors.dark.text },
  pickMainSub: { fontSize: 12, color: colors.dark.textMuted },
  previewBox: {
    aspectRatio: 9 / 16,
    maxHeight: 380,
    alignSelf: 'center',
    width: '70%',
    borderRadius: 18,
    overflow: 'hidden',
    backgroundColor: '#000',
    borderWidth: 1,
    borderColor: colors.dark.border,
  },
  previewEmptyBg: { backgroundColor: '#0c1220' },
  previewBadge: {
    position: 'absolute',
    bottom: 10,
    left: 10,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 999,
    backgroundColor: 'rgba(0,0,0,0.6)',
  },
  previewBadgeText: { color: '#fff', fontSize: 10, fontWeight: '700' },
  sectionLabel: { fontSize: 12, fontWeight: '700', color: colors.dark.textSecondary, marginBottom: 6 },
  bgRow: { flexDirection: 'row', gap: 10 },
  bgBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 12,
    borderRadius: 12,
    backgroundColor: colors.dark.cardAlt,
    borderWidth: 1,
    borderColor: colors.dark.border,
  },
  bgBtnOn: { backgroundColor: colors.primary.teal, borderColor: colors.primary.teal },
  bgBtnText: { fontSize: 13, fontWeight: '700', color: colors.dark.textSecondary },
  bgBtnTextOn: { color: '#fff' },
  bgChosen: { fontSize: 11, color: colors.dark.textMuted, marginTop: 2 },
  controls: {
    borderRadius: 16,
    backgroundColor: colors.dark.card,
    borderWidth: 1,
    borderColor: colors.dark.border,
    padding: 14,
    gap: 2,
  },
  controlsHead: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  resetText: { fontSize: 12, fontWeight: '700', color: colors.primary.teal },
  editorLabel: { fontSize: 11, color: colors.dark.textMuted, marginTop: 8, fontWeight: '600' },
  keyRow: { flexDirection: 'row', gap: 8, marginTop: 4 },
  keyChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 10,
    backgroundColor: colors.dark.cardAlt,
    borderWidth: 1,
    borderColor: colors.dark.border,
  },
  keyChipOn: { borderColor: colors.primary.teal },
  keySwatch: { width: 14, height: 14, borderRadius: 4 },
  keyChipText: { fontSize: 12, fontWeight: '700', color: colors.dark.textSecondary },
  keyChipTextOn: { color: colors.dark.text },
  audioRow: { flexDirection: 'row', gap: 8 },
  audioChip: {
    flex: 1,
    paddingVertical: 9,
    borderRadius: 10,
    alignItems: 'center',
    backgroundColor: colors.dark.cardAlt,
    borderWidth: 1,
    borderColor: colors.dark.border,
  },
  audioChipOn: { backgroundColor: colors.primary.teal, borderColor: colors.primary.teal },
  audioChipText: { fontSize: 12, fontWeight: '700', color: colors.dark.textSecondary },
  audioChipTextOn: { color: '#fff' },
  audioHint: { fontSize: 11, color: colors.dark.textMuted, marginTop: 6 },
  caption: {
    minHeight: 60,
    borderRadius: 14,
    backgroundColor: colors.dark.card,
    borderWidth: 1,
    borderColor: colors.dark.border,
    color: colors.dark.text,
    padding: 12,
    fontSize: 14,
    textAlignVertical: 'top',
  },
  validationText: { fontSize: 12, color: colors.status?.error ?? '#ff6b6b', fontWeight: '600' },
  footer: {
    padding: 16,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.dark.border,
    backgroundColor: colors.dark.bg,
  },
  postBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    paddingVertical: 15,
    borderRadius: 16,
    backgroundColor: colors.primary.teal,
  },
  postBtnDisabled: { opacity: 0.5 },
  postBtnText: { fontSize: 15, fontWeight: '800', color: '#fff' },
});
