import { Platform } from 'react-native';

/**
 * Re-encode images through expo-image-manipulator so a fresh JPEG is written
 * without preserved EXIF / GPS. Used for anonymous posts and privacy-sensitive uploads.
 *
 * - **Web:** no native module — returns the original `uri` (strip in a server pipeline if needed).
 * - **iOS/Android:** if the dev client / binary was built before `expo-image-manipulator` was
 *   added, the native module is missing until you run `npx expo run:ios` / `run:android` or a
 *   new EAS dev build — we fall back to `uri` so the app does not fatally crash.
 */
export async function stripImageMetadata(uri: string, quality = 0.92): Promise<string> {
  if (Platform.OS === 'web') return uri;
  try {
    const ImageManipulator = await import('expo-image-manipulator');
    const out = await ImageManipulator.manipulateAsync(uri, [], {
      compress: quality,
      format: ImageManipulator.SaveFormat.JPEG,
    });
    return out.uri;
  } catch {
    if (__DEV__) {
      console.warn(
        '[imagePrivacy] expo-image-manipulator unavailable — returning original uri. Rebuild the native app (expo run / EAS dev build).',
      );
    }
    return uri;
  }
}

export async function stripManyIfAnonymous(
  uris: string[],
  isAnonymous: boolean,
): Promise<string[]> {
  if (!isAnonymous || uris.length === 0) return uris;
  const next: string[] = [];
  for (const u of uris) {
    try {
      next.push(await stripImageMetadata(u));
    } catch {
      next.push(u);
    }
  }
  return next;
}
