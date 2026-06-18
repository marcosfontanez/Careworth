import React, { useState } from 'react';
import { Redirect, useLocalSearchParams, useRouter } from 'expo-router';
import { Alert, View } from 'react-native';
import { useQuery } from '@tanstack/react-query';
import { useAuth } from '@/contexts/AuthContext';
import { useAppStore } from '@/store/useAppStore';
import { useUser, useUserPosts, useProfileUpdates, useCreatorPostNotifications } from '@/hooks/useQueries';
import { useMutation } from '@tanstack/react-query';
import { LoadingState } from '@/components/ui/LoadingState';
import { EmptyState } from '@/components/ui/EmptyState';
import { MyPageContent } from '@/components/mypage/MyPageContent';
import { useToast } from '@/components/ui/Toast';
import { supabase } from '@/lib/supabase';
import { messagesService } from '@/services/supabase/messages';
import { getBlockRelationship } from '@/services/supabase/blocks';
import { canVisitorSeeProfileContent } from '@/utils/mypagePosts';
import { profilesService } from '@/services/supabase';
import { queryClient } from '@/lib/queryClient';
import { userKeys } from '@/lib/queryKeys';
import { SendCreatorGiftTray } from '@/components/shop/SendCreatorGiftTray';
import { ReportModal } from '@/components/ui/ReportModal';

/**
 * Public profile uses the same layout as My Pulse (`MyPageContent`).
 * Opening your own id redirects to the My Pulse tab — avoids duplicate “old profile” UI.
 */
