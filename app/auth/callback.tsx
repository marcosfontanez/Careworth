import { useEffect } from 'react';
import { View, ActivityIndicator, StyleSheet } from 'react-native';
import * as Linking from 'expo-linking';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { completeSupabaseOAuthFromUrl, parseOAuthCallbackParams } from '@/lib/oauthNative';
import { colors } from '@/theme';

/**
 * Fallback when OAuth returns via deep link to `pulseverse://auth/callback` instead of
 * `WebBrowser.openAuthSessionAsync` (uncommon with current flow; keeps edge cases covered).
 */
export default function AuthCallbackScreen() {
  const router = useRouter();
  const params = useLocalSearchParams();

  useEffect(() => {
    let cancelled = false;

    async function handleCallback() {
      const initial = await Linking.getInitialURL();

      const buildFromRouterParams = (): string | null => {
        const entries = Object.entries(params).filter(
          ([k, v]) => typeof v === 'string' && v.length > 0 && !k.startsWith('_'),
        ) as [string, string][];
        if (entries.length === 0) return null;
        const qs = new URLSearchParams(entries).toString();
        return `pulseverse://auth/callback?${qs}`;
      };

      const tryUrl = initial?.includes('auth/callback') ? initial : buildFromRouterParams();

      if (!tryUrl) {
        router.replace('/');
        return;
      }

      const parsed = parseOAuthCallbackParams(tryUrl);
      if (!parsed.code && !parsed.access_token && !parsed.error) {
        router.replace('/');
        return;
      }

      const { error } = await completeSupabaseOAuthFromUrl(tryUrl);
      if (cancelled) return;

      if (error) {
        console.warn('[auth/callback]', error.message);
        router.replace('/auth/login');
        return;
      }

      router.replace('/');
    }

    handleCallback();
    return () => {
      cancelled = true;
    };
  }, [params, router]);

  return (
    <View style={styles.container}>
      <ActivityIndicator size="large" color={colors.primary.teal} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: colors.primary.navy,
  },
});
