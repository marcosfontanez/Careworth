import { useRouter, type Href } from 'expo-router';
import { View, StyleSheet } from 'react-native';
import { useEffect, useMemo, useRef } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { needsProfileOnboarding } from '@/lib/profileOnboarding';
import { needsLegalAcknowledgment } from '@/lib/legalAck';
import { colors } from '@/theme';

function routeHref(
  isLoading: boolean,
  isAuthenticated: boolean,
  profile: ReturnType<typeof useAuth>['profile'],
): Href | null {
  if (isLoading) return null;
  if (!isAuthenticated) return '/auth/login';
  if (needsLegalAcknowledgment(profile)) return '/auth/legal-ack';
  if (needsProfileOnboarding(profile)) return '/onboarding';
  return '/(tabs)/feed';
}

export default function Index() {
  const { isAuthenticated, isLoading, profile } = useAuth();
  const router = useRouter();
  const lastTarget = useRef<Href | null>(null);

  /** Primitives only — `profile` object identity changes with any `AuthProvider` render. */
  const routeKey = useMemo(
    () =>
      [
        isLoading,
        isAuthenticated,
        profile?.id ?? '',
        profile?.termsPrivacyAcceptedAt ?? '',
        profile?.city ?? '',
        profile?.state ?? '',
        profile?.role ?? '',
        profile?.specialty ?? '',
      ].join('\0'),
    [
      isLoading,
      isAuthenticated,
      profile?.id,
      profile?.termsPrivacyAcceptedAt,
      profile?.city,
      profile?.state,
      profile?.role,
      profile?.specialty,
    ],
  );

  /**
   * Avoid `<Redirect />` here: it runs `replace` inside `useFocusEffect`, which can
   * recurse with tab/stack focus churn and hit "Maximum update depth exceeded".
   */
  useEffect(() => {
    const next = routeHref(isLoading, isAuthenticated, profile);
    if (next == null) return;
    if (lastTarget.current === next) return;
    lastTarget.current = next;
    router.replace(next);
  }, [routeKey, isLoading, isAuthenticated, profile, router]);

  /** Blank shell only — matches root background so splash → first route is instant with no spinner jank. */
  return <View style={styles.loading} />;
}

const styles = StyleSheet.create({
  loading: {
    flex: 1,
    backgroundColor: colors.dark.bg,
  },
});
