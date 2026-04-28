import { Platform } from 'react-native';
import type { MediaAsset } from '@/lib/media';

/**
 * Hard cap for both upload and re-encode. Any video whose long edge is
 * larger than this gets re-encoded down to fit.
 *
 * Target: 720p (1280×720 / 720×1280). Phone cameras default to 1080p or
 * higher at ~17 Mbps. For vertical short-form playing in a screen-width
 * cell on a 6" device, 720p is visually indistinguishable from 1080p but
 * delivers ~half the bytes — and Supabase Storage egress is our most
 * expensive scaling line item. (TikTok and Reels both deliver clips at
 * 720p as the default ladder rung for the same reason.)
 *
 * Older value: 1920 (full HD). Bumped down to 1280 in the perf pass to
 * cut storage + bandwidth ~50% with no perceivable quality loss on phone
 * playback.
 */
const MAX_LONG_EDGE = 1280;

/**
 * Encode bitrate ceiling in bps. 1.8 Mbps at 720p H.264 looks great for
 * the kind of motion typical of vertical short-form (people, cuts,
 * music videos). Older value: 5 Mbps — fine for archival but ~3× the
 * file size we actually need.
 *
 * Reference points:
 *   - YouTube Shorts target: ~2 Mbps @ 720p
 *   - TikTok delivery:       ~1.0–1.6 Mbps @ 720p
 *   - Instagram Reels:       ~1.5 Mbps @ 720p
 */
const TARGET_BITRATE_BPS = 1_800_000;

/**
 * Loaded lazily because react-native-compressor is a native module — calling
 * it in Expo Go would crash. We tolerate it being missing and fall back to a
 * pass-through, but a dev client / production build will always have it.
 */
function loadCompressor(): null | typeof import('react-native-compressor') {
  try {
    return require('react-native-compressor');
  } catch {
    return null;
  }
}

function ensureMp4Extension(name: string): string {
  const dot = name.lastIndexOf('.');
  const base = dot > 0 ? name.slice(0, dot) : name;
  return `${base}.mp4`;
}

function longEdge(asset: MediaAsset): number {
  return Math.max(asset.width ?? 0, asset.height ?? 0);
}

export type CompressProgress = (fraction: number) => void;

/**
 * Re-encodes a user-supplied video down to <=720p H.264 + AAC if it exceeds
 * our cap. Smaller / already-compliant clips are returned unchanged so we
 * don't waste device CPU on a no-op pass.
 *
 * Reasoning: phone cameras default to 1080p ~17 Mbps or 4K ~50 Mbps. Both
 * are wildly oversized for a vertical short-form clip rendered in a
 * single FlatList cell on a 6-inch screen. Capping at 720p / 1.8 Mbps:
 *   - cuts upload time roughly in half on cellular,
 *   - shrinks Supabase Storage egress (our largest scaling cost) ~50%,
 *   - keeps the FFmpeg export worker fast (re-encoding 720p source for
 *     the share-card slate is ~3× faster than 1080p).
 */
export async function compressVideoIfTooLarge(
  asset: MediaAsset,
  onProgress?: CompressProgress,
): Promise<MediaAsset> {
  if (asset.type !== 'video') return asset;
  const edge = longEdge(asset);
  if (edge > 0 && edge <= MAX_LONG_EDGE) {
    return asset; // already <=1080p — nothing to do
  }

  const mod = loadCompressor();
  if (!mod) {
    if (__DEV__) {
      console.warn(
        '[videoCompression] react-native-compressor not available — uploading source as-is. Build a dev client to enable the 720p cap.',
      );
    }
    return asset;
  }

  const { Video } = mod;
  try {
    const compressedUri = await Video.compress(
      asset.uri,
      {
        compressionMethod: 'manual',
        // The lib downscales preserving aspect ratio when maxSize is the long edge.
        maxSize: MAX_LONG_EDGE,
        bitrate: TARGET_BITRATE_BPS,
        minimumFileSizeForCompress: 0,
      },
      (progress) => {
        if (onProgress && typeof progress === 'number') {
          onProgress(Math.max(0, Math.min(1, progress)));
        }
      },
    );

    if (!compressedUri) return asset;

    return {
      ...asset,
      uri: compressedUri,
      mimeType: 'video/mp4',
      fileName: ensureMp4Extension(asset.fileName ?? `${Date.now()}.mp4`),
      // Width/height after compression aren't reported back by the lib; keep the
      // original metadata so callers that read width/height still see the source
      // aspect ratio. The on-disk dimensions are now <=1080p.
    };
  } catch (e) {
    if (__DEV__) {
      console.warn('[videoCompression] compression failed, falling back to source:', e);
    }
    return asset;
  }
}

export const VIDEO_UPLOAD_MAX_LONG_EDGE = MAX_LONG_EDGE;
export const VIDEO_UPLOAD_PLATFORM = Platform.OS;
