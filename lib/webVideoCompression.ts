import { Platform } from 'react-native';
import type { MediaAsset } from '@/lib/media';
import type { CompressProgress } from '@/lib/videoCompression';

/** Stay under Supabase `post-media` bucket limit (50 MiB in config.toml). */
export const WEB_UPLOAD_SAFE_MAX_BYTES = 45 * 1024 * 1024;

/** Re-encode on web when the picker hands us a heavy file (typical phone clip). */
const WEB_REENCODE_MIN_BYTES = 8 * 1024 * 1024;

const DEFAULT_MAX_LONG_EDGE = 1280;
const DEFAULT_VIDEO_BPS = 1_800_000;

function pickRecorderMimeType(): string {
  if (typeof MediaRecorder === 'undefined') {
    throw new Error('This browser cannot prepare video for upload.');
  }
  const candidates = [
    'video/webm;codecs=vp9,opus',
    'video/webm;codecs=vp8,opus',
    'video/webm',
    'video/mp4',
  ];
  for (const mime of candidates) {
    if (MediaRecorder.isTypeSupported(mime)) return mime;
  }
  throw new Error('This browser cannot compress video. Use the mobile app or a shorter clip.');
}

function outputMimeFromRecorder(mimeType: string): string {
  return mimeType.includes('webm') ? 'video/webm' : 'video/mp4';
}

function outputExtFromRecorder(mimeType: string): string {
  return mimeType.includes('webm') ? 'webm' : 'mp4';
}

function waitForVideoMetadata(video: HTMLVideoElement): Promise<void> {
  return new Promise((resolve, reject) => {
    if (video.readyState >= 1) {
      resolve();
      return;
    }
    const onMeta = () => {
      cleanup();
      resolve();
    };
    const onErr = () => {
      cleanup();
      reject(new Error('Could not load video for upload prep'));
    };
    const cleanup = () => {
      video.removeEventListener('loadedmetadata', onMeta);
      video.removeEventListener('error', onErr);
    };
    video.addEventListener('loadedmetadata', onMeta);
    video.addEventListener('error', onErr);
  });
}

function recordStream(
  stream: MediaStream,
  mimeType: string,
  videoBitsPerSecond: number,
  durationSec: number,
  onProgress?: CompressProgress,
): { promise: Promise<Blob>; stop: () => void } {
  const chunks: Blob[] = [];
  const recorder = new MediaRecorder(stream, { mimeType, videoBitsPerSecond });
  let progressTimer: ReturnType<typeof setInterval> | null = null;
  const startedAt = Date.now();

  const promise = new Promise<Blob>((resolve, reject) => {
    recorder.ondataavailable = (ev) => {
      if (ev.data?.size) chunks.push(ev.data);
    };
    recorder.onerror = () => {
      if (progressTimer) clearInterval(progressTimer);
      reject(new Error('Browser video compression failed'));
    };
    recorder.onstop = () => {
      if (progressTimer) clearInterval(progressTimer);
      resolve(new Blob(chunks, { type: mimeType.split(';')[0] }));
    };
  });

  progressTimer = setInterval(() => {
    const elapsed = (Date.now() - startedAt) / 1000;
    onProgress?.(Math.max(0, Math.min(0.98, elapsed / Math.max(durationSec, 0.5))));
  }, 250);

  recorder.start(250);
  return {
    promise,
    stop: () => {
      if (recorder.state !== 'inactive') recorder.stop();
    },
  };
}

