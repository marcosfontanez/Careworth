import { Platform, Share } from 'react-native';

/**
 * Copy text to clipboard when the native Expo clipboard module is linked; otherwise web clipboard or system share.
 * Avoids a static `expo-clipboard` import so the app does not crash on load if ExpoClipboard native code is missing (e.g. old dev client).
 */
export async function copyTextWithFallback(text: string): Promise<void> {
  try {
    const { setStringAsync } = await import('expo-clipboard');
    await setStringAsync(text);
    return;
  } catch {
    /* native module missing — continue */
  }

  if (Platform.OS === 'web') {
    const nav = typeof globalThis !== 'undefined' ? globalThis.navigator : undefined;
    if (nav?.clipboard?.writeText) {
      await nav.clipboard.writeText(text);
      return;
    }
  }

  try {
    if (Platform.OS === 'ios') {
      await Share.share({ url: text });
    } else {
      await Share.share({ message: text });
    }
  } catch {
    /* user dismissed share sheet */
  }
}
