import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  Dimensions,
  Modal,
  TextInput,
  ScrollView,
  FlatList,
} from 'react-native';
import { CameraView, useCameraPermissions, useMicrophonePermissions } from 'expo-camera';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import * as Haptics from 'expo-haptics';
import { colors } from '@/theme';
import { VIDEO_MAX_SECONDS, type MediaAsset } from '@/lib/media';
import { setPendingVideoCapture } from '@/lib/pendingVideoCapture';
import { probeVideoFile } from '@/lib/videoMetadata';
import { looksByKind, tintForLook, type VideoLookId, type VideoLookKind } from '@/lib/videoFilters';
import { postsService } from '@/services/supabase';

const CAP_OPTIONS = [
  { label: '15s', sec: 15 },
  { label: '60s', sec: 60 },
  { label: '3m', sec: Math.min(180, VIDEO_MAX_SECONDS) },
] as const;

interface PickedSound {
  postId: string;
  title: string;
  creatorName: string;
  thumbnailUrl?: string;
}

function mimeForCapture(uri: string): string {
  const raw = uri.split('.').pop()?.toLowerCase().split('?')[0] ?? 'mp4';
  if (raw === 'mov') return 'video/quicktime';
  return 'video/mp4';
}

const sleep = (ms: number) => new Promise<void>((r) => setTimeout(r, ms));

