import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Alert,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
} from 'react-native';
import * as Linking from 'expo-linking';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { supabase } from '@/lib/supabase';
import {
  establishRecoverySessionFromUrl,
  type RecoverySessionErrorCode,
} from '@/lib/authRecovery';
import { colors, iconSize, spacing } from '@/theme';
import { AccentComposerFrame } from '@/components/ui/AccentComposerFrame';

type SessionPhase =
  | { status: 'loading' }
  | { status: 'ready' }
  | { status: 'error'; code: RecoverySessionErrorCode; message: string };

function buildRecoveryUrlFromParams(
  params: Record<string, string | string[] | undefined>,
  initialUrl: string | null,
): string | null {
  if (initialUrl?.includes('reset-password')) return initialUrl;

  const entries = Object.entries(params).filter(
    ([k, v]) => typeof v === 'string' && v.length > 0 && !k.startsWith('_'),
  ) as [string, string][];
  if (entries.length === 0) return null;
  const qs = new URLSearchParams(entries).toString();
  return `pulseverse://auth/reset-password?${qs}`;
}

function errorTitle(code: RecoverySessionErrorCode): string {
  switch (code) {
    case 'expired':
      return 'Link expired';
    case 'missing_token':
      return 'Invalid reset link';
    case 'invalid':
      return 'Invalid reset link';
    default:
      return 'Could not reset password';
  }
}

