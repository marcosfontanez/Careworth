import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  TextInput,
  ActivityIndicator,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Stack, useRouter, useLocalSearchParams, Redirect } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useVideoPlayer, VideoView } from 'expo-video';
import Slider from '@react-native-community/slider';

import { colors } from '@/theme';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/components/ui/Toast';
import { useFeatureFlags } from '@/lib/featureFlags';
import { pickVideoFromGallery, type MediaAsset } from '@/lib/media';
import { probeVideoFile, makeVideoThumbnail } from '@/lib/videoMetadata';
import { compressVideoIfTooLarge, VIDEO_UPLOAD_MAX_LONG_EDGE } from '@/lib/videoCompression';
import { storageService, STORAGE_BUCKETS } from '@/lib/storage';
import { postsService, enqueueCreatorMediaJob, waitForCreatorMediaJob } from '@/services/supabase';
import { invalidatePostRelatedQueries } from '@/lib/invalidatePostQueries';
import { openMyPulse } from '@/lib/navigation/pulsePageRoutes';
import { VideoPublishSuccessSheet } from '@/components/create/VideoPublishSuccessSheet';
import { GreenScreenComposer } from '@/components/create/broll/GreenScreenComposer';
import { getCreatorTemplate } from '@/lib/broll/creatorTemplates';
import { useQueryClient } from '@tanstack/react-query';
import {
  BROLL_LIMITS,
  BROLL_AUDIO_OPTIONS,
  OVERLAY_DEFAULTS,
  OVERLAY_SIZE_FRACTION,
  OVERLAY_POSITION_OPTIONS,
  OVERLAY_SIZE_OPTIONS,
  STUDIO_MODE_CARDS,
  CROP_PRESET_OPTIONS,
  CROP_DEFAULT,
  validateComposition,
  buildCompositionPayload,
  brollRenderFailureMessage,
  cutawayWindowSec,
  cutawayTimelineEnd,
  type StudioCutaway,
  type StudioMode,
  type LayerStudioMode,
  type BrollAudioMode,
  type OverlayPosition,
  type OverlaySize,
  type CropPreset,
} from '@/lib/broll/brollStudio';

type MainClip = { asset: MediaAsset; durationSec: number };

/** Approximate live preview: main plays; the active cutaway overlays full-screen during its window. */
function CutawayLayer({ uri, startSec }: { uri: string; startSec: number }) {
  const player = useVideoPlayer(uri, (p) => {
    p.loop = true;
    p.muted = true;
    try {
      p.currentTime = startSec;
    } catch {
      /* seek best-effort */
    }
    p.play();
  });
  return (
    <VideoView
      player={player}
      style={StyleSheet.absoluteFillObject}
      contentFit="cover"
      nativeControls={false}
      {...(Platform.OS === 'android' ? { surfaceType: 'textureView' as const } : {})}
    />
  );
}

/** Approximate position/size of the floating overlay inside the preview box. */
function overlayBoxStyle(position: OverlayPosition, size: OverlaySize) {
  const widthPct = `${Math.round(OVERLAY_SIZE_FRACTION[size] * 100)}%` as `${number}%`;
  const edge = '5%' as const;
  const bottomSafe = '12%' as const;
  const base = { width: widthPct, aspectRatio: 9 / 16 } as const;
  switch (position) {
    case 'topLeft':
      return { ...base, top: edge, left: edge };
    case 'bottomRight':
      return { ...base, bottom: bottomSafe, right: edge };
    case 'bottomLeft':
      return { ...base, bottom: bottomSafe, left: edge };
    case 'center':
      // Relative so the centering wrapper's flex alignment applies (absolute would pin to 0,0).
      return { ...base, position: 'relative' as const, alignSelf: 'center' as const };
    case 'topRight':
    default:
      return { ...base, top: edge, right: edge };
  }
}

/** Approximate inner crop for cutout preview — oversizes the video so the kept region shows. */
function cropInnerStyle(preset: CropPreset) {
  switch (preset) {
    case 'left':
      return { position: 'absolute' as const, width: '200%' as const, height: '100%' as const, left: 0, top: 0 };
    case 'right':
      return { position: 'absolute' as const, width: '200%' as const, height: '100%' as const, right: 0, top: 0 };
    case 'top':
      return { position: 'absolute' as const, width: '100%' as const, height: '200%' as const, left: 0, top: 0 };
    case 'bottom':
      return { position: 'absolute' as const, width: '100%' as const, height: '200%' as const, left: 0, bottom: 0 };
    case 'center':
      return { position: 'absolute' as const, width: '150%' as const, height: '150%' as const, left: '-25%' as const, top: '-25%' as const };
    case 'full':
    default:
      return StyleSheet.absoluteFillObject;
  }
}

