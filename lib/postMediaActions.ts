import { Alert, Platform, Share } from 'react-native';
import * as FileSystem from 'expo-file-system/legacy';
import * as Haptics from 'expo-haptics';

import { sharePost } from '@/lib/share';
import { analytics } from '@/lib/analytics';
import { resolvePostMediaDownloadUrl } from '@/lib/storage';
import {
  isVideoExportConfigured,
  requestBrandedVideoFile,
  type BrandedExportProgress,
} from '@/services/export/videoExportClient';
import { useMediaExportUiStore } from '@/store/mediaExportUiStore';
import { getExpoMediaLibrary } from '@/lib/mediaLibraryOptional';
import type { Post } from '@/types';

function isAbortError(e: unknown): boolean {
  return typeof e === 'object' && e !== null && (e as { name?: string }).name === 'AbortError';
}

const HEADLINE = 'Downloading Your Pulse Video';

/** Per-call progress samples, used to estimate remaining time. */
type EtaTracker = {
  startedAt: number;
  firstRealProgressAt: number | null;
  firstRealProgressFraction: number;
};

function createEtaTracker(): EtaTracker {
  return { startedAt: Date.now(), firstRealProgressAt: null, firstRealProgressFraction: 0 };
}

function formatEta(secondsLeft: number): string {
  if (!Number.isFinite(secondsLeft) || secondsLeft <= 0) return '';
  if (secondsLeft < 5) return 'almost done';
  if (secondsLeft < 60) return `~${Math.ceil(secondsLeft / 5) * 5}s left`;
  const m = Math.ceil(secondsLeft / 60);
  return `~${m} min left`;
}

function computeEta(tracker: EtaTracker, fraction: number): string {
  // Wait until we have a non-trivial progress sample to anchor the rate;
  // the first 18% is mostly upload setup and download, which doesn't predict encode time.
  if (fraction < 0.2) return '';
  const now = Date.now();
  if (tracker.firstRealProgressAt == null) {
    tracker.firstRealProgressAt = now;
    tracker.firstRealProgressFraction = fraction;
    return '';
  }
  const elapsedSinceAnchor = (now - tracker.firstRealProgressAt) / 1000;
  const fractionDone = Math.max(0.001, fraction - tracker.firstRealProgressFraction);
  const fractionLeft = Math.max(0, 1 - fraction);
  const rate = fractionDone / elapsedSinceAnchor; // fraction per second
  if (rate <= 0) return '';
  const secondsLeft = fractionLeft / rate;
  return formatEta(secondsLeft);
}

function copyForBrandedExportProgress(
  p: BrandedExportProgress,
  tracker: EtaTracker,
): {
  headline: string;
  detail: string;
  progress: number | null;
} {
  // Per-phase fallbacks keep the bar moving monotonically when the worker hasn't reported a number yet.
  const fallbackByPhase: Record<BrandedExportProgress['phase'] | 'default', number> = {
    submitting: 0.05,
    queued: 0.15,
    encoding: 0.45,
    downloading: 0.85,
    default: 0.1,
  };
  const fallback = fallbackByPhase[p.phase] ?? fallbackByPhase.default;
  const resolved = typeof p.progress === 'number' ? Math.max(0, Math.min(1, p.progress)) : fallback;
  const pct = Math.round(resolved * 100);
  const eta = computeEta(tracker, resolved);
  return {
    headline: HEADLINE,
    detail: eta ? `${pct}% · ${eta}` : `${pct}%`,
    progress: resolved,
  };
}

type GallerySaveResult = 'saved' | 'denied' | 'failed';

/**
 * Save a local file (file://) to the system photo library / gallery when permitted.
 * Uses write-scoped media permission on Android where supported.
 */
export async function saveLocalFileToGallery(localUri: string): Promise<GallerySaveResult> {
  if (Platform.OS === 'web') return 'failed';

  const MediaLibrary = getExpoMediaLibrary();
  if (!MediaLibrary) return 'failed';

  try {
    let { granted } = await MediaLibrary.getPermissionsAsync(true);
    if (!granted) {
      ({ granted } = await MediaLibrary.requestPermissionsAsync(true));
    }
    if (!granted) {
      return 'denied';
    }

    await MediaLibrary.saveToLibraryAsync(localUri);
    return 'saved';
  } catch {
    return 'failed';
  }
}

function openShareForLocalFile(uri: string): void {
  void Share.share({
    url: uri,
    message: Platform.OS === 'ios' ? '' : 'Saved from PulseVerse',
    title: 'Save or share',
  });
}

/** True when Save / share-sheet download should be offered (video or image with a file URL). */
export function postHasDownloadableMedia(post: Post): boolean {
  if (post.type === 'video' && post.mediaUrl?.trim()) return true;
  if (post.type === 'image' && (post.mediaUrl?.trim() || post.thumbnailUrl?.trim())) return true;
  return false;
}

export type RemoteDownloadOpts = {
  mimeType?: string;
  /** iOS UTI hint for share sheet */
  utiIos?: string;
  /**
   * When true (e.g. feed / My Pulse post download), save directly to Photos / gallery after download.
   * When false or omitted (e.g. audio files), only the share sheet is used.
   */
  saveToGallery?: boolean;
};

