import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Pressable,
  ScrollView,
  Share,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import * as FileSystem from 'expo-file-system/legacy';
import * as Linking from 'expo-linking';
import { useRouter } from 'expo-router';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/components/ui/Toast';
import { LiveClipPublishSuccessSheet } from '@/components/live/clips/LiveClipPublishSuccessSheet';
import {
  PulseButton,
  PulseCard,
  PulseEmptyState,
  PulseIconButton,
  PulseLoadingSkeleton,
  PulseScreen,
  PulseTabs,
} from '@/components/ui/pulse';
import { LivePostStreamSummary } from '@/components/live/clips/LivePostStreamSummary';
import { ClipStudioStreamSettings } from '@/components/live/clips/ClipStudioStreamSettings';
import {
  friendlyLiveClipDownloadError,
  friendlyLiveClipSettingsError,
} from '@/lib/live/liveClipSettingsErrors';
import {
  liveClipsService,
  streamClipMarkersService,
  streamsLiveService,
  type LiveClip,
  type LiveClipMarker,
} from '@/services/supabase';
import { formatClipMarkerTime } from '@/lib/live/clipMarkerErrors';
import {
  CLIP_STUDIO_PHI_REMINDER,
  LIVE_CLIP_CATEGORIES,
  clipWindowForPreset,
  type ClipDurationPreset,
} from '@/lib/live/clipStudio';
import { pulseColors, pulseGradients, pulseRadius, pulseSpacing, pulseTypography } from '@/lib/theme/pulseTheme';
import { liveStreamHref } from '@/lib/navigation/liveRoutes';

type Props = {
  streamId: string;
  onClose: () => void;
};

type Step = 'markers' | 'edit' | 'library';

function markerLabel(m: LiveClipMarker): string {
  return m.title?.trim() || `Moment at ${formatClipMarkerTime(m.markerTimeSeconds)}`;
}

function clipStatusLabel(status: LiveClip['status']): string {
  switch (status) {
    case 'draft':
      return 'Draft';
    case 'processing':
      return 'Processing';
    case 'ready':
      return 'Ready';
    case 'failed':
      return 'Failed';
    case 'published':
      return 'Published';
    default:
      return status;
  }
}