export default function ProfileByIdScreen() {
  const { id, openPulseHistory, tierUp } = useLocalSearchParams<{
    id: string;
    openPulseHistory?: string;
    tierUp?: string;
  }>();
  const router = useRouter();
  const { user: authUser, profile } = useAuth();
  const followedIds = useAppStore((s) => s.followedCreatorIds);
  const setCreatorFollowed = useAppStore((s) => s.setCreatorFollowed);
  const toast = useToast();
  const [creatorGiftOpen, setCreatorGiftOpen] = useState(false);
  const [reportOpen, setReportOpen] = useState(false);

  const profileUserId = typeof id === 'string' ? id : Array.isArray(id) ? id[0] : '';
  const { data: blockRelationship = 'none', isLoading: blockLoading } = useQuery({
    queryKey: ['blockRelationship', authUser?.id ?? '', profileUserId],
    queryFn: () => getBlockRelationship(authUser!.id, profileUserId),
    enabled: Boolean(authUser?.id && profileUserId && authUser.id !== profileUserId),
    staleTime: 30_000,
  });
  const { data: user, isLoading, isError, refetch } = useUser(profileUserId);

  const awaitingBlockCheck = Boolean(
    authUser?.id && profileUserId && authUser.id !== profileUserId && blockLoading,
  );

  const canSeeProfileContent =
    user != null && !awaitingBlockCheck
      ? canVisitorSeeProfileContent(user, false, {
          blockRelationship: authUser?.id ? blockRelationship : 'none',
          viewerIsStaff: Boolean(authUser?.id && profile?.roleAdmin),
        })
      : false;

  const contentQueryUserId = canSeeProfileContent ? profileUserId : '';
  const { data: posts } = useUserPosts(contentQueryUserId);
  const { data: profileUpdates = [] } = useProfileUpdates(contentQueryUserId || undefined);
  const { data: creatorPostNotifyOn = false, isLoading: creatorPostNotifyLoading } =
    useCreatorPostNotifications(profileUserId || undefined, authUser?.id);

  const creatorPostNotifyMutation = useMutation({
    mutationFn: async (next: boolean) => {
      if (!authUser?.id || !profileUserId) throw new Error('missing');
      await profilesService.setCreatorPostNotifications(authUser.id, profileUserId, next);
    },
    onSuccess: (_data, next) => {
      queryClient.setQueryData(
        ['creatorPostNotifications', authUser?.id ?? '', profileUserId],
        next,
      );
    },
  });

  const handleToggleCreatorPostNotify = async (next: boolean) => {
    if (!authUser?.id || !profileUserId || creatorPostNotifyLoading) {
      throw new Error('missing');
    }
    await creatorPostNotifyMutation.mutateAsync(next);
  };

  if (!profileUserId) return <LoadingState />;
  if ((isLoading || blockLoading) && user === undefined) return <LoadingState />;
  if (blockRelationship === 'blocked_by_viewer') {
    return (
      <View style={{ flex: 1, justifyContent: 'center', paddingHorizontal: 24 }}>
        <EmptyState
          icon="eye-off-outline"
          title="Profile unavailable"
          subtitle="You cannot view this profile."
          ctaLabel="Go back"
          onCtaPress={() => router.back()}
        />
      </View>
    );
  }
  if (isError || user == null) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', paddingHorizontal: 24 }}>
        <EmptyState
          icon="person-outline"
          title="Could not load profile"
          subtitle="Check your connection and try again."
          ctaLabel="Retry"
          onCtaPress={() => void refetch()}
        />
      </View>
    );
  }

  if (authUser?.id === user.id) {
    // Preserve the deep-link params when redirecting to My Pulse so the
    // tap-through from a tier-up notification lands you on your own
    // history sheet — with the "Share my tier" card at the top when the
    // `tierUp=1` flag is present — in one motion.
    if (openPulseHistory === '1') {
      const href =
        tierUp === '1'
          ? '/(tabs)/my-pulse?openPulseHistory=1&tierUp=1'
          : '/(tabs)/my-pulse?openPulseHistory=1';
      return <Redirect href={href as any} />;
    }
    return <Redirect href="/(tabs)/my-pulse" />;
  }

  const isFollowing = followedIds.has(user.id);

  const handleToggleFollow = async () => {
    if (!authUser?.id || authUser.id === user.id) return;
    const wasFollowing = followedIds.has(user.id);
    setCreatorFollowed(user.id, !wasFollowing);
    try {
      await profilesService.toggleFollow(authUser.id, user.id);
      queryClient.invalidateQueries({ queryKey: userKeys.detail(user.id) });
    } catch {
      setCreatorFollowed(user.id, wasFollowing);
      toast.show('Could not update follow', 'error');
    }
  };

  const handleMessage = async () => {
    if (!authUser) return;
    try {
      const convId = await messagesService.getOrCreateConversation(authUser.id, user.id);
      router.push(
        `/messages/${convId}?name=${encodeURIComponent(user.displayName)}&peerId=${encodeURIComponent(user.id)}` as any,
      );
    } catch (e: any) {
      toast.show(e?.message ?? 'Could not open messages', 'error');
    }
  };

  const handleBlock = () => {
    if (!authUser) return;
    Alert.alert(
      'Block user',
      `Block ${user.displayName}?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Block',
          style: 'destructive',
          onPress: async () => {
            try {
              await supabase.from('blocked_users').insert({
                blocker_id: authUser.id,
                blocked_id: user.id,
              } as never);
              toast.show(`${user.displayName} blocked`, 'success');
              router.back();
            } catch {
              toast.show('Could not block user', 'error');
            }
          },
        },
      ],
    );
  };

  return (
    <>
      <MyPageContent
        user={user}
        profileUpdates={profileUpdates}
        userPosts={posts}
        isOwner={false}
        profileContentVisible={canSeeProfileContent}
        blockRelationship={blockRelationship}
        isFollowing={isFollowing}
        onToggleFollow={handleToggleFollow}
        onMessage={
          canSeeProfileContent && blockRelationship === 'none' ? handleMessage : undefined
        }
        onBlock={handleBlock}
        onReport={authUser ? () => setReportOpen(true) : undefined}
        initialOpenPulseHistory={openPulseHistory === '1'}
        highlightShareTier={tierUp === '1'}
        creatorPostNotificationsOn={creatorPostNotifyOn}
        onToggleCreatorPostNotifications={
          authUser ? handleToggleCreatorPostNotify : undefined
        }
        creatorPostNotificationsBusy={
          creatorPostNotifyMutation.isPending || creatorPostNotifyLoading
        }
        onOpenCreatorGifts={
          authUser?.id && canSeeProfileContent && blockRelationship === 'none'
            ? () => setCreatorGiftOpen(true)
            : undefined
        }
      />
      {authUser?.id ? (
        <SendCreatorGiftTray
          visible={creatorGiftOpen}
          onClose={() => setCreatorGiftOpen(false)}
          creatorUserId={user.id}
          creatorDisplayName={user.displayName}
          creatorHandle={user.username ?? undefined}
          creatorAvatarUrl={user.avatarUrl ?? undefined}
          contextType="profile"
          contextId={user.id}
        />
      ) : null}
      <ReportModal
        visible={reportOpen}
        onClose={() => setReportOpen(false)}
        targetType="profile"
        targetId={user.id}
      />
    </>
  );
}
