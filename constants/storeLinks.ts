import Constants from 'expo-constants';
import { Platform } from 'react-native';

type Extra = {
  storeIosUrl?: string;
  storeAndroidUrl?: string;
};

function extra(): Extra {
  return (Constants.expoConfig?.extra ?? {}) as Extra;
}

/** App Store / Play Store URLs — set `extra.storeIosUrl` / `extra.storeAndroidUrl` in app.json when listings exist. */
export function getStoreUrlForPlatform(): string {
  const e = extra();
  if (Platform.OS === 'ios') {
    return (
      e.storeIosUrl?.trim() ||
      'https://apps.apple.com/search?term=PulseVerse'
    );
  }
  return (
    e.storeAndroidUrl?.trim() ||
    'https://play.google.com/store/apps/details?id=com.pulseverse.app'
  );
}
