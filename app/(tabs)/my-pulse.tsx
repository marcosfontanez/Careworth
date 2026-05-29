import React, { useCallback, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, InteractionManager } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { useQueryClient } from '@tanstack/react-query';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { useAuth } from '@/contexts/AuthContext';
import { useAppStore } from '@/store/useAppStore';
import { profilesService } from '@/services/supabase/profiles';
import { useUserPosts, useProfileUpdates } from '@/hooks/useQueries';
import { MyPageContent } from '@/components/mypage/MyPageContent';
import { LoadingState } from '@/components/ui/LoadingState';
import { PVPageBackground } from '@/components/pv/PVPageBackground';
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
  const { profile: authProfile, user: authUser, isLoading: authLoading, applyProfilePatch, refreshProfile } = useAuth();
  const storeUser = useAppStore((s) => s.currentUser);

  const postsOwnerId = authUser?.id ?? '';
  /** Defer the heavy My Pulse tree until the tab transition finishes (avoids decoder + audio spikes mid-switch). */
  const [contentReady, setContentReady] = useState(false);
  /** True while the manual "Try again" retry is fetching the profile. */
  const [retrying, setRetrying] = useState(false);

  const handleRetryProfile = useCallback(async () => {
    setRetrying(true);
    try {
      await refreshProfile();
    } finally {
      setRetrying(false);
    }
  }, [refreshProfile]);

  const refreshStatsOnFocus = useCallback(async () => {
    if (!postsOwnerId) return;
    try {
      /** One profiles row — not the full auth hydrate (badges, follows×2000, saved×2000). */
      const row = await profilesService.getById(postsOwnerId);
      if (!row) return;
      applyProfilePatch({
        followerCount: row.followerCount,
        followingCount: row.followingCount,
        likeCount: row.likeCount,
        postCount: row.postCount,
        pulseScoreCurrent: row.pulseScoreCurrent,
        pulseTier: row.pulseTier,
        profileShareCount: row.profileShareCount,
      });
    } catch {
      /* non-fatal — stat strip keeps last cached values */
    }
  }, [postsOwnerId, applyProfilePatch]);

  useFocusEffect(
    useCallback(() => {
      let cancelled = false;
      const task = InteractionManager.runAfterInteractions(() => {
        if (!cancelled) setContentReady(true);
      });

      if (postsOwnerId) {
        const refreshTask = InteractionManager.runAfterInteractions(() => {
          if (cancelled) return;
          void queryClient.invalidateQueries({ queryKey: ['userPosts', postsOwnerId] });
          void refreshStatsOnFocus();
        });
        return () => {
          cancelled = true;
          task.cancel?.();
          refreshTask.cancel?.();
          setContentReady(false);
        };
      }

      return () => {
        cancelled = true;
        task.cancel?.();
        setContentReady(false);
      };
    }, [postsOwnerId, queryClient, refreshStatsOnFocus]),
  );

  const { data: userPosts } = useUserPosts(postsOwnerId);
  const { data: profileUpdates = [] } = useProfileUpdates(postsOwnerId);

  if (!authUser) {
    return (
      <PVPageBackground style={{ flex: 1 }}>
        <View style={gateStyles.wrap}>
          <Text style={gateStyles.title}>Sign in to view My Pulse</Text>
          <Text style={gateStyles.sub}>Your profile, My Pulse updates, and uploads sync after you log in.</Text>
          <TouchableOpacity style={gateStyles.btn} onPress={() => router.push('/auth/login')} activeOpacity={0.85}>
            <Text style={gateStyles.btnText}>Go to sign in</Text>
          </TouchableOpacity>
        </View>
      </PVPageBackground>
    );
  }

  const user = authProfile ?? storeUser;

  if (!user) {
    // Auth is still hydrating the profile — show the spinner. But once hydrate
    // has finished (`authLoading === false`) with no profile, the fetch timed
    // out; surface a retry instead of an endless spinner.
    if (authLoading || retrying) {
      return <LoadingState />;
    }
    return (
      <PVPageBackground style={{ flex: 1 }}>
        <View style={gateStyles.wrap}>
          <Text style={gateStyles.title}>Couldn’t load your profile</Text>
          <Text style={gateStyles.sub}>
            Your profile took too long to load (slow or dropped connection). Your data is safe — tap below to try again.
          </Text>
          <TouchableOpacity
            style={gateStyles.btn}
            onPress={handleRetryProfile}
            activeOpacity={0.85}
            accessibilityRole="button"
            accessibilityLabel="Retry loading your profile"
          >
            <Text style={gateStyles.btnText}>Try again</Text>
          </TouchableOpacity>
        </View>
      </PVPageBackground>
    );
  }

  if (!contentReady) {
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