/** Premium Clip Studio — markers → trim → generate → publish. */
export function ClipStudioScreen({ streamId, onClose }: Props) {
  const router = useRouter();
  const { user, profile } = useAuth();
  const showToast = useToast((s) => s.show);

  const [step, setStep] = useState<Step>('markers');
  const [loading, setLoading] = useState(true);
  const [backendReady, setBackendReady] = useState(true);
  const [streamTitle, setStreamTitle] = useState('Live stream');
  const [streamEnded, setStreamEnded] = useState(false);
  const [peakViewers, setPeakViewers] = useState(0);
  const [startedAt, setStartedAt] = useState<string | null>(null);
  const [endedAt, setEndedAt] = useState<string | null>(null);
  const [streamHostId, setStreamHostId] = useState<string | null>(null);
  const [streamIsLive, setStreamIsLive] = useState(false);
  const [requireHostApproval, setRequireHostApproval] = useState(true);
  const [allowClipDownloads, setAllowClipDownloads] = useState(false);
  const [togglingClipSetting, setTogglingClipSetting] = useState<'require_approval' | 'downloads' | null>(null);
  const [markers, setMarkers] = useState<LiveClipMarker[]>([]);
  const [clips, setClips] = useState<LiveClip[]>([]);
  const [selectedMarker, setSelectedMarker] = useState<LiveClipMarker | null>(null);
  const [preset, setPreset] = useState<ClipDurationPreset>(30);
  const [customStart, setCustomStart] = useState('');
  const [customEnd, setCustomEnd] = useState('');
  const [title, setTitle] = useState('Live clip');
  const [caption, setCaption] = useState('');
  const [hashtags, setHashtags] = useState('');
  const [category, setCategory] = useState<string>('education');
  const [generating, setGenerating] = useState(false);
  const [publishingId, setPublishingId] = useState<string | null>(null);
  const [publishSuccess, setPublishSuccess] = useState<{ postId: string } | null>(null);

  const refresh = useCallback(async () => {
    setLoading(true);
    try {
      const [clipReady, stream, markerRows, clipRows] = await Promise.all([
        liveClipsService.isBackendReady(),
        streamsLiveService.getById(streamId),
        streamClipMarkersService.listForHost(streamId),
        liveClipsService.listForStream(streamId),
      ]);
      setBackendReady(clipReady);
      if (stream) {
        setStreamTitle(stream.title);
        setStreamEnded(stream.status === 'ended' || Boolean(stream.endedAt));
        setStreamIsLive(stream.status === 'live' && !stream.endedAt);
        setStreamHostId(stream.hostId);
        setRequireHostApproval(stream.requireHostApproval !== false);
        setAllowClipDownloads(Boolean(stream.allowClipDownloads));
        setPeakViewers(stream.peakViewerCount ?? 0);
        setStartedAt(stream.startedAt ?? null);
        setEndedAt(stream.endedAt ?? null);
      }
      setMarkers(markerRows);
      setClips(clipRows);
    } finally {
      setLoading(false);
    }
  }, [streamId]);

  useEffect(() => {
    void refresh();
    const unsubMarkers = streamClipMarkersService.subscribe(streamId, () => void refresh(), 'studio');
    const unsubClips = liveClipsService.subscribe(streamId, () => void refresh(), 'studio');
    return () => {
      unsubMarkers();
      unsubClips();
    };
  }, [streamId, refresh]);

  const pendingMarkers = useMemo(
    () => markers.filter((m) => m.status === 'pending'),
    [markers],
  );

  const durationLabel = useMemo(() => {
    if (!startedAt) return '—';
    const startMs = new Date(startedAt).getTime();
    const endMs = endedAt ? new Date(endedAt).getTime() : Date.now();
    const totalSec = Math.max(0, Math.floor((endMs - startMs) / 1000));
    const hours = Math.floor(totalSec / 3600);
    const minutes = Math.floor((totalSec % 3600) / 60);
    const seconds = totalSec % 60;
    if (hours > 0) return `${hours}h ${minutes}m`;
    if (minutes > 0) return `${minutes}m ${seconds}s`;
    return `${seconds}s`;
  }, [startedAt, endedAt]);
  const usableMarkers = useMemo(
    () =>
      markers.filter(
        (m) => m.status === 'submitted' || m.status === 'approved' || m.status === 'pending',
      ),
    [markers],
  );

  const windowPreview = useMemo(() => {
    if (!selectedMarker) return null;
    if (preset === 'custom') {
      const start = Number(customStart);
      const end = Number(customEnd);
      if (!Number.isFinite(start) || !Number.isFinite(end)) return null;
      return clipWindowForPreset(selectedMarker.markerTimeSeconds, 'custom', {
        startSeconds: start,
        endSeconds: end,
      });
    }
    return clipWindowForPreset(selectedMarker.markerTimeSeconds, preset);
  }, [selectedMarker, preset, customStart, customEnd]);

  const selectMarker = (marker: LiveClipMarker) => {
    setSelectedMarker(marker);
    setTitle(markerLabel(marker));
    if (marker.clipDurationSeconds) {
      setPreset(marker.clipDurationSeconds);
    } else {
      const span = Math.max(1, marker.endSeconds - marker.startSeconds);
      setPreset(span <= 15 ? 15 : span <= 30 ? 30 : 60);
    }
    setCustomStart(String(marker.startSeconds));
    setCustomEnd(String(marker.endSeconds));
    setStep('edit');
  };

  const isStreamHost = Boolean(user?.id && streamHostId && user.id === streamHostId);
  const canDownloadClips = isStreamHost || allowClipDownloads;

  const updateClipSetting = useCallback(
    async (
      patch: { requireHostApproval?: boolean; allowClipDownloads?: boolean },
      key: 'require_approval' | 'downloads',
    ) => {
      if (!isStreamHost || togglingClipSetting) return;
      setTogglingClipSetting(key);
      try {
        const result = await streamsLiveService.updateClipSettings(streamId, patch);
        if (!result.ok) {
          showToast(friendlyLiveClipSettingsError(result.code), 'error');
          return;
        }
        if (result.requireHostApproval !== undefined) {
          setRequireHostApproval(result.requireHostApproval);
        }
        if (result.allowClipDownloads !== undefined) {
          setAllowClipDownloads(result.allowClipDownloads);
        }
        showToast('Clip permissions updated.', 'success');
      } catch (err) {
        if (__DEV__) console.warn('[ClipStudio.updateClipSetting]', err);
        showToast(friendlyLiveClipSettingsError('unknown'), 'error');
      } finally {
        setTogglingClipSetting(null);
      }
    },
    [isStreamHost, streamId, showToast, togglingClipSetting],
  );

  const reviewMarker = async (markerId: string, decision: 'approved' | 'rejected') => {
    const result = await streamClipMarkersService.reviewMarker(markerId, decision);
    if (result.ok) {
      showToast(decision === 'approved' ? 'Submission approved.' : 'Submission rejected.', 'success');
      void refresh();
    } else {
      showToast('Could not update submission.', 'error');
    }
  };

  const handleGenerate = async () => {
    if (!selectedMarker || !user?.id || generating) return;
    if (!windowPreview || windowPreview.durationSeconds > 120) {
      showToast('Clip must be 2 minutes or less.', 'error');
      return;
    }
    setGenerating(true);
    try {
      const draft = await liveClipsService.createDraft({
        streamId,
        markerId: selectedMarker.id,
        title: title.trim() || 'Live clip',
        caption: caption.trim(),
        hashtags: hashtags
          .split(/[\s,#]+/)
          .map((t) => t.trim())
          .filter(Boolean),
        category,
        startSeconds: windowPreview.startSeconds,
        endSeconds: windowPreview.endSeconds,
      });
      if (!draft.ok || !draft.clipId) {
        showToast(
          draft.code === 'marker_not_approved'
            ? 'Approve viewer submissions before generating.'
            : 'Could not create clip draft.',
          'error',
        );
        return;
      }
      const gen = await liveClipsService.generate(draft.clipId);
      if (!gen.ok) {
        showToast('Could not start clip processing.', 'error');
        return;
      }
      showToast('Clip queued for processing.', 'success');
      setStep('library');
      void refresh();
    } finally {
      setGenerating(false);
    }
  };

  const handlePublish = (clip: LiveClip) => {
    if (clip.publishStatus === 'published') {
      showToast('Already published to Feed.', 'info');
      return;
    }
    if (clip.status !== 'ready') {
      showToast('Clip is not ready yet.', 'info');
      return;
    }
    Alert.alert(
      'Publish to Feed?',
      CLIP_STUDIO_PHI_REMINDER,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'I confirm — Publish',
          onPress: async () => {
            setPublishingId(clip.id);
            try {
              const result = await liveClipsService.publishToFeed({
                clip,
                hostDisplayName: profile?.displayName ?? 'Host',
                creatorId: user!.id,
                phiAcknowledged: true,
              });
              if (result.ok) {
                if (result.postId) {
                  setPublishSuccess({ postId: result.postId });
                } else {
                  showToast('Published to Feed.', 'success');
                }
                void refresh();
              } else {
                showToast('Could not publish clip.', 'error');
              }
            } finally {
              setPublishingId(null);
            }
          },
        },
      ],
    );
  };

  const handleDownload = (clip: LiveClip) => {
    if (!canDownloadClips) {
      showToast(friendlyLiveClipDownloadError('downloads_disabled'), 'error');
      return;
    }
    Alert.alert('Download clip?', CLIP_STUDIO_PHI_REMINDER, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Download',
        onPress: () => {
          void (async () => {
            const { url, code } = await liveClipsService.getDownloadSignedUrl(clip.id);
            if (!url) {
              showToast(friendlyLiveClipDownloadError(code), 'error');
              return;
            }
            try {
              const dest = `${FileSystem.cacheDirectory ?? ''}pulse-live-clip-${clip.id}.mp4`;
              const res = await FileSystem.downloadAsync(url, dest);
              if (res.uri) {
                await Share.share({ url: res.uri, message: clip.title });
              } else {
                await Linking.openURL(url);
              }
            } catch {
              await Linking.openURL(url).catch(() => showToast('Could not open download.', 'error'));
            }
          })();
        },
      },
    ]);
  };

  const handleDelete = (clip: LiveClip) => {
    Alert.alert('Delete clip?', 'This removes the draft from Clip Studio.', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          const ok = await liveClipsService.deleteClip(clip.id);
          showToast(ok ? 'Clip deleted.' : 'Could not delete clip.', ok ? 'success' : 'error');
          void refresh();
        },
      },
    ]);
  };

  if (!backendReady) {
    return (
      <PulseScreen accentVeil={false}>
        <PulseEmptyState
          icon="cut-outline"
          title="Clip Studio needs migration 207"
          message="Apply supabase/migrations/207_live_clips.sql to enable clips."
        />
      </PulseScreen>
    );
  }

  const studioTabs = [
    { id: 'markers', label: 'Markers' },
    { id: 'edit', label: 'Editor' },
    { id: 'library', label: 'Clips' },
  ];

  return (
    <View style={styles.root}>
      <LinearGradient colors={[...pulseGradients.screen]} style={StyleSheet.absoluteFill} />

      <View style={styles.header}>
        <PulseIconButton icon="close" onPress={onClose} accessibilityLabel="Close" size="sm" tone="ghost" />
        <View style={styles.headerCenter}>
          <Text style={styles.headerTitle}>Clip Studio</Text>
          <Text style={styles.headerSub} numberOfLines={1}>
            {streamTitle}
          </Text>
        </View>
        <PulseIconButton
          icon="albums-outline"
          onPress={() => setStep('library')}
          accessibilityLabel="Open clip library"
          size="sm"
          tone="teal"
        />
      </View>

      <View style={styles.tabsWrap}>
        <PulseTabs
          tabs={studioTabs}
          activeId={step}
          onChange={(id) => setStep(id as Step)}
          scrollable
        />
      </View>

      {loading ? (
        <View style={styles.loading}>
          <PulseLoadingSkeleton card />
        </View>
      ) : (
        <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
          {streamEnded ? (
            <LivePostStreamSummary
              streamTitle={streamTitle}
              durationLabel={durationLabel}
              peakViewers={peakViewers}
              markerCount={markers.length}
              clipCount={clips.length}
            />
          ) : null}
          {isStreamHost ? (
            <ClipStudioStreamSettings
              requireHostApproval={requireHostApproval}
              allowClipDownloads={allowClipDownloads}
              streamIsLive={streamIsLive}
              togglingSetting={togglingClipSetting}
              onToggleRequireHostApproval={(v) => void updateClipSetting({ requireHostApproval: v }, 'require_approval')}
              onToggleAllowClipDownloads={(v) => void updateClipSetting({ allowClipDownloads: v }, 'downloads')}
            />
          ) : null}
          {step === 'markers' ? (
            <View style={styles.section}>
              {pendingMarkers.length > 0 ? (
                <>
                  <Text style={styles.sectionTitle}>Viewer submissions</Text>
                  {pendingMarkers.map((m) => (
                    <View key={m.id} style={styles.markerRow}>
                      <View style={styles.markerCopy}>
                        <Text style={styles.markerTitle}>{markerLabel(m)}</Text>
                        <Text style={styles.markerMeta}>
                          {formatClipMarkerTime(m.startSeconds)}–{formatClipMarkerTime(m.endSeconds)}
                        </Text>
                      </View>
                      <View style={styles.markerActions}>
                        <Pressable onPress={() => reviewMarker(m.id, 'approved')} style={styles.approveBtn}>
                          <Text style={styles.approveTxt}>Approve</Text>
                        </Pressable>
                        <Pressable onPress={() => reviewMarker(m.id, 'rejected')} style={styles.rejectBtn}>
                          <Text style={styles.rejectTxt}>Reject</Text>
                        </Pressable>
                      </View>
                    </View>
                  ))}
                </>
              ) : null}

              <Text style={styles.sectionTitle}>Moments</Text>
              {usableMarkers.length === 0 ? (
                <PulseEmptyState
                  icon="bookmark-outline"
                  title="No moments yet"
                  message="Mark moments during your live to clip them here."
                  style={styles.inlineEmpty}
                />
              ) : (
                usableMarkers.map((m) => (
                  <Pressable key={m.id} onPress={() => selectMarker(m)} style={styles.markerPick}>
                    <Ionicons name="bookmark-outline" size={18} color={pulseColors.teal} />
                    <View style={styles.markerCopy}>
                      <Text style={styles.markerTitle}>{markerLabel(m)}</Text>
                      <Text style={styles.markerMeta}>
                        {m.status === 'pending' ? 'Pending approval · ' : ''}
                        at {formatClipMarkerTime(m.markerTimeSeconds)}
                      </Text>
                    </View>
                    <Ionicons name="chevron-forward" size={16} color={pulseColors.mutedText} />
                  </Pressable>
                ))
              )}
            </View>
          ) : null}

          {step === 'edit' ? (
            <View style={styles.section}>
              {!selectedMarker ? (
                <Text style={styles.hint}>Select a marker first.</Text>
              ) : (
                <>
                  <Text style={styles.sectionTitle}>Duration</Text>
                  <View style={styles.presetRow}>
                    {([15, 30, 60] as ClipDurationPreset[]).map((p) => (
                      <Pressable
                        key={p}
                        onPress={() => setPreset(p)}
                        style={[styles.presetBtn, preset === p && styles.presetBtnOn]}
                      >
                        <Text style={[styles.presetTxt, preset === p && styles.presetTxtOn]}>{p}s</Text>
                      </Pressable>
                    ))}
                    <Pressable
                      onPress={() => setPreset('custom')}
                      style={[styles.presetBtn, preset === 'custom' && styles.presetBtnOn]}
                    >
                      <Text style={[styles.presetTxt, preset === 'custom' && styles.presetTxtOn]}>Custom</Text>
                    </Pressable>
                  </View>

                  {preset === 'custom' ? (
                    <View style={styles.customRow}>
                      <TextInput
                        value={customStart}
                        onChangeText={setCustomStart}
                        keyboardType="number-pad"
                        placeholder="Start sec"
                        placeholderTextColor={pulseColors.mutedText}
                        style={styles.input}
                      />
                      <TextInput
                        value={customEnd}
                        onChangeText={setCustomEnd}
                        keyboardType="number-pad"
                        placeholder="End sec"
                        placeholderTextColor={pulseColors.mutedText}
                        style={styles.input}
                      />
                    </View>
                  ) : null}

                  {windowPreview ? (
                    <Text style={styles.windowPreview}>
                      Window {formatClipMarkerTime(windowPreview.startSeconds)}–
                      {formatClipMarkerTime(windowPreview.endSeconds)} ({windowPreview.durationSeconds}s)
                    </Text>
                  ) : null}

                  <Text style={styles.sectionTitle}>Details</Text>
                  <TextInput
                    value={title}
                    onChangeText={setTitle}
                    placeholder="Title"
                    placeholderTextColor={pulseColors.mutedText}
                    style={styles.input}
                  />
                  <TextInput
                    value={caption}
                    onChangeText={setCaption}
                    placeholder="Caption"
                    placeholderTextColor={pulseColors.mutedText}
                    style={[styles.input, styles.inputMultiline]}
                    multiline
                  />
                  <TextInput
                    value={hashtags}
                    onChangeText={setHashtags}
                    placeholder="#hashtags separated by spaces"
                    placeholderTextColor={pulseColors.mutedText}
                    style={styles.input}
                  />

                  <Text style={styles.sectionTitle}>Category</Text>
                  <View style={styles.presetRow}>
                    {LIVE_CLIP_CATEGORIES.map((c) => (
                      <Pressable
                        key={c}
                        onPress={() => setCategory(c)}
                        style={[styles.chip, category === c && styles.chipOn]}
                      >
                        <Text style={[styles.chipTxt, category === c && styles.chipTxtOn]}>{c}</Text>
                      </Pressable>
                    ))}
                  </View>

                  <PulseButton
                    label="Generate clip (draft)"
                    onPress={() => void handleGenerate()}
                    disabled={generating || !windowPreview}
                    loading={generating}
                    variant="primary"
                    fullWidth
                  />
                  <Text style={styles.hint}>{CLIP_STUDIO_PHI_REMINDER}</Text>
                </>
              )}
            </View>
          ) : null}

          {step === 'library' ? (
            <View style={styles.section}>
              {clips.length === 0 ? (
                <PulseEmptyState
                  icon="albums-outline"
                  title="No clips yet"
                  message="Generated clips appear here as drafts."
                  style={styles.inlineEmpty}
                />
              ) : (
                clips.map((clip) => {
                  const thumb = liveClipsService.getPublicThumbnailUrl(clip.thumbnailPath);
                  return (
                    <PulseCard key={clip.id} variant="glass" style={styles.clipCard}>
                      <View style={styles.clipTop}>
                        {thumb ? (
                          <Image source={{ uri: thumb }} style={styles.thumb} contentFit="cover" />
                        ) : (
                          <View style={[styles.thumb, styles.thumbPlaceholder]}>
                            <Ionicons name="videocam-outline" size={24} color={pulseColors.mutedText} />
                          </View>
                        )}
                        <View style={styles.clipMeta}>
                          <Text style={styles.clipTitle} numberOfLines={2}>
                            {clip.title}
                          </Text>
                          <Text style={styles.clipSub}>
                            {clip.durationSeconds ?? clip.endSeconds - clip.startSeconds}s ·{' '}
                            {clipStatusLabel(clip.status)}
                          </Text>
                          <Text style={styles.clipSub} numberOfLines={1}>
                            From {clip.streamTitle ?? streamTitle}
                          </Text>
                        </View>
                      </View>
                      {clip.errorMessage ? (
                        <Text style={styles.errorTxt}>{clip.errorMessage}</Text>
                      ) : null}
                      <View style={styles.clipActions}>
                        <ClipAction
                          label="Publish"
                          icon="paper-plane-outline"
                          onPress={() => handlePublish(clip)}
                          disabled={clip.status !== 'ready' || publishingId === clip.id}
                          loading={publishingId === clip.id}
                        />
                        {canDownloadClips ? (
                          <ClipAction
                            label="Download"
                            icon="download-outline"
                            onPress={() => handleDownload(clip)}
                            disabled={clip.status !== 'ready' && clip.status !== 'published'}
                          />
                        ) : null}
                        <ClipAction
                          label="Share"
                          icon="share-outline"
                          onPress={() =>
                            void Share.share({ message: `${clip.title} — clipped from ${streamTitle}` })
                          }
                        />
                        <ClipAction
                          label="Delete"
                          icon="trash-outline"
                          onPress={() => handleDelete(clip)}
                          danger
                        />
                      </View>
                    </PulseCard>
                  );
                })
              )}
            </View>
          ) : null}
        </ScrollView>
      )}

      <LiveClipPublishSuccessSheet
        visible={publishSuccess != null}
        streamTitle={streamTitle}
        onViewFeed={() => {
          const postId = publishSuccess?.postId;
          setPublishSuccess(null);
          if (postId) router.push(`/feed/${postId}` as never);
          else router.replace('/(tabs)/feed');
        }}
        onOpenSourceLive={() => {
          setPublishSuccess(null);
          router.push(liveStreamHref(streamId));
        }}
        onClipAnother={() => {
          setPublishSuccess(null);
          setStep('library');
        }}
        onClose={() => setPublishSuccess(null)}
      />
    </View>
  );
}

