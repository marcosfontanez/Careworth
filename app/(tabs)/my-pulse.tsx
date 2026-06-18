import React, { useCallback, useEffect, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, InteractionManager, Alert } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { useQueryClient } from '@tanstack/react-query';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { useAuth } from '@/contexts/AuthContext';
import { useAppStore } from '@/store/useAppStore';
import { profilesService } from '@/services/supabase/profiles';
import { blockUser } from '@/services/supabase/blocks';
import { profileBoardKeys } from '@/lib/queryKeys';
import { useToast } from '@/components/ui/Toast';
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
  const toast = useToast();
  const { profile: authProfile, user: authUser, isLoading: authLoading, applyProfilePatch, refreshProfile } = useAuth();
  const storeUser = useAppStore((s) => s.currentUser);

  const postsOwnerId = authUser?.id ?? '';
  /** Defer the heavy My Pulse tree until the tab transition finishes (avoids decoder + audio spikes mid-switch). */
  const [contentReady, setContentReady] = useState(false);
  /** True while the manual "Try again" retry is fetching the profile. */
  const [retrying, setRetrying] = useState(false);
  /** Profile fetched directly by this screen when the global auth hydrate failed/stalled. */
  const [localProfile, setLocalProfile] = useState<typeof authProfile>(null);
  /** True while the self-heal direct fetch is in flight. */
  const [localFetching, setLocalFetching] = useState(false);

  const handleRetryProfile = useCallback(async () => {
    setRetrying(true);
    try {
      await refreshProfile();
      // If the global hydrate is still struggling, grab the row directly so
      // the screen can recover without waiting on the heavy auth path.
      if (postsOwnerId) {
        const row = await profilesService.getById(postsOwnerId);
        if (row) setLocalProfile(row);
      }
    } finally {
      setRetrying(false);
    }
  }, [refreshProfile, postsOwnerId]);

  // Self-heal: when we have a session user but the global auth hydrate hasn't
  // produced a profile (it timed out / stalled), fetch the row directly. This
  // decouples My Pulse from the heavy, timeout-prone auth hydrate so the page
  // loads even when satellite queries or the avatar-frame embed are slow.
  useEffect(() => {
    if (!postsOwnerId) return;
    if (authProfile || storeUser || localProfile) return;
    if (localFetching) return;
    let cancelled = false;
    setLocalFetching(true);
    (async () => {
      try {
        const row = await profilesService.getById(postsOwnerId);
        if (!cancelled && row) setLocalProfile(row);
      } catch {
        /* getById already falls back internally; nothing more to do */
      } finally {
        if (!cancelled) setLocalFetching(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [postsOwnerId, authProfile, storeUser, localProfile, localFetching]);

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
        selectedPulseAvatarFrameId: row.selectedPulseAvatarFrameId,
        pulseAvatarFrame: row.pulseAvatarFrame,
        pulseStatusText: row.pulseStatusText,
        pulseStatusEmoji: row.pulseStatusEmoji,
        pulseStatusUpdatedAt: row.pulseStatusUpdatedAt,
        pulseBoardEnabled: row.pulseBoardEnabled,
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
      // Failsafe: `runAfterInteractions` can never fire on web if a looping
      // animation (e.g. the loading heart) keeps an interaction handle open.
      // Guarantee the gate flips so the screen can't get stuck on the spinner.
      const readyTimer = setTimeout(() => {
        if (!cancelled) setContentReady(true);
      }, 400);

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
          clearTimeout(readyTimer);
          setContentReady(false);
        };
      }

      return () => {
        cancelled = true;
        task.cancel?.();
        clearTimeout(readyTimer);
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

  const user = authProfile ?? storeUser ?? localProfile;

  if (!user) {
    // Auth is still hydrating the profile — show the spinner. But once hydrate
    // has finished (`authLoading === false`) with no profile, the fetch timed
    // out; surface a retry instead of an endless spinner. The self-heal direct
    // fetch (`localFetching`) is also treated as a loading state.
    if (authLoading || retrying || localFetching) {
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

  const handleBlockBoardUser = (blockedId: string) => {
    if (!authUser?.id) return;
    Alert.alert('Block visitor', 'Block this visitor from your Pulse Board?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Block',
        style: 'destructive',
        onPress: () => {
          void (async () => {
            try {
              await blockUser(authUser.id, blockedId);
              toast.show('Visitor blocked', 'success');
              await queryClient.invalidateQueries({
                queryKey: profileBoardKeys.forProfile(authUser.id),
              });
            } catch {
              toast.show('Could not block visitor', 'error');
            }
          })();
        },
      },
    ]);
  };

  return (
    <MyPageContent
      user={user}
      profileUpdates={profileUpdates}
      userPosts={userPosts}
      isOwner
      initialOpenPulseHistory={openPulseHistory === '1'}
      highlightShareTier={tierUp === '1'}
      onBlockBoardUser={handleBlockBoardUser}
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