/** Download any remote file to cache, then save to gallery and/or open the share sheet. */
export async function shareDownloadedRemoteUrl(
  remote: string,
  fileBase: string,
  opts: RemoteDownloadOpts = {},
): Promise<void> {
  if (!remote?.trim()) {
    Alert.alert('Download', 'Nothing to download.');
    return;
  }

  const extGuess = remote.split('?')[0].split('.').pop()?.toLowerCase();
  const ext =
    extGuess && extGuess.length <= 5 && extGuess !== remote ? extGuess : 'mp4';

  const base = FileSystem.cacheDirectory ?? '';
  const safeBase = fileBase.replace(/[^a-zA-Z0-9-_]/g, '').slice(0, 40) || 'pulseverse-file';
  const dest = `${base}${safeBase}.${ext}`;

  try {
    const fetchUrl = await resolvePostMediaDownloadUrl(remote);
    const { uri } = await FileSystem.downloadAsync(fetchUrl, dest);
    if (Platform.OS === 'web') {
      await Share.share({ message: remote, url: remote });
      return;
    }

    if (opts.saveToGallery) {
      const gallery = await saveLocalFileToGallery(uri);
      if (gallery === 'saved') {
        Alert.alert(
          'Saved',
          Platform.OS === 'ios' ? 'Saved to Photos.' : 'Saved to your gallery.',
        );
        return;
      }
      if (gallery === 'denied') {
        Alert.alert(
          'Gallery access',
          'Allow photo access in Settings to save straight to your gallery, or use Share to save the file another way.',
          [
            { text: 'Cancel', style: 'cancel' },
            { text: 'Share…', onPress: () => openShareForLocalFile(uri) },
          ],
        );
        return;
      }
    }

    openShareForLocalFile(uri);
  } catch (e: any) {
    Alert.alert('Download failed', e?.message ?? 'Could not download this file.');
  }
}

function mediaUrlForDownload(post: Post): string | null {
  const u = post.mediaUrl?.trim();
  if (u) return u;
  if (post.type === 'image') return post.thumbnailUrl?.trim() ?? null;
  return null;
}

/** Download remote media to cache, then open the OS share sheet (save to Photos / Files / send). */
export async function shareDownloadedPostMedia(post: Post): Promise<void> {
  const remote = mediaUrlForDownload(post);
  if (!remote) {
    Alert.alert('Download', 'This post has no media file to save.');
    return;
  }

  // Only one branded export job at a time — the worker runs on a single shared CPU
  // and queues serially anyway, so a second tap would just stall and confuse the user.
  // We refuse the new tap and keep the existing job intact rather than auto-cancelling.
  const uiState = useMediaExportUiStore.getState();
  if (uiState.mode === 'progress') {
    const samePost = uiState.activePostId === post.id;
    Alert.alert(
      samePost ? 'Already downloading' : 'Download in progress',
      samePost
        ? 'This video is already being prepared. Hang tight — it’ll finish in a moment.'
        : 'Another video is still being prepared. Wait for it to finish (or cancel it from the banner) before starting a new one.',
      [{ text: 'OK' }],
    );
    void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
    return;
  }

  if (post.type === 'video' && isVideoExportConfigured() && Platform.OS !== 'web') {
    const ui = useMediaExportUiStore.getState();
    const signal = ui.begin(post, remote);
    if (!signal) {
      // Race: another tap won between the busy check above and `begin`. Bail silently.
      return;
    }
    const etaTracker = createEtaTracker();
    try {
      analytics.track('media_export_start', {
        postId: post.id,
        anonymous: post.isAnonymous === true,
      });
      const localUri = await requestBrandedVideoFile(post, remote, {
        signal,
        onProgress: (p) => {
          const c = copyForBrandedExportProgress(p, etaTracker);
          ui.setProgress(c.headline, c.detail, c.progress);
        },
      });
      if (signal.aborted) {
        ui.dismiss();
        return;
      }
      if (!localUri) {
        ui.dismiss();
      } else {
        ui.setProgress('Saving…', 'Adding to your photo library…', 0.96);
        const gallery = await saveLocalFileToGallery(localUri);
        if (gallery === 'saved') {
          analytics.track('media_export_complete', { postId: post.id });
          ui.setSuccess(localUri, true);
          void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
          return;
        }
        // Expo Go (no expo-media-library) or permission denied — file still in cache.
        // Keep the success card visible so the user can tap "Save to Photos" themselves.
        analytics.track('media_export_complete', {
          postId: post.id,
          savedToPhotos: false,
          reason: gallery,
        });
        ui.setSuccess(localUri, false);
        void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        return;
      }
    } catch (e: unknown) {
      if (isAbortError(e)) {
        ui.dismiss();
        return;
      }
      const msg = e instanceof Error ? e.message : String(e);
      analytics.track('media_export_fail', { postId: post.id, reason: 'worker_error', message: msg });
      ui.setError(msg.length > 160 ? `${msg.slice(0, 157)}…` : msg);
      return;
    }
  }

  await shareDownloadedRemoteUrl(remote, `pulseverse-${post.id}`, {
    mimeType: post.type === 'video' ? 'video/mp4' : 'image/jpeg',
    utiIos: post.type === 'video' ? 'public.mpeg-4' : 'public.jpeg',
    saveToGallery: true,
  });

  if (post.type === 'video') {
    analytics.track('post_media_download_raw', {
      postId: post.id,
      reason: isVideoExportConfigured() ? 'fallback' : 'export_not_configured',
    });
    if (__DEV__ && !isVideoExportConfigured()) {
      console.warn(
        '[PulseVerse] Video downloaded WITHOUT end card / burned watermark — set EXPO_PUBLIC_VIDEO_EXPORT_URL and deploy export-worker (see services/export/FFMPEG_EXPORT.md).',
      );
    }
  }
}

export async function sharePostLink(post: Post): Promise<void> {
  await sharePost(post.id, post.caption ?? '', { anonymous: post.isAnonymous });
}
