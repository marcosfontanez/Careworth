import React, { useEffect, useRef } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Animated,
  Platform,
  ActionSheetIOS,
  Alert,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { colors, typography } from '@/theme';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/components/ui/Toast';
import { postsService } from '@/services/supabase';
import { savedSoundsService } from '@/services/supabase/savedSounds';
import { shareDownloadedRemoteUrl } from '@/lib/postMediaActions';
import type { Post } from '@/types';

function soundLabel(post: Post): string {
  const t = post.soundTitle?.trim();
  if (t) return t;
  return 'Original sound';
}

function subtitle(post: Post): string {
  if (post.soundSourcePostId) return 'Uses sound';
  return post.creator.displayName;
}

type Props = { post: Post; /** Only the focused feed page should animate + hit saved-sounds API */ isSoundCellActive?: boolean };

export function FeedOriginalSound({ post, isSoundCellActive = true }: Props) {
  const router = useRouter();
  const { user } = useAuth();
  const toast = useToast();
  const queryClient = useQueryClient();
  const spin = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (!isSoundCellActive) {
      spin.stopAnimation();
      spin.setValue(0);
      return;
    }
    const loop = Animated.loop(
      Animated.timing(spin, {
        toValue: 1,
        duration: 14000,
        useNativeDriver: true,
      }),
    );
    loop.start();
    return () => {
      loop.stop();
      spin.stopAnimation();
    };
  }, [isSoundCellActive, spin]);

  const rotate = spin.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '360deg'],
  });

  const { data: isSaved } = useQuery({
    queryKey: ['savedSound', user?.id, post.id],
    queryFn: () => savedSoundsService.isSaved(user!.id, post.id),
    // Avoid N API calls + work for every cell in the FlatList window (this broke scroll/perf).
    enabled: !!user?.id && isSoundCellActive,
    staleTime: 60_000,
  });

  const toggleMut = useMutation({
    mutationFn: async () => {
      const uid = user?.id;
      if (!uid) throw new Error('Not signed in');
      return savedSoundsService.toggle(uid, post.id);
    },
    onSuccess: (nowSaved) => {
      queryClient.invalidateQueries({ queryKey: ['savedSound', user?.id, post.id] });
      toast.show(nowSaved ? 'Sound saved' : 'Removed from saved sounds', 'success');
    },
    onError: (err: unknown) => {
      const msg = err instanceof Error ? err.message : 'Could not update saved sound';
      toast.show(msg.length > 120 ? `${msg.slice(0, 117)}…` : msg, 'error');
    },
  });

  const openMenu = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    const title = soundLabel(post);
    const filmLabel = 'Film with this sound';
    const soundPageId = post.soundSourcePostId?.trim() || post.id;

    const runFilm = () => {
      router.push(`/create/video?soundPostId=${encodeURIComponent(soundPageId)}`);
    };

    const runDownload = async () => {
      try {
        const sourceId = post.soundSourcePostId?.trim() || post.id;
        const src = await postsService.getById(sourceId, user?.id ?? null);
        const url = src?.mediaUrl?.trim();
        if (!url) {
          toast.show('No media file found for this sound', 'info');
          return;
        }
        const base = `pulseverse-sound-${sourceId.slice(0, 8)}`;
        await shareDownloadedRemoteUrl(url, base, { mimeType: 'video/mp4', utiIos: 'public.mpeg-4' });
      } catch (e: unknown) {
        const msg = e instanceof Error ? e.message : 'Download failed';
        toast.show(msg.length > 120 ? `${msg.slice(0, 117)}…` : msg, 'error');
      }
    };

    const runSave = () => {
      if (!user) {
        toast.show('Sign in to save sounds', 'info');
        return;
      }
      toggleMut.mutate();
    };

    if (Platform.OS === 'ios') {
      const saveLabel = isSaved ? 'Remove from saved sounds' : 'Save sound';
      ActionSheetIOS.showActionSheetWithOptions(
        {
          options: [saveLabel, 'Download sound file', filmLabel, 'Cancel'],
          cancelButtonIndex: 3,
          title,
        },
        (i) => {
          if (i === 0) runSave();
          else if (i === 1) void runDownload();
          else if (i === 2) runFilm();
        },
      );
      return;
    }

    Alert.alert(title, undefined, [
      { text: isSaved ? 'Remove from saved' : 'Save sound', onPress: runSave },
      { text: 'Download sound file', onPress: () => void runDownload() },
      { text: filmLabel, onPress: runFilm },
      { text: 'Cancel', style: 'cancel' },
    ]);
  };

  return (
    <TouchableOpacity
      style={styles.wrap}
      onPress={openMenu}
      activeOpacity={0.85}
      accessibilityRole="button"
      accessibilityLabel={`Sound: ${soundLabel(post)}. Opens actions.`}
    >
      <Animated.View style={[styles.discOuter, { transform: [{ rotate }] }]}>
        <View style={styles.discInner}>
          <Ionicons name="musical-notes" size={22} color={colors.dark.text} />
        </View>
      </Animated.View>
      <Text style={[styles.line, typography.overlayMicro]} numberOfLines={1}>
        {soundLabel(post)}
      </Text>
      <Text style={styles.sub} numberOfLines={1}>
        {subtitle(post)}
      </Text>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  wrap: {
    alignItems: 'center',
    maxWidth: 76,
    gap: 4,
  },
  discOuter: {
    width: 48,
    height: 48,
    borderRadius: 24,
    borderWidth: 2,
    borderColor: 'rgba(255,255,255,0.92)',
    backgroundColor: 'rgba(0,0,0,0.35)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  discInner: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: colors.dark.cardAlt,
    alignItems: 'center',
    justifyContent: 'center',
  },
  line: {
    color: colors.onVideo.primary,
    fontSize: 10,
    fontWeight: '700',
    textAlign: 'center',
    textShadowColor: 'rgba(0,0,0,0.55)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 4,
  },
  sub: {
    fontSize: 9,
    fontWeight: '600',
    color: colors.onVideo.mutedStrong,
    textAlign: 'center',
    textShadowColor: 'rgba(0,0,0,0.45)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 3,
  },
});