function ClipAction({
  label,
  icon,
  onPress,
  disabled,
  loading,
  danger,
}: {
  label: string;
  icon: keyof typeof Ionicons.glyphMap;
  onPress: () => void;
  disabled?: boolean;
  loading?: boolean;
  danger?: boolean;
}) {
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled || loading}
      style={[styles.actionBtn, disabled && styles.actionBtnDisabled, danger && styles.actionBtnDanger]}
    >
      {loading ? (
        <ActivityIndicator size="small" color={pulseColors.teal} />
      ) : (
        <Ionicons
          name={icon}
          size={16}
          color={danger ? pulseColors.danger : disabled ? pulseColors.mutedText : pulseColors.teal}
        />
      )}
      <Text style={[styles.actionTxt, danger && styles.actionTxtDanger]}>{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: pulseSpacing.md,
    paddingVertical: 10,
    gap: pulseSpacing.sm,
  },
  headerCenter: { flex: 1, minWidth: 0 },
  headerTitle: { ...pulseTypography.sectionTitle },
  headerSub: { ...pulseTypography.caption },
  tabsWrap: { paddingHorizontal: pulseSpacing.lg, paddingBottom: pulseSpacing.sm },
  loading: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: pulseSpacing.xl },
  scroll: { padding: pulseSpacing.lg, paddingBottom: pulseSpacing['3xl'] },
  section: { gap: pulseSpacing.md },
  sectionTitle: { ...pulseTypography.label },
  hint: { ...pulseTypography.bodySmall, lineHeight: 20 },
  inlineEmpty: { paddingVertical: pulseSpacing.xl },
  markerPick: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    padding: pulseSpacing.md,
    borderRadius: pulseRadius.lg,
    backgroundColor: pulseColors.glass,
    borderWidth: 1,
    borderColor: pulseColors.border,
  },
  markerRow: {
    padding: pulseSpacing.md,
    borderRadius: pulseRadius.lg,
    backgroundColor: pulseColors.glass,
    borderWidth: 1,
    borderColor: 'rgba(246, 196, 83, 0.2)',
    gap: 10,
  },
  markerCopy: { flex: 1, minWidth: 0 },
  markerTitle: { ...pulseTypography.bodySmall, fontWeight: '700', color: pulseColors.text },
  markerMeta: { ...pulseTypography.caption, marginTop: 2 },
  markerActions: { flexDirection: 'row', gap: pulseSpacing.sm },
  approveBtn: {
    paddingHorizontal: pulseSpacing.md,
    paddingVertical: pulseSpacing.sm,
    borderRadius: pulseRadius.full,
    backgroundColor: 'rgba(25, 211, 197, 0.15)',
    borderWidth: 1,
    borderColor: pulseColors.borderAccent,
  },
  approveTxt: { ...pulseTypography.caption, fontWeight: '800', color: pulseColors.teal },
  rejectBtn: {
    paddingHorizontal: pulseSpacing.md,
    paddingVertical: pulseSpacing.sm,
    borderRadius: pulseRadius.full,
    backgroundColor: 'rgba(127, 29, 29, 0.35)',
    borderWidth: 1,
    borderColor: 'rgba(248, 113, 113, 0.35)',
  },
  rejectTxt: { ...pulseTypography.caption, fontWeight: '800', color: pulseColors.danger },
  presetRow: { flexDirection: 'row', flexWrap: 'wrap', gap: pulseSpacing.sm },
  presetBtn: {
    paddingHorizontal: pulseSpacing.lg,
    paddingVertical: 10,
    borderRadius: pulseRadius.full,
    borderWidth: 1,
    borderColor: pulseColors.border,
    backgroundColor: pulseColors.glass,
  },
  presetBtnOn: { borderColor: pulseColors.borderAccent, backgroundColor: 'rgba(25, 211, 197, 0.12)' },
  presetTxt: { ...pulseTypography.caption, fontWeight: '700', color: pulseColors.mutedText },
  presetTxtOn: { color: pulseColors.teal },
  customRow: { flexDirection: 'row', gap: pulseSpacing.sm },
  input: {
    flex: 1,
    minHeight: 44,
    borderRadius: pulseRadius.lg,
    paddingHorizontal: pulseSpacing.lg,
    paddingVertical: 10,
    backgroundColor: pulseColors.glass,
    borderWidth: 1,
    borderColor: pulseColors.borderStrong,
    color: pulseColors.text,
    ...pulseTypography.bodySmall,
  },
  inputMultiline: { minHeight: 88, textAlignVertical: 'top' },
  windowPreview: { ...pulseTypography.caption, color: pulseColors.teal, fontWeight: '700' },
  chip: {
    paddingHorizontal: 10,
    paddingVertical: pulseSpacing.sm,
    borderRadius: pulseRadius.full,
    borderWidth: 1,
    borderColor: pulseColors.border,
  },
  chipOn: { borderColor: pulseColors.borderAccent, backgroundColor: 'rgba(25, 211, 197, 0.1)' },
  chipTxt: { ...pulseTypography.caption, color: pulseColors.mutedText, textTransform: 'capitalize' },
  chipTxtOn: { color: pulseColors.teal, fontWeight: '700' },
  clipCard: { gap: pulseSpacing.sm, marginBottom: pulseSpacing.sm },
  clipTop: { flexDirection: 'row', gap: pulseSpacing.md },
  thumb: { width: 88, height: 88, borderRadius: pulseRadius.lg },
  thumbPlaceholder: {
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: pulseColors.surface,
  },
  clipMeta: { flex: 1, minWidth: 0, gap: 4 },
  clipTitle: { ...pulseTypography.bodySmall, fontWeight: '800', color: pulseColors.text },
  clipSub: { ...pulseTypography.caption },
  errorTxt: { ...pulseTypography.caption, color: pulseColors.danger },
  clipActions: { flexDirection: 'row', flexWrap: 'wrap', gap: pulseSpacing.sm },
  actionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: pulseSpacing.sm,
    borderRadius: pulseRadius.full,
    borderWidth: 1,
    borderColor: pulseColors.borderAccent,
    backgroundColor: pulseColors.glass,
  },
  actionBtnDisabled: { opacity: 0.45 },
  actionBtnDanger: { borderColor: 'rgba(248, 113, 113, 0.35)' },
  actionTxt: { ...pulseTypography.caption, fontWeight: '700', color: pulseColors.teal },
  actionTxtDanger: { color: pulseColors.danger },
});
