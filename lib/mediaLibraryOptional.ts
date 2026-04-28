/**
 * expo-media-library is not in every runtime (e.g. Expo Go without the native module).
 *
 * Do NOT `require('expo-media-library')` when native code is missing: its entry file
 * eagerly imports ExpoMediaLibrary.js, which calls `requireNativeModule` at load time
 * and throws — that can bypass a surrounding try/catch in some bundler setups and
 * still trips LogBox. Probe the native module first, then load the JS package only
 * when it exists.
 */
import { requireOptionalNativeModule } from 'expo-modules-core';

type ExpoMediaLibrary = typeof import('expo-media-library');

let cached: ExpoMediaLibrary | null | undefined;

const EXPO_MEDIA_LIBRARY_NATIVE = 'ExpoMediaLibrary';

export function getExpoMediaLibrary(): ExpoMediaLibrary | null {
  if (cached !== undefined) return cached;

  if (!requireOptionalNativeModule(EXPO_MEDIA_LIBRARY_NATIVE)) {
    if (__DEV__) {
      console.warn(
        '[PulseVerse] expo-media-library native module missing — save to Photos needs a dev build with this plugin; use Share to save the file.',
      );
    }
    cached = null;
    return null;
  }

  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    cached = require('expo-media-library') as ExpoMediaLibrary;
  } catch {
    cached = null;
  }
  return cached;
}
