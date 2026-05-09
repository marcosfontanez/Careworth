import { useRouter, type Href } from 'expo-router';
import { View, StyleSheet, ActivityIndicator } from 'react-native';
import { useEffect, useMemo } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { needsLegalAcknowledgment } from '@/lib/legalAck';
import { rootIndexRedirectIfNeeded, resetRootIndexRedirectDedupe } from '@/lib/rootIndexRedirect';
import { colors } from '@/theme';

function routeHref(
  isLoading: boolean,
  isAuthenticated: boolean,
  profile: ReturnType<typeof useAuth>['profile'],
): Href | null {
  if (isLoading) return null;
  if (!isAuthenticated) return '/auth/login';
  if (needsLegalAcknowledgment(profile)) return '/auth/legal-ack';
  return '/(tabs)/feed';
}

export default function Index() {
  const { isAuthenticated, isLoading, profile } = useAuth();
  const router = useRouter();

  /** Primitives only — `profile` object identity changes with any `AuthProvider` render. */
  const routeKey = useMemo(
    () =>
      [
        isLoading,
        isAuthenticated,
        profile?.id ?? '',
        profile?.termsPrivacyAcceptedAt ?? '',
      ].join('\0'),
    [isLoading, isAuthenticated, profile?.id, profile?.termsPrivacyAcceptedAt],
  );

  /**
   * Avoid `<Redirect />` here: it runs `replace` inside `useFocusEffect`, which can
   * recurse with tab/stack focus churn and hit "Maximum update depth exceeded".
   */
  useEffect(() => {
    if (!isAuthenticated) resetRootIndexRedirectDedupe();
    const next = routeHref(isLoading, isAuthenticated, profile);
    if (next == null) return;
    rootIndexRedirectIfNeeded(router, next);
  }, [routeKey, isLoading, isAuthenticated, router, profile]);

  /**
   * Matches root background. After login, `isLoading` stays true until the profile bundle returns
   * — if that hangs, a bare view reads as a “black screen”; show a minimal spinner when we
   * know the user is signed in.
   */
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
});
