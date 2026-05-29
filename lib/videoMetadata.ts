import { isReactNativeCompressorLinked } from '@/lib/compressorAvailability';

/**
 * Best-effort duration / dimensions for a local video file (dev client has
 * `react-native-compressor`; Expo Go falls back to empty).
 */
export async function probeVideoFile(uri: string): Promise<{
  duration?: number;
  width?: number;
  height?: number;
}> {
  try {
    if (!isReactNativeCompressorLinked()) return {};
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const { getVideoMetaData } = require('react-native-compressor') as {
      getVideoMetaData: (path: string) => Promise<{ duration: number; width: number; height: number }>;
    };
    const m = await getVideoMetaData(uri);
    const d = m.duration;
    const durationSec = d > 2000 ? d / 1000 : d;
    return { duration: durationSec, width: m.width, height: m.height };
  } catch {
    return {};
  }
}

/**
 * Video poster / cover image. Pass `atSec` to grab a specific frame
 * (used by the Thumbnail Studio scrubber). Returns local file URI.
 *
 * Strategy:
 *  1. `expo-video-thumbnails` — Expo SDK module that ships in Expo Go AND
 *     dev-client builds. Works out of the box on both iOS and Android with
 *     no autolinked native dep. Tried first so previews work in Expo Go.
 *  2. `react-native-compressor.createVideoThumbnail` — fallback for the
 *     dev-client / store build path. Used when the Expo Thumbnails module
 *     ever rejects a specific codec or returns nothing usable.
 *  3. `null` — composer renders a play-icon placeholder. Upload still
 *     succeeds; the server-side `enqueue-creator-media-job` worker generates
 *     a poster for the feed card from the uploaded file.
 */
export async function makeVideoThumbnail(
  uri: string,
  atSec?: number,
): Promise<string | null> {
  const timeMs =
    typeof atSec === 'number' && Number.isFinite(atSec) && atSec >= 0
      ? Math.max(0, atSec * 1000)
      : 0;

  /** 1. expo-video-thumbnails (Expo Go + dev client). */
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const Thumbs = require('expo-video-thumbnails') as {
      getThumbnailAsync: (
        path: string,
        opts?: { time?: number; quality?: number },
      ) => Promise<{ uri: string }>;
    };
    if (Thumbs && typeof Thumbs.getThumbnailAsync === 'function') {
      const { uri: thumbUri } = await Thumbs.getThumbnailAsync(uri, {
        time: timeMs,
        quality: 0.8,
      });
      if (thumbUri) {
        return thumbUri.startsWith('file://') ? thumbUri : `file://${thumbUri}`;
      }
    }
  } catch (e) {
    if (__DEV__) console.warn('[makeVideoThumbnail] expo-video-thumbnails failed', e);
  }

  /** 2. react-native-compressor fallback (dev client / store build only). */
  try {
    if (!isReactNativeCompressorLinked()) return null;
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const compressor = require('react-native-compressor') as {
      createVideoThumbnail: (
        path: string,
        opts?: { time?: number; quality?: number },
      ) => Promise<{ path: string }>;
    };
    const opts = timeMs > 0 ? { time: timeMs, quality: 0.8 } : undefined;
    const { path } = await compressor.createVideoThumbnail(uri, opts);
    return path.startsWith('file://') ? path : `file://${path}`;
  } catch {
    return null;
  }
}
