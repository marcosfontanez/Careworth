import React from 'react';
import { Redirect, useLocalSearchParams, useRouter } from 'expo-router';
import { Alert } from 'react-native';
import { useAuth } from '@/contexts/AuthContext';
import { useAppStore } from '@/store/useAppStore';
import { useUser, useUserPosts, useProfileUpdates } from '@/hooks/useQueries';
import { LoadingState } from '@/components/ui/LoadingState';
import { MyPageContent } from '@/components/mypage/MyPageContent';
import { useToast } from '@/components/ui/Toast';
import { supabase } from '@/lib/supabase';
import { messagesService } from '@/services/supabase/messages';
import { profilesService } from '@/services/supabase';
import { queryClient } from '@/lib/queryClient';
import { userKeys } from '@/lib/queryKeys';

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
  const { user: authUser } = useAuth();
  const followedIds = useAppStore((s) => s.followedCreatorIds);
  const setCreatorFollowed = useAppStore((s) => s.setCreatorFollowed);
  const toast = useToast();

  const { data: user, isLoading } = useUser(id);
  const { data: posts } = useUserPosts(id);
  const { data: profileUpdates = [] } = useProfileUpdates(id);

  if (isLoading || !user) return <LoadingState />;

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
      router.push(`/messages/${convId}?name=${encodeURIComponent(user.displayName)}`);
    } catch {
      toast.show('Could not open messages', 'error');
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
    <MyPageContent
      user={user}
      profileUpdates={profileUpdates}
      userPosts={posts}
      isOwner={false}
      isFollowing={isFollowing}
      onToggleFollow={handleToggleFollow}
      onMessage={handleMessage}
      onBlock={handleBlock}
      initialOpenPulseHistory={openPulseHistory === '1'}
      highlightShareTier={tierUp === '1'}
    />
  );
}