async function playAndRecordScaled(
  sourceBlob: Blob,
  maxLongEdge: number,
  videoBitsPerSecond: number,
  onProgress?: CompressProgress,
): Promise<Blob> {
  const video = document.createElement('video');
  video.playsInline = true;
  video.preload = 'auto';
  video.volume = 0;
  /** Keep audio in `captureStream()` — muted elements often drop the audio track. */
  video.muted = false;

  const srcUrl = URL.createObjectURL(sourceBlob);
  video.src = srcUrl;

  try {
    await waitForVideoMetadata(video);
    const durationSec = Math.max(0.25, video.duration || 1);

    let tw = video.videoWidth || maxLongEdge;
    let th = video.videoHeight || maxLongEdge;
    const long = Math.max(tw, th);
    if (long > maxLongEdge) {
      const scale = maxLongEdge / long;
      tw = Math.max(2, Math.round(tw * scale));
      th = Math.max(2, Math.round(th * scale));
    }

    const canvas = document.createElement('canvas');
    canvas.width = tw;
    canvas.height = th;
    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error('Could not prepare video canvas');

    const mimeType = pickRecorderMimeType();
    const canvasStream = canvas.captureStream(30);
    const capture = (video as HTMLVideoElement & { captureStream?: () => MediaStream }).captureStream?.();
    const audioTracks = capture?.getAudioTracks() ?? [];
    for (const track of audioTracks) {
      canvasStream.addTrack(track);
    }

    const { promise: recorderPromise, stop: stopRecorder } = recordStream(
      canvasStream,
      mimeType,
      videoBitsPerSecond,
      durationSec,
      onProgress,
    );

    video.currentTime = 0;
    await video.play();

    await new Promise<void>((resolve, reject) => {
      let raf = 0;
      const paint = () => {
        if (video.ended || video.currentTime >= durationSec - 0.05) {
          video.pause();
          resolve();
          return;
        }
        try {
          ctx.drawImage(video,  0, 0, tw, th);
          onProgress?.(Math.max(0, Math.min(0.98, video.currentTime / durationSec)));
        } catch {
          /* draw can fail briefly before first decoded frame */
        }
        raf = requestAnimationFrame(paint);
      };
      video.onended = () => resolve();
      video.onerror = () => reject(new Error('Could not play video for upload prep'));
      raf = requestAnimationFrame(paint);
    });

    stopRecorder();
    const recorder = await recorderPromise;
    for (const t of canvasStream.getTracks()) t.stop();

    if (recorder.size <= 0) {
      throw new Error('Compressed video was empty — pick the clip again.');
    }
    if (recorder.size > WEB_UPLOAD_SAFE_MAX_BYTES) {
      throw new Error(
        'Video is still too large after compression. Try a shorter clip (under 3 minutes) or use the mobile app.',
      );
    }
    onProgress?.(1);
    return recorder;
  } finally {
    URL.revokeObjectURL(srcUrl);
    video.pause();
    video.removeAttribute('src');
    video.load();
  }
}

export function webVideoNeedsReencode(asset: MediaAsset, sourceBytes: number): boolean {
  if (Platform.OS !== 'web' || asset.type !== 'video') return false;
  if (sourceBytes > WEB_REENCODE_MIN_BYTES) return true;
  if (sourceBytes > WEB_UPLOAD_SAFE_MAX_BYTES) return true;
  const edge = Math.max(asset.width ?? 0, asset.height ?? 0);
  if (edge > DEFAULT_MAX_LONG_EDGE) return true;
  return false;
}

/**
 * Browser-only H.264/WebM re-encode so Creator Hub uploads stay under Storage limits
 * when `react-native-compressor` is unavailable (Expo web / Expo Go).
 */
export async function compressVideoWeb(
  asset: MediaAsset,
  opts?: {
    maxLongEdge?: number;
    videoBitsPerSecond?: number;
    onProgress?: CompressProgress;
    sourceBlob?: Blob;
  },
): Promise<MediaAsset> {
  if (Platform.OS !== 'web' || typeof document === 'undefined') return asset;

  let sourceBlob: Blob | undefined = opts?.sourceBlob ?? asset.webBlob;
  if (!sourceBlob) {
    const res = await fetch(asset.uri);
    if (!res.ok) throw new Error('Could not read video file');
    sourceBlob = await res.blob();
  }
  if (!sourceBlob || sourceBlob.size <= 0) {
    throw new Error('Could not read video file — pick the clip again from your library.');
  }

  if (!webVideoNeedsReencode(asset, sourceBlob.size)) {
    return asset.webBlob ? asset : { ...asset, webBlob: sourceBlob };
  }

  const outBlob = await playAndRecordScaled(
    sourceBlob,
    opts?.maxLongEdge ?? DEFAULT_MAX_LONG_EDGE,
    opts?.videoBitsPerSecond ?? DEFAULT_VIDEO_BPS,
    opts?.onProgress,
  );

  const recorderMime = outBlob.type || 'video/webm';
  const outMime = outputMimeFromRecorder(recorderMime);
  const ext = outputExtFromRecorder(recorderMime);
  const outUri = URL.createObjectURL(outBlob);

  const long = Math.max(asset.width ?? 0, asset.height ?? 0);
  const maxLongEdge = opts?.maxLongEdge ?? DEFAULT_MAX_LONG_EDGE;
  const scale = long > maxLongEdge && long > 0 ? maxLongEdge / long : 1;

  return {
    ...asset,
    uri: outUri,
    webBlob: outBlob,
    mimeType: outMime,
    fileName: `${Date.now()}.${ext}`,
    width: asset.width ? Math.max(2, Math.round(asset.width * scale)) : undefined,
    height: asset.height ? Math.max(2, Math.round(asset.height * scale)) : undefined,
  };
}
