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
 */
export async function makeVideoThumbnail(
  uri: string,
  atSec?: number,
): Promise<string | null> {
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const compressor = require('react-native-compressor') as {
      createVideoThumbnail: (
        path: string,
        opts?: { time?: number; quality?: number },
      ) => Promise<{ path: string }>;
    };
    const opts =
      typeof atSec === 'number' && Number.isFinite(atSec) && atSec >= 0
        ? { time: Math.max(0, atSec * 1000), quality: 0.8 }
        : undefined;
    const { path } = await compressor.createVideoThumbnail(uri, opts);
    return path.startsWith('file://') ? path : `file://${path}`;
  } catch {
    return null;
  }
}