export default function CreateVideoCameraScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const camRef = useRef<CameraView>(null);
  const [camPerm, requestCam] = useCameraPermissions();
  const [micPerm, requestMic] = useMicrophonePermissions();

  const [camReady, setCamReady] = useState(false);
  const [facing, setFacing] = useState<'front' | 'back'>('back');
  const [torch, setTorch] = useState(false);
  const [maxCap, setMaxCap] = useState<number>(60);
  const [countdownMode, setCountdownMode] = useState<0 | 3>(0);
  const [countdownShow, setCountdownShow] = useState<number | null>(null);

  const [recording, setRecording] = useState(false);
  const [recordElapsed, setRecordElapsed] = useState(0);
  const recordStartedAt = useRef<number | null>(null);
  const recordPromiseRef = useRef<Promise<{ uri: string } | undefined> | null>(null);
  const recordingBusyRef = useRef(false);

  const [lookKind, setLookKind] = useState<VideoLookKind>('filter');
  const [lookId, setLookId] = useState<VideoLookId>('none');
  const tint = useMemo(() => tintForLook(lookId), [lookId]);
  const filterChips = useMemo(() => looksByKind('filter'), []);
  const effectChips = useMemo(() => looksByKind('effect'), []);

  const [pickedSound, setPickedSound] = useState<PickedSound | null>(null);
  const [soundOpen, setSoundOpen] = useState(false);

  useEffect(() => {
    if (!camPerm?.granted) void requestCam();
  }, [camPerm?.granted, requestCam]);

  useEffect(() => {
    if (!micPerm?.granted) void requestMic();
  }, [micPerm?.granted, requestMic]);

  useEffect(() => {
    if (!recording) return;
    recordStartedAt.current = Date.now();
    const t = setInterval(() => {
      if (recordStartedAt.current) {
        setRecordElapsed(Math.floor((Date.now() - recordStartedAt.current) / 1000));
      }
    }, 250);
    return () => clearInterval(t);
  }, [recording]);

  const finishAndNavigate = useCallback(
    async (uri: string) => {
      const meta = await probeVideoFile(uri);
      const ext = uri.split('.').pop()?.toLowerCase().split('?')[0] ?? 'mp4';
      const asset: MediaAsset = {
        uri,
        type: 'video',
        mimeType: mimeForCapture(uri),
        fileName: `create_${Date.now()}.${ext}`,
        duration: meta.duration,
        width: meta.width,
        height: meta.height,
      };
      setPendingVideoCapture({
        asset,
        lookId: lookId !== 'none' ? lookId : undefined,
        soundPostId: pickedSound?.postId,
        soundTitle: pickedSound?.title,
      });
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      const sp = pickedSound?.postId
        ? `&soundPostId=${encodeURIComponent(pickedSound.postId)}`
        : '';
      router.replace(`/create/video?mode=record${sp}` as any);
    },
    [router, lookId, pickedSound],
  );

  const stopRecordingOnly = useCallback(() => {
    camRef.current?.stopRecording();
  }, []);

  const beginRecording = useCallback(async () => {
    const cam = camRef.current;
    if (!cam || !camReady || recordingBusyRef.current) return;
    recordingBusyRef.current = true;

    try {
      if (countdownMode === 3) {
        for (let n = 3; n >= 1; n--) {
          setCountdownShow(n);
          void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
          await sleep(1000);
        }
        setCountdownShow(null);
      }

      const p = cam.recordAsync({ maxDuration: maxCap });
      recordPromiseRef.current = p;
      setRecording(true);
      void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
      p.finally(() => {
        setRecording(false);
        setRecordElapsed(0);
        recordPromiseRef.current = null;
        recordingBusyRef.current = false;
      });
      const result = await p;
      if (result?.uri) await finishAndNavigate(result.uri);
    } catch {
      setRecording(false);
      recordPromiseRef.current = null;
      recordingBusyRef.current = false;
    }
  }, [camReady, countdownMode, finishAndNavigate, maxCap]);

  const toggleRecord = useCallback(() => {
    if (recording) {
      stopRecordingOnly();
      return;
    }
    void beginRecording();
  }, [beginRecording, recording, stopRecordingOnly]);

  const onClose = useCallback(() => {
    if (recording) stopRecordingOnly();
    router.back();
  }, [recording, router, stopRecordingOnly]);

  if (!camPerm || !micPerm) {
    return (
      <View style={[styles.centered, { paddingTop: insets.top }]}>
        <ActivityIndicator color={colors.primary.teal} />
      </View>
    );
  }

  if (!camPerm.granted || !micPerm.granted) {
    return (
      <View style={[styles.centered, { paddingTop: insets.top, paddingHorizontal: 24 }]}>
        <Text style={styles.permTitle}>Camera & microphone</Text>
        <Text style={styles.permSub}>PulseVerse needs access to record short-form video.</Text>
        <TouchableOpacity
          style={styles.permBtn}
          onPress={() => {
            void requestCam();
            void requestMic();
          }}
        >
          <Text style={styles.permBtnText}>Allow access</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.permSecondary} onPress={() => router.back()}>
          <Text style={styles.permSecondaryText}>Cancel</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const screenH = Dimensions.get('window').height;
  const activeChips = lookKind === 'filter' ? filterChips : effectChips;

  return (
    <View style={styles.root}>
      <View style={[styles.cameraShell, { height: Math.min(screenH * 0.72, 560) }]}>
        <CameraView
          ref={camRef}
          style={StyleSheet.absoluteFill}
          facing={facing}
          mode="video"
          mute={Boolean(pickedSound)}
          mirror={facing === 'front'}
          videoQuality="1080p"
          enableTorch={torch && facing === 'back'}
          onCameraReady={() => setCamReady(true)}
          onMountError={(e) => console.warn('[video-camera]', e.message)}
        />

        {tint ? (
          <View pointerEvents="none" style={[StyleSheet.absoluteFillObject, { backgroundColor: tint }]} />
        ) : null}

        {/* Top sound pill — TikTok-style "+ Add sound" / picked sound chip */}
        <View style={[styles.topPillRow, { top: insets.top + 12 }]}>
          {pickedSound ? (
            <TouchableOpacity
              style={styles.soundPill}
              onPress={() => !recording && setSoundOpen(true)}
              activeOpacity={0.8}
              accessibilityLabel="Change sound"
            >
              <Ionicons name="musical-notes" size={14} color={colors.primary.gold} />
              <Text style={styles.soundPillText} numberOfLines={1}>
                {pickedSound.title}
              </Text>
              <TouchableOpacity
                hitSlop={8}
                onPress={() => !recording && setPickedSound(null)}
                accessibilityLabel="Remove sound"
              >
                <Ionicons name="close-circle" size={16} color="rgba(255,255,255,0.85)" />
              </TouchableOpacity>
            </TouchableOpacity>
          ) : (
            <TouchableOpacity
              style={styles.soundPill}
              onPress={() => !recording && setSoundOpen(true)}
              activeOpacity={0.8}
              accessibilityLabel="Add sound"
            >
              <Ionicons name="musical-notes-outline" size={14} color="#FFF" />
              <Text style={styles.soundPillText}>Add sound</Text>
            </TouchableOpacity>
          )}
        </View>

        {countdownShow != null ? (
          <View style={styles.countOverlay}>
            <Text style={styles.countText}>{countdownShow}</Text>
          </View>
        ) : null}

        {recording ? (
          <View style={[styles.recBadge, { top: insets.top + 56 }]}>
            <View style={styles.recDot} />
            <Text style={styles.recText}>{formatClock(recordElapsed)}</Text>
            <Text style={styles.recCap}> / {maxCap}s max</Text>
          </View>
        ) : null}
      </View>

      <View style={[styles.toolbar, { paddingBottom: insets.bottom + 16 }]}>
        <View style={styles.topBar}>
          <TouchableOpacity onPress={onClose} style={styles.iconHit} accessibilityLabel="Close camera">
            <Ionicons name="close" size={28} color="#FFF" />
          </TouchableOpacity>
          <View style={styles.capRow}>
            {CAP_OPTIONS.map((o) => (
              <TouchableOpacity
                key={o.label}
                style={[styles.capChip, maxCap === o.sec && styles.capChipOn]}
                onPress={() => !recording && setMaxCap(o.sec)}
              >
                <Text style={[styles.capChipText, maxCap === o.sec && styles.capChipTextOn]}>{o.label}</Text>
              </TouchableOpacity>
            ))}
          </View>
          <TouchableOpacity
            onPress={() => !recording && setFacing((f) => (f === 'back' ? 'front' : 'back'))}
            style={styles.iconHit}
            accessibilityLabel="Flip camera"
          >
            <Ionicons name="camera-reverse-outline" size={26} color="#FFF" />
          </TouchableOpacity>
        </View>

        <View style={styles.secondaryRow}>
          <TouchableOpacity
            style={[styles.smallChip, countdownMode === 3 && styles.smallChipOn]}
            onPress={() => !recording && setCountdownMode((c) => (c === 3 ? 0 : 3))}
          >
            <Text style={styles.smallChipText}>Timer {countdownMode === 3 ? '3s' : 'off'}</Text>
          </TouchableOpacity>
          {facing === 'back' ? (
            <TouchableOpacity style={styles.smallChip} onPress={() => !recording && setTorch((t) => !t)}>
              <Ionicons name={torch ? 'flash' : 'flash-outline'} size={16} color="#FFF" />
              <Text style={styles.smallChipTextLight}>{torch ? 'Light on' : 'Light'}</Text>
            </TouchableOpacity>
          ) : null}
        </View>

        {/* Filters / Effects rail */}
        <View style={styles.lookSegment}>
          {(['filter', 'effect'] as const).map((k) => (
            <TouchableOpacity
              key={k}
              style={[styles.lookSegmentChip, lookKind === k && styles.lookSegmentChipOn]}
              onPress={() => setLookKind(k)}
            >
              <Text style={[styles.lookSegmentText, lookKind === k && styles.lookSegmentTextOn]}>
                {k === 'filter' ? 'Filters' : 'Effects'}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.lookRow}
        >
          {activeChips.map((c) => {
            const isOn = lookId === c.id;
            return (
              <TouchableOpacity
                key={c.id}
                style={[styles.lookChip, isOn && styles.lookChipOn]}
                onPress={() => setLookId(c.id)}
                accessibilityLabel={c.label}
              >
                <View style={[styles.lookSwatch, { backgroundColor: c.swatch }]} />
                <Text style={[styles.lookChipText, isOn && styles.lookChipTextOn]}>{c.label}</Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>

        <View style={styles.shutterRow}>
          <TouchableOpacity
            style={[styles.shutterOuter, recording && styles.shutterOuterRecording]}
            onPress={toggleRecord}
            activeOpacity={0.85}
            accessibilityRole="button"
            accessibilityLabel={recording ? 'Stop recording' : 'Start recording'}
          >
            <View style={[styles.shutterInner, recording && styles.shutterInnerRecording]} />
          </TouchableOpacity>
        </View>

        <Text style={styles.hint}>Tap once to record, tap again to finish and open the editor.</Text>
      </View>

      <SoundPickerModal
        visible={soundOpen}
        currentId={pickedSound?.postId ?? null}
        onClose={() => setSoundOpen(false)}
        onPick={(s) => {
          setPickedSound(s);
          setSoundOpen(false);
        }}
      />
    </View>
  );
}

function formatClock(sec: number) {
  const m = Math.floor(sec / 60);
  const s = sec % 60;
  return `${m}:${s.toString().padStart(2, '0')}`;
}

interface SoundPickerModalProps {
  visible: boolean;
  currentId: string | null;
  onClose: () => void;
  onPick: (s: PickedSound) => void;
}

/** Lightweight inline sound picker — viral sounds + free-text search by title/caption. */
function SoundPickerModal({ visible, currentId, onClose, onPick }: SoundPickerModalProps) {
  const insets = useSafeAreaInsets();
  const [query, setQuery] = useState('');
  const [items, setItems] = useState<PickedSound[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!visible) return;
    let cancelled = false;
    setLoading(true);
    const q = query.trim();
    (async () => {
      try {
        if (q.length === 0) {
          const rows = await postsService.getViralSoundsThisWeek({ limit: 20 });
          if (cancelled) return;
          setItems(
            rows.map((r) => ({
              postId: r.postId,
              title: r.soundTitle,
              creatorName: r.creatorDisplayName,
              thumbnailUrl: r.thumbnailUrl ?? undefined,
            })),
          );
        } else {
          /**
           * `searchSounds` lives in postsService — title/caption ILIKE under the
           * hood (see services/supabase/posts.ts). Falls back to viral list if
           * the call shape isn't available on this build.
           */
          const anyService = postsService as unknown as {
            searchSounds?: (q: string, limit?: number) => Promise<
              {
                postId: string;
                soundTitle: string;
                creatorDisplayName: string;
                thumbnailUrl?: string | null;
              }[]
            >;
          };
          if (typeof anyService.searchSounds === 'function') {
            const rows = await anyService.searchSounds(q, 20);
            if (cancelled) return;
            setItems(
              rows.map((r) => ({
                postId: r.postId,
                title: r.soundTitle,
                creatorName: r.creatorDisplayName,
                thumbnailUrl: r.thumbnailUrl ?? undefined,
              })),
            );
          } else {
            const rows = await postsService.getViralSoundsThisWeek({
              limit: 20,
              titleFilter: q,
            });
            if (cancelled) return;
            setItems(
              rows.map((r) => ({
                postId: r.postId,
                title: r.soundTitle,
                creatorName: r.creatorDisplayName,
                thumbnailUrl: r.thumbnailUrl ?? undefined,
              })),
            );
          }
        }
      } catch (e) {
        if (!cancelled) {
          console.warn('[SoundPicker]', e);
          setItems([]);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [query, visible]);

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <View style={styles.sheetBackdrop}>
        <View style={[styles.sheet, { paddingBottom: insets.bottom + 20 }]}>
          <View style={styles.sheetHandle} />
          <View style={styles.sheetHeader}>
            <Text style={styles.sheetTitle}>Add sound</Text>
            <TouchableOpacity onPress={onClose} hitSlop={10} accessibilityLabel="Close">
              <Ionicons name="close" size={24} color={colors.dark.text} />
            </TouchableOpacity>
          </View>

          <View style={styles.searchWrap}>
            <Ionicons name="search-outline" size={18} color={colors.dark.textMuted} />
            <TextInput
              value={query}
              onChangeText={setQuery}
              placeholder="Search sounds or titles"
              placeholderTextColor={colors.dark.textMuted}
              style={styles.searchInput}
              autoCorrect={false}
              autoCapitalize="none"
            />
            {query.length > 0 ? (
              <TouchableOpacity onPress={() => setQuery('')} hitSlop={8}>
                <Ionicons name="close-circle" size={18} color={colors.dark.textMuted} />
              </TouchableOpacity>
            ) : null}
          </View>

          <Text style={styles.sectionHint}>
            {query.trim().length === 0 ? 'Trending sounds this week' : 'Matching sounds'}
          </Text>

          {loading ? (
            <View style={styles.loadingWrap}>
              <ActivityIndicator color={colors.primary.teal} />
            </View>
          ) : items.length === 0 ? (
            <View style={styles.loadingWrap}>
              <Text style={styles.emptyText}>No sounds found.</Text>
            </View>
          ) : (
            <FlatList
              data={items}
              keyExtractor={(item) => item.postId}
              renderItem={({ item }) => {
                const isOn = item.postId === currentId;
                return (
                  <TouchableOpacity
                    style={[styles.soundRow, isOn && styles.soundRowOn]}
                    onPress={() => onPick(item)}
                    activeOpacity={0.85}
                  >
                    {item.thumbnailUrl ? (
                      <Image source={{ uri: item.thumbnailUrl }} style={styles.soundThumb} contentFit="cover" />
                    ) : (
                      <View style={[styles.soundThumb, styles.soundThumbPh]}>
                        <Ionicons name="musical-notes" size={20} color={colors.primary.gold} />
                      </View>
                    )}
                    <View style={{ flex: 1, minWidth: 0 }}>
                      <Text style={styles.soundTitle} numberOfLines={1}>{item.title}</Text>
                      <Text style={styles.soundMeta} numberOfLines={1}>{item.creatorName}</Text>
                    </View>
                    <Ionicons
                      name={isOn ? 'checkmark-circle' : 'add-circle-outline'}
                      size={26}
                      color={isOn ? colors.primary.teal : colors.dark.textMuted}
                    />
                  </TouchableOpacity>
                );
              }}
              keyboardShouldPersistTaps="handled"
              contentContainerStyle={{ paddingBottom: 12 }}
            />
          )}
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#000' },
  centered: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.dark.bg },
  cameraShell: {
    width: '100%',
    backgroundColor: '#000',
  },
  topPillRow: {
    position: 'absolute',
    left: 0,
    right: 0,
    flexDirection: 'row',
    justifyContent: 'center',
  },
  soundPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    maxWidth: '78%',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: 'rgba(0,0,0,0.55)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.18)',
  },
  soundPillText: { color: '#FFF', fontSize: 13, fontWeight: '700', flexShrink: 1 },
  countOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.35)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  countText: { fontSize: 120, fontWeight: '900', color: '#FFF' },
  recBadge: {
    position: 'absolute',
    left: 0,
    right: 0,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  recDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: '#EF4444',
  },
  recText: { color: '#FFF', fontSize: 16, fontWeight: '800' },
  recCap: { color: 'rgba(255,255,255,0.7)', fontSize: 14, fontWeight: '600' },
  toolbar: {
    flex: 1,
    paddingHorizontal: 16,
    paddingTop: 12,
    backgroundColor: '#000',
  },
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  iconHit: {
    width: 44,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
  capRow: { flexDirection: 'row', gap: 8 },
  capChip: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.12)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.2)',
  },
  capChipOn: {
    backgroundColor: colors.primary.teal + '44',
    borderColor: colors.primary.teal,
  },
  capChipText: { color: 'rgba(255,255,255,0.85)', fontWeight: '800', fontSize: 12 },
  capChipTextOn: { color: '#FFF' },
  secondaryRow: { flexDirection: 'row', gap: 10, marginTop: 12, flexWrap: 'wrap' },
  smallChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 16,
    backgroundColor: 'rgba(255,255,255,0.1)',
  },
  smallChipOn: { borderWidth: 1, borderColor: colors.primary.teal },
  smallChipText: { color: '#FFF', fontSize: 12, fontWeight: '700' },
  smallChipTextLight: { color: '#FFF', fontSize: 12, fontWeight: '700' },

  lookSegment: {
    flexDirection: 'row',
    gap: 6,
    marginTop: 14,
    alignSelf: 'flex-start',
  },
  lookSegmentChip: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 14,
    backgroundColor: 'rgba(255,255,255,0.06)',
  },
  lookSegmentChipOn: { backgroundColor: 'rgba(255,255,255,0.18)' },
  lookSegmentText: { color: 'rgba(255,255,255,0.7)', fontSize: 12, fontWeight: '800', letterSpacing: 0.4 },
  lookSegmentTextOn: { color: '#FFF' },

  lookRow: { flexDirection: 'row', gap: 8, paddingVertical: 10, paddingRight: 12 },
  lookChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 8,
    borderRadius: 18,
    backgroundColor: 'rgba(255,255,255,0.08)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
  },
  lookChipOn: { backgroundColor: colors.primary.teal + '33', borderColor: colors.primary.teal },
  lookSwatch: { width: 12, height: 12, borderRadius: 6, borderWidth: 1, borderColor: 'rgba(255,255,255,0.3)' },
  lookChipText: { color: 'rgba(255,255,255,0.85)', fontSize: 12, fontWeight: '700' },
  lookChipTextOn: { color: '#FFF' },

  shutterRow: { flex: 1, alignItems: 'center', justifyContent: 'center', minHeight: 90 },
  shutterOuter: {
    width: 84,
    height: 84,
    borderRadius: 42,
    borderWidth: 5,
    borderColor: '#FFF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  shutterOuterRecording: { borderColor: '#EF4444' },
  shutterInner: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: '#EF4444',
  },
  shutterInnerRecording: {
    width: 32,
    height: 32,
    borderRadius: 8,
    backgroundColor: '#EF4444',
  },
  hint: {
    color: 'rgba(255,255,255,0.55)',
    fontSize: 12,
    textAlign: 'center',
    fontWeight: '600',
    marginTop: 8,
  },
  permTitle: { fontSize: 20, fontWeight: '800', color: colors.dark.text, textAlign: 'center' },
  permSub: { fontSize: 14, color: colors.dark.textMuted, textAlign: 'center', marginTop: 10, lineHeight: 20 },
  permBtn: {
    marginTop: 24,
    backgroundColor: colors.primary.teal,
    paddingVertical: 14,
    paddingHorizontal: 28,
    borderRadius: 999,
  },
  permBtnText: { color: '#FFF', fontWeight: '800', fontSize: 16 },
  permSecondary: { marginTop: 16 },
  permSecondaryText: { color: colors.primary.teal, fontWeight: '700' },

  /* Sound picker sheet */
  sheetBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.6)',
    justifyContent: 'flex-end',
  },
  sheet: {
    backgroundColor: colors.dark.card,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingHorizontal: 16,
    paddingTop: 8,
    maxHeight: '78%',
  },
  sheetHandle: {
    alignSelf: 'center',
    width: 36,
    height: 4,
    borderRadius: 2,
    backgroundColor: 'rgba(255,255,255,0.25)',
    marginVertical: 8,
  },
  sheetHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  sheetTitle: { color: colors.dark.text, fontSize: 18, fontWeight: '800' },
  searchWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: colors.dark.cardAlt,
    borderRadius: 14,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderWidth: 1,
    borderColor: colors.dark.border,
  },
  searchInput: {
    flex: 1,
    color: colors.dark.text,
    fontSize: 14,
    paddingVertical: 0,
  },
  sectionHint: {
    color: colors.dark.textMuted,
    fontSize: 12,
    fontWeight: '700',
    marginTop: 14,
    marginBottom: 8,
    letterSpacing: 0.3,
    textTransform: 'uppercase',
  },
  loadingWrap: { paddingVertical: 32, alignItems: 'center' },
  emptyText: { color: colors.dark.textMuted, fontSize: 14 },
  soundRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 10,
    paddingHorizontal: 8,
    borderRadius: 12,
  },
  soundRowOn: { backgroundColor: colors.primary.teal + '14' },
  soundThumb: { width: 44, height: 44, borderRadius: 8, backgroundColor: colors.dark.cardAlt },
  soundThumbPh: { alignItems: 'center', justifyContent: 'center' },
  soundTitle: { color: colors.dark.text, fontSize: 14, fontWeight: '700' },
  soundMeta: { color: colors.dark.textMuted, fontSize: 12, marginTop: 2 },
});
