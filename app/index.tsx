import { useRouter, type Href } from 'expo-router';
import { View, StyleSheet, ActivityIndicator, Text, TouchableOpacity } from 'react-native';
import { useEffect, useMemo } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { resolveAccountEntryGate } from '@/lib/accountGate';
import { rootIndexRedirectIfNeeded, resetRootIndexRedirectDedupe } from '@/lib/rootIndexRedirect';
import { colors, spacing } from '@/theme';

function routeHref(gate: ReturnType<typeof resolveAccountEntryGate>): Href | null {
  switch (gate) {
    case 'loading':
      return null;
    case 'guest':
      return '/auth/login';
    case 'profile_unavailable':
      return null;
    case 'needs_legal_ack':
      return '/auth/legal-ack';
    case 'ready':
      return '/(tabs)/feed';
    default:
      return '/(tabs)/feed';
  }
}

export default function Index() {
  const { isAuthenticated, isLoading, profile, refreshProfile } = useAuth();
  const router = useRouter();

  const gate = useMemo(
    () =>
      resolveAccountEntryGate({
        isLoading,
        isAuthenticated,
        profile,
      }),
    [isLoading, isAuthenticated, profile],
  );

  const routeKey = useMemo(
    () =>
      [
        gate,
        isLoading,
        isAuthenticated,
        profile?.id ?? '',
        profile?.termsPrivacyAcceptedAt ?? '',
      ].join('\0'),
    [gate, isLoading, isAuthenticated, profile?.id, profile?.termsPrivacyAcceptedAt],
  );

  useEffect(() => {
    if (!isAuthenticated) resetRootIndexRedirectDedupe();
    const next = routeHref(gate);
    if (next == null) return;
    rootIndexRedirectIfNeeded(router, next);
  }, [routeKey, gate, router]);

  if (gate === 'profile_unavailable') {
    return (
      <View style={styles.blocked}>
        <Text style={styles.blockedTitle}>Could not load your profile</Text>
        <Text style={styles.blockedSub}>
          Your account is signed in, but we could not verify your profile or legal acknowledgment yet.
          Check your connection and try again.
        </Text>
        <TouchableOpacity style={styles.retryBtn} onPress={() => void refreshProfile()} activeOpacity={0.85}>
          <Text style={styles.retryBtnText}>Retry</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={styles.loading}>
      {isAuthenticated && isLoading ? (
        <ActivityIndicator size="large" color={colors.primary.teal} style={styles.spinner} />
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  loading: {
    flex: 1,
    backgroundColor: colors.dark.bg,
    justifyContent: 'center',
    alignItems: 'center',
  },
  spinner: { marginTop: 8 },
  blocked: {
    flex: 1,
    backgroundColor: colors.dark.bg,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: spacing.xl,
  },
  blockedTitle: {
    fontSize: 20,
    fontWeight: '800',
    color: colors.dark.text,
    textAlign: 'center',
    marginBottom: spacing.sm,
  },
  blockedSub: {
    fontSize: 14,
    lineHeight: 20,
    color: colors.dark.textSecondary,
    textAlign: 'center',
    marginBottom: spacing.lg,
  },
  retryBtn: {
    paddingVertical: 14,
    paddingHorizontal: 28,
    borderRadius: 14,
    backgroundColor: colors.primary.teal + '22',
    borderWidth: 1,
    borderColor: colors.primary.teal + '55',
  },
  retryBtnText: { color: colors.primary.teal, fontWeight: '700', fontSize: 15 },
});
