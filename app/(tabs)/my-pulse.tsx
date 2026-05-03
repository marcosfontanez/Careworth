import React, { useCallback } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { useQueryClient } from '@tanstack/react-query';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { useAuth } from '@/contexts/AuthContext';
import { useAppStore } from '@/store/useAppStore';
import { useUserPosts, useProfileUpdates } from '@/hooks/useQueries';
import { MyPageContent } from '@/components/mypage/MyPageContent';
import { LoadingState } from '@/components/ui/LoadingState';
import { colors, typography, spacing, borderRadius, shadows } from '@/theme';

/**
 * Tab entry for My Pulse — thin wrapper around {@link MyPageContent}.
 * All layout lives in `components/mypage/MyPageContent.tsx` (not legacy profile/[id]).
 */
export default function MyPulseTabScreen() {
  const router = useRouter();
  const { openPulseHistory, tierUp } = useLocalSearchParams<{
    openPulseHistory?: string;
    tierUp?: string;
  }>();
  const queryClient = useQueryClient();
  const { profile: authProfile, user: authUser, refreshProfile } = useAuth();
  const storeUser = useAppStore((s) => s.currentUser);

  const postsOwnerId = authUser?.id ?? '';

  useFocusEffect(
    useCallback(() => {
      if (!postsOwnerId) return;
      void queryClient.invalidateQueries({ queryKey: ['userPosts', postsOwnerId] });
      /** Follower / following tallies on the stat strip come from `profiles`; refresh on tab focus. */
      void refreshProfile();
    }, [postsOwnerId, queryClient, refreshProfile]),
  );

  const { data: userPosts } = useUserPosts(postsOwnerId);
  const { data: profileUpdates = [] } = useProfileUpdates(postsOwnerId);

  if (!authUser) {
    return (
      <View style={gateStyles.wrap}>
        <Text style={gateStyles.title}>Sign in to view My Pulse</Text>
        <Text style={gateStyles.sub}>Your profile, My Pulse updates, and uploads sync after you log in.</Text>
        <TouchableOpacity style={gateStyles.btn} onPress={() => router.push('/auth/login')} activeOpacity={0.85}>
          <Text style={gateStyles.btnText}>Go to sign in</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const user = authProfile ?? storeUser;
  if (!user) {
    return <LoadingState />;
  }

  return (
    <MyPageContent
      user={user}
      profileUpdates={profileUpdates}
      userPosts={userPosts}
      isOwner
      initialOpenPulseHistory={openPulseHistory === '1'}
      highlightShareTier={tierUp === '1'}
    />
  );
}

const gateStyles = StyleSheet.create({
  wrap: {
    flex: 1,
    backgroundColor: colors.dark.bg,
    paddingHorizontal: spacing.xl,
    justifyContent: 'center',
    gap: spacing.md,
  },
  title: { ...typography.screenTitle, color: colors.dark.text },
  sub: { ...typography.body, color: colors.dark.textSecondary, lineHeight: 22, maxWidth: 320 },
  btn: {
    marginTop: spacing.sm,
    alignSelf: 'flex-start',
    backgroundColor: colors.primary.teal,
    paddingHorizontal: spacing.xl + 2,
    paddingVertical: spacing.md,
    borderRadius: borderRadius.button,
    ...shadows.cta,
  },
  btnText: { ...typography.button, color: colors.dark.text, fontWeight: '800', fontSize: 15 },
});
