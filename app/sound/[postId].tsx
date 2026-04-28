import React, { useCallback, useState, useEffect } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity, StyleSheet, ActivityIndicator,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Image } from 'expo-image';
import { StackScreenHeader } from '@/components/ui/StackScreenHeader';
import { postsService, soundVotesService } from '@/services/supabase';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/components/ui/Toast';
import { colors, layout, spacing, typography } from '@/theme';
import { postKeys } from '@/lib/queryKeys';
import type { Post } from '@/types';

export default function SoundDetailScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { user } = useAuth();
  const toast = useToast();
  const queryClient = useQueryClient();
  const { postId: postIdRaw } = useLocalSearchParams<{ postId: string }>();
  const postId = decodeURIComponent(Array.isArray(postIdRaw) ? postIdRaw[0] : postIdRaw ?? '').trim();

  const { data: source, isPending: sourceLoading } = useQuery({
    queryKey: postKeys.detail(postId, user?.id ?? null),
    queryFn: () => postsService.getById(postId, user?.id ?? null),
    enabled: postId.length > 0,
  });

  const { data: remixes = [], isPending: remixLoading } = useQuery({
    queryKey: ['soundRemixes', postId, user?.id ?? ''],
    queryFn: () => postsService.getPostsUsingSoundSource(postId, 40, user?.id ?? null),
    enabled: postId.length > 0,
  });

  const [netScore, setNetScore] = useState(0);
  const [voting, setVoting] = useState(false);

  const refreshScore = useCallback(async () => {
    if (!postId) return;
    const n = await soundVotesService.getNetScore(postId);
    setNetScore(n);
  }, [postId]);

  useEffect(() => {
    void refreshScore();
  }, [refreshScore]);

  const onVote = async (vote: -1 | 0 | 1) => {
    if (!user?.id) {
      toast.show('Sign in to vote', 'info');
      return;
    }
    setVoting(true);
    try {
      await soundVotesService.upsertVote(user.id, postId, vote);
      await refreshScore();
      queryClient.invalidateQueries({ queryKey: ['soundRemixes', postId] });
      toast.show(vote === 0 ? 'Vote cleared' : 'Thanks — context updated', 'success');
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : 'Vote failed';
      toast.show(msg.length > 100 ? `${msg.slice(0, 97)}…` : msg, 'error');
    } finally {
      setVoting(false);
    }
  };

  const film = () => {
    router.push(`/create/video?mode=record&soundPostId=${encodeURIComponent(postId)}`);
  };

  const duetFromSource = () => {
    router.push(`/create/video?mode=record&duetPostId=${encodeURIComponent(postId)}`);
  };

  const renderRemix = (item: Post) => {
    const thumb = item.thumbnailUrl?.trim() || item.mediaUrl?.trim();
    return (
      <TouchableOpacity
        key={item.id}
        style={styles.remixRow}
        activeOpacity={0.85}
        onPress={() => router.push(`/post/${item.id}`)}
      >
        {thumb ? (
          <Image source={{ uri: thumb }} style={styles.remixThumb} contentFit="cover" />
        ) : (
          <View style={[styles.remixThumb, styles.thumbPh]} />
        )}
        <View style={{ flex: 1, minWidth: 0 }}>
          <Text style={styles.remixCap} numberOfLines={2}>{item.caption || 'Clip'}</Text>
          <Text style={styles.remixMeta} numberOfLines={1}>{item.creator.displayName}</Text>
        </View>
      </TouchableOpacity>
    );
  };

  const thumb = source?.thumbnailUrl?.trim() || source?.mediaUrl?.trim();
  const title = source?.soundTitle?.trim() || 'Original sound';

  return (
    <View style={styles.container}>
      <StackScreenHeader insetTop={insets.top} title="Sound" onPressLeft={() => router.back()} />
      {!postId ? (
        <Text style={styles.muted}>Missing sound id.</Text>
      ) : sourceLoading || !source ? (
        <ActivityIndicator size="large" color={colors.primary.teal} style={{ marginTop: spacing['4xl'] }} />
      ) : (
        <ScrollView contentContainerStyle={[styles.body, { paddingBottom: insets.bottom + 32 }]}>
          <View style={styles.hero}>
            {thumb ? (
              <Image source={{ uri: thumb }} style={styles.heroThumb} contentFit="cover" />
            ) : (
              <View style={[styles.heroThumb, styles.thumbPh]} />
            )}
            <View style={{ flex: 1, minWidth: 0, gap: 6 }}>
              <Text style={styles.title} numberOfLines={2}>{title}</Text>
              <Text style={styles.meta} numberOfLines={1}>{source.creator.displayName}</Text>
              <Text style={styles.scoreLine}>Context score: {netScore > 0 ? `+${netScore}` : netScore}</Text>
            </View>
          </View>

          <Text style={styles.sectionLabel}>Clinical / educational context?</Text>
          <Text style={styles.hint}>
            Peer votes help surface whether this audio is appropriate in a professional setting. This is not medical advice.
          </Text>
          <View style={styles.voteRow}>
            <TouchableOpacity
              style={[styles.voteBtn, styles.voteDown]}
              disabled={voting}
              onPress={() => onVote(-1)}
              accessibilityLabel="Not appropriate for clinical context"
            >
              <Text style={styles.voteBtnText}>−1</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.voteBtn, styles.voteNeutral]}
              disabled={voting}
              onPress={() => onVote(0)}
              accessibilityLabel="Clear my vote"
            >
              <Text style={styles.voteBtnText}>0</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.voteBtn, styles.voteUp]}
              disabled={voting}
              onPress={() => onVote(1)}
              accessibilityLabel="Appropriate for clinical context"
            >
              <Text style={styles.voteBtnText}>+1</Text>
            </TouchableOpacity>
          </View>

          <TouchableOpacity style={styles.primaryBtn} onPress={film} activeOpacity={0.88}>
            <Text style={styles.primaryBtnText}>Film with this sound</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.secondaryBtn} onPress={duetFromSource} activeOpacity={0.88}>
            <Text style={styles.secondaryBtnText}>Duet with this clip</Text>
          </TouchableOpacity>

          <Text style={[styles.sectionLabel, { marginTop: spacing.lg }]}>Clips using this sound</Text>
          {remixLoading ? (
            <ActivityIndicator color={colors.primary.teal} style={{ marginTop: spacing.md }} />
          ) : (
            <View style={styles.remixList}>{remixes.map(renderRemix)}</View>
          )}
        </ScrollView>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.dark.bg },
  body: { paddingHorizontal: layout.screenPadding, paddingTop: spacing.md, gap: spacing.md },
  muted: { ...typography.body, color: colors.dark.textMuted, padding: layout.screenPadding },
  hero: { flexDirection: 'row', gap: 14, alignItems: 'center' },
  heroThumb: { width: 88, height: 88, borderRadius: 14, backgroundColor: colors.dark.cardAlt },
  thumbPh: { backgroundColor: colors.dark.border },
  title: { ...typography.h3, color: colors.dark.text },
  meta: { ...typography.bodySmall, color: colors.dark.textMuted },
  scoreLine: { ...typography.caption, color: colors.primary.teal, fontWeight: '700' },
  sectionLabel: { ...typography.sectionLabel, color: colors.dark.text },
  hint: { ...typography.caption, color: colors.dark.textMuted, lineHeight: 18 },
  voteRow: { flexDirection: 'row', gap: 10 },
  voteBtn: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 12,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.dark.border,
  },
  voteDown: { backgroundColor: '#EF444422' },
  voteNeutral: { backgroundColor: colors.dark.cardAlt },
  voteUp: { backgroundColor: colors.primary.teal + '33' },
  voteBtnText: { fontSize: 16, fontWeight: '800', color: colors.dark.text },
  primaryBtn: {
    marginTop: spacing.sm,
    paddingVertical: 14,
    borderRadius: 14,
    backgroundColor: colors.primary.teal,
    alignItems: 'center',
  },
  primaryBtnText: { fontSize: 15, fontWeight: '800', color: colors.dark.text },
  secondaryBtn: {
    paddingVertical: 12,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: colors.primary.teal,
    alignItems: 'center',
  },
  secondaryBtnText: { fontSize: 14, fontWeight: '800', color: colors.primary.teal },
  remixList: { gap: 0 },
  remixRow: {
    flexDirection: 'row',
    gap: 10,
    paddingVertical: 10,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.dark.border,
    alignItems: 'center',
  },
  remixThumb: { width: 48, height: 48, borderRadius: 8, backgroundColor: colors.dark.cardAlt },
  remixCap: { ...typography.body, color: colors.dark.text, fontSize: 14 },
  remixMeta: { ...typography.caption, color: colors.dark.textMuted },
});
