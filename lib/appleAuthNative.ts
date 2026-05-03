import { Platform } from 'react-native';
import * as AppleAuthentication from 'expo-apple-authentication';
import { supabase } from '@/lib/supabase';
import { signInWithOAuthNative } from '@/lib/oauthNative';

/**
 * iOS: native Sign in with Apple → `signInWithIdToken` (bundle ID must be listed in
 * Supabase → Auth → Apple → Client IDs). No Apple OAuth secret required for this path.
 *
 * Android / other: Supabase OAuth in browser (requires Services ID + secret in dashboard).
 */
export async function signInWithAppleAdaptive(): Promise<{ error: Error | null }> {
  if (Platform.OS !== 'ios') {
    return signInWithOAuthNative('apple');
  }

  try {
    const available = await AppleAuthentication.isAvailableAsync();
    if (!available) {
      return { error: new Error('Sign in with Apple is not available on this device.') };
    }

    const credential = await AppleAuthentication.signInAsync({
      requestedScopes: [
        AppleAuthentication.AppleAuthenticationScope.FULL_NAME,
        AppleAuthentication.AppleAuthenticationScope.EMAIL,
      ],
    });

    if (!credential.identityToken) {
      return { error: new Error('Apple did not return an identity token.') };
    }

    const { error } = await supabase.auth.signInWithIdToken({
      provider: 'apple',
      token: credential.identityToken,
    });

    if (error) return { error: new Error(error.message) };

    if (credential.fullName && (credential.fullName.givenName || credential.fullName.familyName)) {
      const fullName = [
        credential.fullName.givenName,
        credential.fullName.middleName,
        credential.fullName.familyName,
      ]
        .filter(Boolean)
        .join(' ');

      await supabase.auth.updateUser({
        data: {
          full_name: fullName,
          given_name: credential.fullName.givenName ?? undefined,
          family_name: credential.fullName.familyName ?? undefined,
        },
      });
    }

    return { error: null };
  } catch (e: unknown) {
    const code = typeof e === 'object' && e !== null && 'code' in e ? String((e as { code?: string }).code) : '';
    if (code === 'ERR_REQUEST_CANCELED' || code === 'ERR_CANCELED') {
      return { error: null };
    }
    return { error: e instanceof Error ? e : new Error(String(e)) };
  }
}