function FloatingVideo({ player }: { player: ReturnType<typeof useVideoPlayer> }) {
  return (
    <VideoView
      player={player}
      style={StyleSheet.absoluteFillObject}
      contentFit="cover"
      nativeControls={false}
      {...(Platform.OS === 'android' ? { surfaceType: 'textureView' as const } : {})}
    />
  );
}

/** Approximate floating PiP / cutout preview: main stays full-screen, this clip floats during its window. */
function OverlayPipLayer({
  uri,
  startSec,
  position,
  size,
  cropPreset,
}: {
  uri: string;
  startSec: number;
  position: OverlayPosition;
  size: OverlaySize;
  cropPreset?: CropPreset;
}) {
  const player = useVideoPlayer(uri, (p) => {
    p.loop = true;
    p.muted = true;
    try {
      p.currentTime = startSec;
    } catch {
      /* seek best-effort */
    }
    p.play();
  });
  const box = overlayBoxStyle(position, size);
  const inner = cropPreset ? cropInnerStyle(cropPreset) : StyleSheet.absoluteFillObject;
  const content = (
    <View style={[styles.pipBox, box]} pointerEvents="none">
      <View style={inner}>
        <FloatingVideo player={player} />
      </View>
    </View>
  );
  // Center preset needs vertical centering via a full-fill wrapper.
  if (position === 'center') {
    return (
      <View style={styles.pipCenterWrap} pointerEvents="none">
        {content}
      </View>
    );
  }
  return content;
}

function StudioPreview({
  main,
  cutaways,
  studioMode,
}: {
  main: MainClip;
  cutaways: StudioCutaway[];
  studioMode: LayerStudioMode;
}) {
  const player = useVideoPlayer(main.asset.uri, (p) => {
    p.loop = true;
    p.muted = false;
    p.play();
  });
  const [activeId, setActiveId] = useState<string | null>(null);
  const [activeStart, setActiveStart] = useState(0);

  useEffect(() => {
    const id = setInterval(() => {
      let t = 0;
      try {
        t = player.currentTime ?? 0;
      } catch {
        return;
      }
      const hit = cutaways.find((c) => t >= c.timelineStart && t < cutawayTimelineEnd(c));
      if (hit) {
        setActiveId(hit.id);
        setActiveStart(hit.trimStart + Math.max(0, t - hit.timelineStart));
      } else {
        setActiveId(null);
      }
    }, 200);
    return () => clearInterval(id);
  }, [player, cutaways]);

  const active = activeId ? cutaways.find((c) => c.id === activeId) : null;
  const isFloating = studioMode === 'overlay' || studioMode === 'cutout';
  const badge =
    studioMode === 'overlay' ? 'Overlay' : studioMode === 'cutout' ? 'Cutout' : 'Cutaway';
  const badgeIcon =
    studioMode === 'overlay' ? 'albums-outline' : studioMode === 'cutout' ? 'crop-outline' : 'film-outline';

  return (
    <View style={styles.previewBox}>
      <VideoView
        player={player}
        style={StyleSheet.absoluteFillObject}
        contentFit="cover"
        nativeControls={false}
        {...(Platform.OS === 'android' ? { surfaceType: 'textureView' as const } : {})}
      />
      {active && !isFloating ? <CutawayLayer key={active.id} uri={active.uri} startSec={activeStart} /> : null}
      {active && isFloating ? (
        <OverlayPipLayer
          key={active.id}
          uri={active.uri}
          startSec={activeStart}
          position={active.position ?? OVERLAY_DEFAULTS.position}
          size={active.size ?? OVERLAY_DEFAULTS.size}
          cropPreset={studioMode === 'cutout' ? active.cropPreset ?? CROP_DEFAULT : undefined}
        />
      ) : null}
      {active ? (
        <View style={styles.previewBadge}>
          <Ionicons name={badgeIcon} size={12} color="#fff" />
          <Text style={styles.previewBadgeText}>{badge}</Text>
        </View>
      ) : null}
    </View>
  );
}