export default function ResetPasswordScreen() {
  const router = useRouter();
  const params = useLocalSearchParams();
  const insets = useSafeAreaInsets();
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [sessionPhase, setSessionPhase] = useState<SessionPhase>({ status: 'loading' });

  useEffect(() => {
    let cancelled = false;

    async function ingestRecoveryLink(url: string | null) {
      const tryUrl = buildRecoveryUrlFromParams(params, url);
      if (!tryUrl) {
        const {
          data: { session },
        } = await supabase.auth.getSession();
        if (cancelled) return;
        if (session?.user) {
          setSessionPhase({ status: 'ready' });
          return;
        }
        setSessionPhase({
          status: 'error',
          code: 'missing_token',
          message: 'Open the password reset link from your email on this device, then try again.',
        });
        return;
      }

      const result = await establishRecoverySessionFromUrl(tryUrl);
      if (cancelled) return;
      if (result.ok) {
        setSessionPhase({ status: 'ready' });
      } else {
        setSessionPhase({
          status: 'error',
          code: result.code,
          message: result.message,
        });
      }
    }

    void Linking.getInitialURL().then((initial) => {
      if (!cancelled) void ingestRecoveryLink(initial);
    });

    const sub = Linking.addEventListener('url', ({ url }) => {
      if (url.includes('reset-password')) {
        void ingestRecoveryLink(url);
      }
    });

    return () => {
      cancelled = true;
      sub.remove();
    };
  }, [params]);

  const handleReset = async () => {
    if (sessionPhase.status !== 'ready') return;

    if (password.length < 8) {
      Alert.alert('Too short', 'Password must be at least 8 characters.');
      return;
    }
    if (password !== confirmPassword) {
      Alert.alert('Mismatch', 'Passwords do not match.');
      return;
    }

    setLoading(true);
    try {
      const { error } = await supabase.auth.updateUser({ password });
      if (error) {
        Alert.alert('Error', error.message);
      } else {
        await supabase.auth.signOut({ scope: 'local' });
        Alert.alert('Success', 'Your password has been updated. Sign in with your new password.', [
          { text: 'OK', onPress: () => router.replace('/auth/login') },
        ]);
      }
    } catch (e: unknown) {
      const message = e instanceof Error ? e.message : 'Something went wrong.';
      Alert.alert('Error', message);
    } finally {
      setLoading(false);
    }
  };

  if (sessionPhase.status === 'loading') {
    return (
      <LinearGradient colors={[colors.dark.bg, '#0A1628']} style={styles.gradient}>
        <View style={[styles.centered, { paddingTop: insets.top + 40 }]}>
          <ActivityIndicator size="large" color={colors.primary.teal} />
          <Text style={styles.loadingText}>Verifying reset link…</Text>
        </View>
      </LinearGradient>
    );
  }

  if (sessionPhase.status === 'error') {
    return (
      <LinearGradient colors={[colors.dark.bg, '#0A1628']} style={styles.gradient}>
        <View style={[styles.centered, { paddingTop: insets.top + 40, paddingHorizontal: 28 }]}>
          <Ionicons name="alert-circle-outline" size={56} color={colors.status.error} />
          <Text style={styles.title}>{errorTitle(sessionPhase.code)}</Text>
          <Text style={styles.subtitle}>{sessionPhase.message}</Text>
          <TouchableOpacity
            style={styles.secondaryBtn}
            onPress={() => router.replace('/auth/forgot-password')}
            activeOpacity={0.8}
          >
            <Text style={styles.secondaryBtnText}>Request a new link</Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={() => router.replace('/auth/login')} style={styles.textLink}>
            <Text style={styles.textLinkLabel}>Back to sign in</Text>
          </TouchableOpacity>
        </View>
      </LinearGradient>
    );
  }

  return (
    <LinearGradient colors={[colors.dark.bg, '#0A1628']} style={styles.gradient}>
      <KeyboardAvoidingView
        style={[styles.container, { paddingTop: insets.top + 20 }]}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn} activeOpacity={0.7}>
          <Ionicons name="arrow-back" size={24} color={colors.dark.text} />
        </TouchableOpacity>

        <View style={styles.iconWrap}>
          <Ionicons name="lock-closed" size={40} color={colors.primary.teal} />
        </View>

        <Text style={styles.title}>Set New Password</Text>
        <Text style={styles.subtitle}>
          Enter your new password below. Must be at least 8 characters.
        </Text>

        <View style={styles.inputGroup}>
          <AccentComposerFrame accentColor={colors.primary.teal} hint="New password" compact noShadow>
            <View style={styles.fieldRow}>
              <Ionicons name="lock-closed-outline" size={iconSize.md} color={colors.primary.teal} />
              <TextInput
                style={styles.input}
                placeholder="New password"
                placeholderTextColor={colors.dark.textMuted}
                secureTextEntry={!showPassword}
                value={password}
                onChangeText={setPassword}
                autoCapitalize="none"
                editable={!loading}
              />
              <TouchableOpacity onPress={() => setShowPassword(!showPassword)} hitSlop={12}>
                <Ionicons
                  name={showPassword ? 'eye-off-outline' : 'eye-outline'}
                  size={22}
                  color={colors.primary.teal}
                />
              </TouchableOpacity>
            </View>
          </AccentComposerFrame>

          <AccentComposerFrame
            accentColor={colors.primary.teal}
            hint="Confirm password"
            compact
            noShadow
            style={{ marginTop: spacing.sm }}
          >
            <View style={styles.fieldRow}>
              <Ionicons name="lock-closed-outline" size={iconSize.md} color={colors.primary.teal} />
              <TextInput
                style={styles.input}
                placeholder="Confirm password"
                placeholderTextColor={colors.dark.textMuted}
                secureTextEntry={!showPassword}
                value={confirmPassword}
                onChangeText={setConfirmPassword}
                autoCapitalize="none"
                editable={!loading}
              />
            </View>
          </AccentComposerFrame>
        </View>

        <TouchableOpacity
          style={[styles.btn, loading && styles.btnDisabled]}
          onPress={handleReset}
          disabled={loading}
          activeOpacity={0.8}
        >
          <LinearGradient
            colors={[colors.primary.teal, colors.primary.royal]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={styles.btnGradient}
          >
            <Text style={styles.btnText}>{loading ? 'Updating...' : 'Update Password'}</Text>
          </LinearGradient>
        </TouchableOpacity>
      </KeyboardAvoidingView>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  gradient: { flex: 1 },
  container: { flex: 1, paddingHorizontal: 24 },
  centered: { flex: 1, alignItems: 'center' },
  loadingText: { marginTop: 16, fontSize: 15, color: colors.dark.textSecondary },
  backBtn: { marginBottom: 24 },
  iconWrap: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: colors.primary.teal + '15',
    alignItems: 'center',
    justifyContent: 'center',
    alignSelf: 'center',
    marginBottom: 20,
  },
  title: {
    fontSize: 26,
    fontWeight: '800',
    color: colors.dark.text,
    textAlign: 'center',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 14,
    color: colors.dark.textSecondary,
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: 32,
    paddingHorizontal: 16,
  },
  inputGroup: { marginBottom: 28 },
  fieldRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm + 2,
  },
  input: { flex: 1, fontSize: 15, color: colors.dark.text, paddingVertical: 4 },
  btn: { borderRadius: 14, overflow: 'hidden' },
  btnDisabled: { opacity: 0.6 },
  btnGradient: { paddingVertical: 16, alignItems: 'center' },
  btnText: { fontSize: 16, fontWeight: '700', color: colors.dark.text },
  secondaryBtn: {
    marginTop: 24,
    paddingVertical: 14,
    paddingHorizontal: 24,
    borderRadius: 14,
    backgroundColor: colors.primary.teal + '22',
    borderWidth: 1,
    borderColor: colors.primary.teal + '55',
  },
  secondaryBtnText: { color: colors.primary.teal, fontWeight: '700', fontSize: 15 },
  textLink: { marginTop: 18 },
  textLinkLabel: { color: colors.dark.textSecondary, fontSize: 14 },
});
