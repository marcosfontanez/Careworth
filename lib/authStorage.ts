import AsyncStorage from '@react-native-async-storage/async-storage';
import * as SecureStore from 'expo-secure-store';
import { Platform } from 'react-native';

/**
 * Persists Supabase auth session. AsyncStorage avoids iOS SecureStore’s ~2KB per-key limit
 * (large JWT + user metadata can exceed that). Slightly less hardened than Keychain; acceptable for typical apps.
 *
 * On first read after upgrade, migrates a legacy SecureStore value into AsyncStorage when present.
 */
export const supabaseAuthStorage = {
  getItem: async (key: string): Promise<string | null> => {
    if (Platform.OS === 'web') {
      try {
        return localStorage.getItem(key);
      } catch {
        return null;
      }
    }

    const next = await AsyncStorage.getItem(key);
    if (next != null) return next;

    try {
      const legacy = await SecureStore.getItemAsync(key);
      if (legacy != null) {
        await AsyncStorage.setItem(key, legacy);
        await SecureStore.deleteItemAsync(key).catch(() => {});
      }
      return legacy;
    } catch {
      return null;
    }
  },
  setItem: (key: string, value: string): Promise<void> => {
    if (Platform.OS === 'web') {
      try {
        localStorage.setItem(key, value);
      } catch {}
      return Promise.resolve();
    }
    return AsyncStorage.setItem(key, value);
  },
  removeItem: async (key: string): Promise<void> => {
    if (Platform.OS === 'web') {
      try {
        localStorage.removeItem(key);
      } catch {}
      return;
    }
    await AsyncStorage.removeItem(key);
    await SecureStore.deleteItemAsync(key).catch(() => {});
  },
};