function genId() {
  return `c_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
}

const ADD_LABELS: Record<LayerStudioMode, string> = {
  cutaway: 'Add cutaway clip',
  overlay: 'Add overlay clip',
  cutout: 'Add cutout clip',
};

export default function BrollStudioScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ mode?: string; template?: string }>();
  const template = useMemo(() => getCreatorTemplate(params?.template), [params?.template]);
  const { user } = useAuth();
  const toast = useToast();
  const queryClient = useQueryClient();
  const enabled = useFeatureFlags((s) => s.creatorBrollStudio);
  const overlayEnabled = useFeatureFlags((s) => s.creatorOverlayPip);
  const greenScreenEnabled = useFeatureFlags((s) => s.creatorGreenScreenStudio);
  const cutoutEnabled = useFeatureFlags((s) => s.creatorCutoutOverlay);

  /** Modes available given feature flags (cutaway is the always-on base). */
  const modeCards = useMemo(
    () =>
      STUDIO_MODE_CARDS.filter((card) => {
        if (card.mode === 'cutaway') return true;
        if (card.mode === 'overlay') return overlayEnabled;
        if (card.mode === 'greenScreen') return greenScreenEnabled;
        if (card.mode === 'cutout') return cutoutEnabled;
        return false;
      }),
    [overlayEnabled, greenScreenEnabled, cutoutEnabled],
  );

  const initialMode: StudioMode = useMemo(() => {
    const requested = params?.mode as StudioMode | undefined;
    if (requested && modeCards.some((c) => c.mode === requested)) return requested;
    return 'cutaway';
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const [studioMode, setStudioMode] = useState<StudioMode>(initialMode);
  const [main, setMain] = useState<MainClip | null>(null);
  const [cutaways, setCutaways] = useState<StudioCutaway[]>([]);
  const [caption, setCaption] = useState('');
  const [pickingMain, setPickingMain] = useState(false);
  const [posting, setPosting] = useState(false);
  const [progressLabel, setProgressLabel] = useState<string | null>(null);
  const [showSuccess, setShowSuccess] = useState(false);
  const postingRef = useRef(false);
  /** Local source assets for cutaways, keyed by id (uploaded at post time). */
  const cutawayAssets = useRef<Record<string, MediaAsset>>({});

  const layerMode: LayerStudioMode = studioMode === 'greenScreen' ? 'cutaway' : studioMode;
  const mainDur = main?.durationSec ?? 0;

  const validation = useMemo(() => validateComposition(mainDur, cutaways), [mainDur, cutaways]);
  const canPost = !!main && !!user?.id && cutaways.length > 0 && validation.ok && !posting;

  const pickMain = useCallback(async () => {
    if (pickingMain) return;
    setPickingMain(true);
    try {
      const asset = await pickVideoFromGallery();
      if (!asset) return;
      let dur = asset.duration ?? 0;
      if (!dur) {
        const probed = await probeVideoFile(asset.uri).catch(() => ({}) as { duration?: number });
        dur = probed.duration ?? 0;
      }
      if (dur > 0 && dur > BROLL_LIMITS.mainMaxSec + 0.5) {
        toast.show(`Main video must be ${BROLL_LIMITS.mainMaxSec}s or shorter.`, 'error');
        return;
      }
      setMain({ asset, durationSec: dur });
    } catch {
      toast.show('Could not read this video.', 'error');
    } finally {
      setPickingMain(false);
    }
  }, [pickingMain, toast]);

  const addCutaway = useCallback(async () => {
    if (!main) {
      toast.show('Add your main video first.', 'info');
      return;
    }
    if (cutaways.length >= BROLL_LIMITS.maxCutaways) {
      toast.show(`Up to ${BROLL_LIMITS.maxCutaways} clips.`, 'info');
      return;
    }
    try {
      const asset = await pickVideoFromGallery();
      if (!asset) return;
      let dur = asset.duration ?? 0;
      if (!dur) {
        const probed = await probeVideoFile(asset.uri).catch(() => ({}) as { duration?: number });
        dur = probed.duration ?? 0;
      }
      const win = Math.min(dur > 0 ? dur : 5, 5, BROLL_LIMITS.maxCutawaySec);
      const lastEnd = cutaways.reduce((acc, c) => Math.max(acc, cutawayTimelineEnd(c)), 0);
      const start = mainDur > 0 ? Math.min(lastEnd, Math.max(0, mainDur - win)) : lastEnd;
      const id = genId();
      cutawayAssets.current[id] = asset;
      setCutaways((prev) => [
        ...prev,
        {
          id,
          uri: asset.uri,
          sourceDurationSec: dur,
          trimStart: 0,
          trimEnd: win,
          timelineStart: start,
          audioMode: 'muted' as BrollAudioMode,
          position: OVERLAY_DEFAULTS.position,
          size: OVERLAY_DEFAULTS.size,
          cropPreset: CROP_DEFAULT,
        },
      ]);
    } catch {
      toast.show('Could not read this video.', 'error');
    }
  }, [main, cutaways, mainDur, toast]);

  const updateCutaway = useCallback((id: string, patch: Partial<StudioCutaway>) => {
    setCutaways((prev) => prev.map((c) => (c.id === id ? { ...c, ...patch } : c)));
  }, []);

  const removeCutaway = useCallback((id: string) => {
    setCutaways((prev) => prev.filter((c) => c.id !== id));
    delete cutawayAssets.current[id];
  }, []);

  const resetForAnother = useCallback(() => {
    setShowSuccess(false);
    setMain(null);
    setCutaways([]);
    setCaption('');
    cutawayAssets.current = {};
  }, []);

  const handlePost = useCallback(async () => {
    if (!main || !user?.id || postingRef.current) return;
    const check = validateComposition(mainDur, cutaways);
    if (!check.ok) {
      toast.show(check.error, 'error');
      return;
    }
    postingRef.current = true;
    setPosting(true);
    let createdId: string | null = null;
    try {
      setProgressLabel('Uploading main video…');
      const mainUp = await uploadVideo(user.id, main.asset);

      let thumbnailUrl: string | undefined;
      try {
        const localThumb = await makeVideoThumbnail(main.asset.uri);
        if (localThumb) {
          thumbnailUrl = await storageService.uploadPostMedia(user.id, {
            uri: localThumb,
            type: 'image/jpeg',
            name: `broll_cover_${Date.now()}.jpg`,
          });
        }
      } catch {
        /* non-fatal */
      }

      const uploaded: StudioCutaway[] = [];
      for (let i = 0; i < cutaways.length; i += 1) {
        setProgressLabel(`Uploading clip ${i + 1} of ${cutaways.length}…`);
        const c = cutaways[i]!;
        const asset: MediaAsset | undefined = cutawayAssets.current[c.id];
        if (!asset) throw new Error('MISSING_ASSET');
        const up = await uploadVideo(user.id, asset);
        uploaded.push({ ...c, storagePath: up.storagePath });
      }

      setProgressLabel('Creating post…');
      let created;
      try {
        created = await postsService.create({
          creator_id: user.id,
          type: 'video',
          caption: caption.trim(),
          media_url: mainUp.publicUrl,
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
      const payload = buildCompositionPayload({
        bucket: STORAGE_BUCKETS.postMedia,
        mainPath: mainUp.storagePath,
        mainDurationSec: mainDur,
        cutaways: uploaded,
        targetPostId: created.id,
        layerMode,
      });

      let jobRow;
      try {
        jobRow = await enqueueCreatorMediaJob({
          userId: user.id,
          kind: 'video_composition',
          payload: payload as never,
          idempotencyKey: `broll-studio:${created.id}`,
        });
      } catch {
        await postsService
          .updateOwnPostMediaProcessing(created.id, user.id, {
            mediaProcessingStatus: 'failed',
            mediaProcessingError: 'Could not start the B-roll render job',
          })
          .catch(() => {});
        toast.show('Post saved but the render could not start. Try again from your profile.', 'error');
        await invalidatePostRelatedQueries(queryClient, { creatorId: user.id });
        return;
      }

      try {
        await postsService.updateOwnPostMediaProcessing(created.id, user.id, {
          mediaProcessingJobId: jobRow.id,
        });
      } catch {
        /* non-fatal — worker still runs */
      }

      setProgressLabel('Rendering your video…');
      let renderFailed = false;
      try {
        const done = await waitForCreatorMediaJob(jobRow.id, { timeoutMs: 180_000, intervalMs: 2500 });
        if (done.status === 'failed') {
          renderFailed = true;
          if (__DEV__ && done.error) console.warn('[broll-studio] render failed:', done.last_error_code, done.error);
          toast.show(brollRenderFailureMessage(done.error, done.last_error_code), 'error');
        } else if (done.status === 'succeeded') {
          toast.show('B-roll video ready!', 'success');
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
      if (/MISSING_ASSET/.test(msg)) {
        toast.show('A clip was lost. Re-add it and try again.', 'error');
      } else if (/network|fetch|ECONN|timeout/i.test(msg)) {
        toast.show('Upload failed. Check your connection and try again.', 'error');
      } else {
        toast.show('Could not post. Please try again.', 'error');
      }
      if (createdId && user?.id) {
        await postsService
          .updateOwnPostMediaProcessing(createdId, user.id, {
            mediaProcessingStatus: 'failed',
            mediaProcessingError: 'B-roll upload/post failed',
          })
          .catch(() => {});
      }
    } finally {
      postingRef.current = false;
      setPosting(false);
      setProgressLabel(null);
    }
  }, [main, user?.id, mainDur, cutaways, caption, layerMode, queryClient, router, toast]);

  if (!enabled) {
    return <Redirect href="/(tabs)/create" />;
  }

  const isGreenScreen = studioMode === 'greenScreen';

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <Stack.Screen options={{ headerShown: false }} />
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
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} hitSlop={10} disabled={posting}>
          <Ionicons name="chevron-back" size={26} color={colors.dark.text} />
        </TouchableOpacity>
        <View style={{ flex: 1 }}>
          <Text style={styles.title}>B-roll Studio</Text>
          <Text style={styles.subtitle}>Layer cutaways, overlays, green screen, and cutouts.</Text>
        </View>
      </View>

      {template ? (
        <View style={styles.templateBanner}>
          <Ionicons name="sparkles" size={14} color={colors.primary.teal} />
          <Text style={styles.templateBannerText} numberOfLines={1}>
            Template: {template.name} · adjust anything you like
          </Text>
        </View>
      ) : null}

      {modeCards.length > 1 ? (
        <View style={styles.modeRowWrap}>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.modeRow}
            keyboardShouldPersistTaps="handled"
          >
            {modeCards.map((card) => {
              const on = studioMode === card.mode;
              return (
                <TouchableOpacity
                  key={card.mode}
                  style={[styles.modeCard, on && styles.modeCardOn]}
                  onPress={() => setStudioMode(card.mode)}
                  disabled={posting}
                  activeOpacity={0.85}
                  accessibilityRole="button"
                  accessibilityState={{ selected: on }}
                >
                  <Ionicons name={card.icon as never} size={18} color={on ? '#fff' : colors.primary.teal} />
                  <Text style={[styles.modeCardLabel, on && styles.modeCardLabelOn]}>{card.label}</Text>
                </TouchableOpacity>
              );
            })}
          </ScrollView>
          <Text style={styles.modeHint}>{STUDIO_MODE_CARDS.find((c) => c.mode === studioMode)?.hint}</Text>
        </View>
      ) : null}

      {isGreenScreen ? (
        <GreenScreenComposer />
      ) : (
        <>
          <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
            {main ? (
              <StudioPreview main={main} cutaways={cutaways} studioMode={layerMode} />
            ) : (
              <TouchableOpacity style={styles.pickMain} activeOpacity={0.85} onPress={pickMain} disabled={pickingMain}>
                {pickingMain ? (
                  <ActivityIndicator color={colors.primary.teal} />
                ) : (
                  <>
                    <Ionicons name="videocam-outline" size={30} color={colors.primary.teal} />
                    <Text style={styles.pickMainTitle}>Pick your main video</Text>
                    <Text style={styles.pickMainSub}>Up to {BROLL_LIMITS.mainMaxSec}s · vertical looks best</Text>
                  </>
                )}
              </TouchableOpacity>
            )}

            {main ? (
              <>
                <View style={styles.timelineWrap}>
                  <Text style={styles.sectionLabel}>Timeline{mainDur > 0 ? ` · ${Math.round(mainDur)}s` : ''}</Text>
                  <View style={styles.timelineBar}>
                    {mainDur > 0 &&
                      cutaways.map((c, i) => {
                        const left = `${Math.min(98, (c.timelineStart / mainDur) * 100)}%`;
                        const width = `${Math.max(2, (cutawayWindowSec(c) / mainDur) * 100)}%`;
                        return (
                          <View
                            key={c.id}
                            style={[styles.timelineBlock, { left: left as `${number}%`, width: width as `${number}%` }]}
                          >
                            <Text style={styles.timelineBlockText}>{i + 1}</Text>
                          </View>
                        );
                      })}
                  </View>
                </View>

                {cutaways.map((c, i) => (
                  <CutawayEditor
                    key={c.id}
                    index={i}
                    cutaway={c}
                    mainDur={mainDur}
                    studioMode={layerMode}
                    onChange={(patch) => updateCutaway(c.id, patch)}
                    onRemove={() => removeCutaway(c.id)}
                    disabled={posting}
                  />
                ))}

                <TouchableOpacity
                  style={[styles.addBtn, cutaways.length >= BROLL_LIMITS.maxCutaways && styles.addBtnDisabled]}
                  activeOpacity={0.85}
                  onPress={addCutaway}
                  disabled={cutaways.length >= BROLL_LIMITS.maxCutaways || posting}
                >
                  <Ionicons name="add-circle-outline" size={20} color="#fff" />
                  <Text style={styles.addBtnText}>
                    {ADD_LABELS[layerMode]}
                    {cutaways.length > 0 ? ` (${cutaways.length}/${BROLL_LIMITS.maxCutaways})` : ''}
                  </Text>
                </TouchableOpacity>

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

                {!validation.ok && cutaways.length > 0 ? (
                  <Text style={styles.validationText}>{validation.error}</Text>
                ) : null}
              </>
            ) : null}
          </ScrollView>

          {main ? (
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
                  <Text style={styles.postBtnText}>Post B-roll video</Text>
                )}
              </TouchableOpacity>
            </View>
          ) : null}
        </>
      )}
    </SafeAreaView>
  );
}

function CutawayEditor({
  index,
  cutaway,
  mainDur,
  studioMode,
  onChange,
  onRemove,
  disabled,
}: {
  index: number;
  cutaway: StudioCutaway;
  mainDur: number;
  studioMode: LayerStudioMode;
  onChange: (patch: Partial<StudioCutaway>) => void;
  onRemove: () => void;
  disabled: boolean;
}) {
  const win = cutawayWindowSec(cutaway);
  const srcMax = cutaway.sourceDurationSec > 0 ? cutaway.sourceDurationSec : BROLL_LIMITS.maxCutawaySec;
  const startMax = mainDur > 0 ? Math.max(0, mainDur - win) : 120;
  const isFloating = studioMode === 'overlay' || studioMode === 'cutout';
  const isCutout = studioMode === 'cutout';

  return (
    <View style={styles.editor}>
      <View style={styles.editorHead}>
        <Text style={styles.editorTitle}>Clip {index + 1}</Text>
        <TouchableOpacity onPress={onRemove} hitSlop={8} disabled={disabled}>
          <Ionicons name="trash-outline" size={18} color={colors.status?.error ?? '#ff6b6b'} />
        </TouchableOpacity>
      </View>

      {isCutout ? (
        <>
          <Text style={styles.editorLabel}>Crop area</Text>
          <View style={styles.presetGrid}>
            {CROP_PRESET_OPTIONS.map((opt) => {
              const on = (cutaway.cropPreset ?? CROP_DEFAULT) === opt.value;
              return (
                <TouchableOpacity
                  key={opt.value}
                  style={[styles.presetChip, on && styles.presetChipOn]}
                  onPress={() => onChange({ cropPreset: opt.value })}
                  disabled={disabled}
                  activeOpacity={0.85}
                >
                  <Text style={[styles.presetChipText, on && styles.presetChipTextOn]}>{opt.label}</Text>
                </TouchableOpacity>
              );
            })}
          </View>
        </>
      ) : null}

      {isFloating ? (
        <>
          <Text style={styles.editorLabel}>Position</Text>
          <View style={styles.presetGrid}>
            {OVERLAY_POSITION_OPTIONS.map((opt) => {
              const on = (cutaway.position ?? OVERLAY_DEFAULTS.position) === opt.value;
              return (
                <TouchableOpacity
                  key={opt.value}
                  style={[styles.presetChip, on && styles.presetChipOn]}
                  onPress={() => onChange({ position: opt.value })}
                  disabled={disabled}
                  activeOpacity={0.85}
                >
                  <Text style={[styles.presetChipText, on && styles.presetChipTextOn]}>{opt.label}</Text>
                </TouchableOpacity>
              );
            })}
          </View>

          <Text style={styles.editorLabel}>Size</Text>
          <View style={styles.segRow}>
            {OVERLAY_SIZE_OPTIONS.map((opt) => {
              const on = (cutaway.size ?? OVERLAY_DEFAULTS.size) === opt.value;
              return (
                <TouchableOpacity
                  key={opt.value}
                  style={[styles.segChip, on && styles.segChipOn]}
                  onPress={() => onChange({ size: opt.value })}
                  disabled={disabled}
                  activeOpacity={0.85}
                >
                  <Text style={[styles.segChipText, on && styles.segChipTextOn]}>{opt.label}</Text>
                </TouchableOpacity>
              );
            })}
          </View>
        </>
      ) : null}

      <Text style={styles.editorLabel}>Trim start · {cutaway.trimStart.toFixed(1)}s</Text>
      <Slider
        minimumValue={0}
        maximumValue={Math.max(0.1, srcMax)}
        value={cutaway.trimStart}
        onValueChange={(v) => {
          const ns = Math.min(v, cutaway.trimEnd - 0.5);
          const clampedEnd = Math.min(cutaway.trimEnd, ns + BROLL_LIMITS.maxCutawaySec);
          onChange({ trimStart: Math.max(0, ns), trimEnd: clampedEnd });
        }}
        minimumTrackTintColor={colors.primary.teal}
        maximumTrackTintColor={colors.dark.border}
        disabled={disabled}
      />

      <Text style={styles.editorLabel}>Trim end · {cutaway.trimEnd.toFixed(1)}s (length {win.toFixed(1)}s)</Text>
      <Slider
        minimumValue={0}
        maximumValue={Math.max(0.1, srcMax)}
        value={cutaway.trimEnd}
        onValueChange={(v) => {
          const ne = Math.max(v, cutaway.trimStart + 0.5);
          const capped = Math.min(ne, cutaway.trimStart + BROLL_LIMITS.maxCutawaySec);
          onChange({ trimEnd: capped });
        }}
        minimumTrackTintColor={colors.primary.teal}
        maximumTrackTintColor={colors.dark.border}
        disabled={disabled}
      />

      <Text style={styles.editorLabel}>Starts at · {cutaway.timelineStart.toFixed(1)}s</Text>
      <Slider
        minimumValue={0}
        maximumValue={Math.max(0.1, startMax)}
        value={Math.min(cutaway.timelineStart, startMax)}
        onValueChange={(v) => onChange({ timelineStart: Math.max(0, Math.min(v, startMax)) })}
        minimumTrackTintColor={colors.primary.gold}
        maximumTrackTintColor={colors.dark.border}
        disabled={disabled}
      />

      <Text style={styles.editorLabel}>Audio</Text>
      <View style={styles.audioRow}>
        {BROLL_AUDIO_OPTIONS.map((opt) => {
          const on = cutaway.audioMode === opt.mode;
          return (
            <TouchableOpacity
              key={opt.mode}
              style={[styles.audioChip, on && styles.audioChipOn]}
              onPress={() => onChange({ audioMode: opt.mode })}
              disabled={disabled}
              activeOpacity={0.8}
            >
              <Text style={[styles.audioChipText, on && styles.audioChipTextOn]}>{opt.label}</Text>
            </TouchableOpacity>
          );
        })}
      </View>
      <Text style={styles.audioHint}>
        {BROLL_AUDIO_OPTIONS.find((o) => o.mode === cutaway.audioMode)?.hint}
      </Text>
    </View>
  );
}

/** Compress (if oversized) + upload a video; returns its public URL + user-scoped storage path. */
async function uploadVideo(userId: string, asset: MediaAsset): Promise<{ publicUrl: string; storagePath: string }> {
  const longEdge = Math.max(asset.width ?? 0, asset.height ?? 0);
  const ready = longEdge > VIDEO_UPLOAD_MAX_LONG_EDGE ? await compressVideoIfTooLarge(asset, () => {}) : asset;
  const meta = await storageService.uploadPostMediaWithMeta(userId, {
    uri: ready.uri,
    type: ready.mimeType,
    name: ready.fileName ?? `broll_${Date.now()}.mp4`,
    webBlob: ready.webBlob,
  });
  return { publicUrl: meta.publicUrl, storagePath: meta.storagePath };
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.dark.bg },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.dark.border,
  },
  title: { fontSize: 18, fontWeight: '800', color: colors.dark.text },
  subtitle: { fontSize: 12, color: colors.dark.textMuted, marginTop: 2 },
  templateBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginHorizontal: 16,
    marginTop: 10,
    paddingHorizontal: 12,
    paddingVertical: 9,
    borderRadius: 12,
    backgroundColor: 'rgba(25,211,197,0.10)',
    borderWidth: 1,
    borderColor: 'rgba(25,211,197,0.28)',
  },
  templateBannerText: { flex: 1, fontSize: 12, fontWeight: '700', color: colors.primary.teal },
  modeRowWrap: {
    paddingTop: 10,
    paddingBottom: 6,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.dark.border,
  },
  modeRow: { paddingHorizontal: 16, gap: 8 },
  modeCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 14,
    paddingVertical: 9,
    borderRadius: 999,
    backgroundColor: colors.dark.cardAlt,
    borderWidth: 1,
    borderColor: colors.dark.border,
  },
  modeCardOn: { backgroundColor: colors.primary.teal, borderColor: colors.primary.teal },
  modeCardLabel: { fontSize: 13, fontWeight: '700', color: colors.dark.textSecondary },
  modeCardLabelOn: { color: '#fff' },
  modeHint: { fontSize: 11, color: colors.dark.textMuted, paddingHorizontal: 16, paddingTop: 8 },
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
  previewBadge: {
    position: 'absolute',
    top: 10,
    left: 10,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 999,
    backgroundColor: colors.primary.gold + 'cc',
  },
  previewBadgeText: { color: '#fff', fontSize: 10, fontWeight: '800' },
  pipBox: {
    position: 'absolute',
    borderRadius: 10,
    overflow: 'hidden',
    backgroundColor: '#000',
    borderWidth: 1.5,
    borderColor: '#ffffffcc',
  },
  pipCenterWrap: {
    ...StyleSheet.absoluteFillObject,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sectionLabel: { fontSize: 12, fontWeight: '700', color: colors.dark.textSecondary, marginBottom: 6 },
  timelineWrap: { marginTop: 2 },
  timelineBar: {
    height: 26,
    borderRadius: 8,
    backgroundColor: colors.dark.cardAlt,
    borderWidth: 1,
    borderColor: colors.dark.border,
    overflow: 'hidden',
  },
  timelineBlock: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    backgroundColor: colors.primary.gold + 'aa',
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 6,
  },
  timelineBlockText: { fontSize: 11, fontWeight: '800', color: '#1b1b1b' },
  editor: {
    borderRadius: 16,
    backgroundColor: colors.dark.card,
    borderWidth: 1,
    borderColor: colors.dark.border,
    padding: 14,
    gap: 4,
  },
  editorHead: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 4 },
  editorTitle: { fontSize: 14, fontWeight: '800', color: colors.dark.text },
  editorLabel: { fontSize: 11, color: colors.dark.textMuted, marginTop: 8, fontWeight: '600' },
  segRow: { flexDirection: 'row', gap: 8, marginTop: 4 },
  segChip: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 9,
    borderRadius: 10,
    backgroundColor: colors.dark.cardAlt,
    borderWidth: 1,
    borderColor: colors.dark.border,
  },
  segChipOn: { backgroundColor: colors.primary.teal, borderColor: colors.primary.teal },
  segChipText: { fontSize: 12, fontWeight: '700', color: colors.dark.textSecondary },
  segChipTextOn: { color: '#fff' },
  presetGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 4 },
  presetChip: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 10,
    backgroundColor: colors.dark.cardAlt,
    borderWidth: 1,
    borderColor: colors.dark.border,
  },
  presetChipOn: { backgroundColor: colors.primary.gold, borderColor: colors.primary.gold },
  presetChipText: { fontSize: 12, fontWeight: '700', color: colors.dark.textSecondary },
  presetChipTextOn: { color: '#1b1b1b' },
  audioRow: { flexDirection: 'row', gap: 8, marginTop: 4 },
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
  addBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 13,
    borderRadius: 14,
    backgroundColor: colors.primary.gold,
  },
  addBtnDisabled: { opacity: 0.5 },
  addBtnText: { fontSize: 14, fontWeight: '800', color: '#1b1b1b' },
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
