import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  FlatList,
  TextInput,
} from 'react-native';
import { Redirect, useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '@/contexts/AuthContext';
import { useAppStore } from '@/store/useAppStore';
import { profileUpdatesService } from '@/services/profileUpdates';
import type { EligibleCircleDiscussion } from '@/types';
import { useToast } from '@/components/ui/Toast';
import { AccentComposerFrame, AccentCharCount } from '@/components/ui/AccentComposerFrame';
import { colors, borderRadius, typography } from '@/theme';
import { profileUpdateKeys } from '@/lib/queryKeys';
import { getAvatarSubtitleRowListWindow } from '@/lib/feedVideoListWindow';

const LINK_CIRCLE_LIST_WINDOW = getAvatarSubtitleRowListWindow();

export default function MyPulseLinkCircleScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const queryClient = useQueryClient();
  const showToast = useToast((s) => s.show);
  const { profile } = useAuth();
  const storeUser = useAppStore((s) => s.currentUser);
  const user = profile ?? storeUser;

  const { data: discussions = [] } = useQuery({
    queryKey: ['myPulseEligibleDiscussions', user?.id ?? ''],
    queryFn: () => profileUpdatesService.getEligibleCircleDiscussionsForLinking(user!.id),
    enabled: !!user?.id,
  });

  const [selected, setSelected] = useState<EligibleCircleDiscussion | null>(null);
  const [intro, setIntro] = useState('');

  const mutation = useMutation({
    mutationFn: async () => {
      if (!user?.id) throw new Error('Not signed in');
      if (!selected) throw new Error('none');
      const line =
        intro.trim() ||
        `Join the discussion in ${selected.circleName}: ${selected.title}`;
      return profileUpdatesService.add(user.id, {
        type: 'link_circle',
        content: line,
        linkedCircleSlug: selected.circleSlug,
        linkedDiscussionTitle: selected.title,
        linkedThreadId: selected.id,
        previewText: selected.title.slice(0, 120),
      });
    },
    onSuccess: async () => {
      if (user?.id) await queryClient.invalidateQueries({ queryKey: profileUpdateKeys.forUser(user.id) });
      showToast('Discussion linked on My Pulse', 'success');
      router.replace('/(tabs)/my-pulse');
    },
    onError: (err: Error) => {
      showToast(err.message || 'Could not link discussion — try again.', 'error');
    },
  });

  const submit = useCallback(() => {
    if (!selected) return;
    mutation.mutate();
  }, [selected, mutation]);

  const renderRow = ({ item }: { item: EligibleCircleDiscussion }) => {
    const on = selected?.id === item.id;
    return (
      <TouchableOpacity
        style={[styles.row, on && styles.rowOn]}
        onPress={() => setSelected(item)}
        activeOpacity={0.85}
      >
        <View style={styles.rowTop}>
          <Text style={styles.circlePill}>{item.circleName}</Text>
          <Text style={styles.meta}>{item.replyCount} replies</Text>
        </View>
        <Text style={styles.title} numberOfLines={2}>
          {item.title}
        </Text>
      </TouchableOpacity>
    );
  };

  if (!user) return <Redirect href="/auth/login" />;

  return (
    <View style={[styles.container, { paddingTop: insets.top + 8 }]}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} hitSlop={12}>
          <Ionicons name="chevron-back" size={26} color={colors.dark.text} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Circle discussion</Text>
        <TouchableOpacity onPress={submit} disabled={!selected || mutation.isPending}>
          <Text style={[styles.postBtn, (!selected || mutation.isPending) && styles.postBtnOff]}>Add</Text>
        </TouchableOpacity>
      </View>

      <Text style={styles.hint}>Link something you care about in Circles. Optional intro sets the tone on your page.</Text>

      <Text style={styles.fieldLbl}>Optional intro</Text>
      <AccentComposerFrame
        accentColor={colors.primary.teal}
        hint="Intro"
        compact
        noShadow
        footer={
          <AccentCharCount
            length={intro.length}
            max={160}
            accentColor={colors.primary.teal}
            warnWithin={20}
            hideWhenEmpty={false}
          />
        }
      >
        <TextInput
          style={styles.introPlain}
          placeholder="e.g. Would love your take on this…"
          placeholderTextColor={colors.dark.textMuted}
          value={intro}
          onChangeText={setIntro}
          maxLength={160}
        />
      </AccentComposerFrame>

      <Text style={styles.fieldLbl}>Recent discussions</Text>
      <FlatList
        data={discussions}
        keyExtractor={(d) => d.id}
        initialNumToRender={LINK_CIRCLE_LIST_WINDOW.initialNumToRender}
        maxToRenderPerBatch={LINK_CIRCLE_LIST_WINDOW.maxToRenderPerBatch}
        windowSize={LINK_CIRCLE_LIST_WINDOW.windowSize}
        updateCellsBatchingPeriod={50}
        removeClippedSubviews={false}
        renderItem={renderRow}
        style={styles.list}
        contentContainerStyle={{ paddingBottom: 24 }}
        ListEmptyComponent={
          <Text style={styles.empty}>No discussions available right now.</Text>
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.dark.bg, paddingHorizontal: 18 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 10,
  },
  headerTitle: { ...typography.h3, color: colors.dark.text, fontSize: 17 },
  postBtn: { fontSize: 16, fontWeight: '800', color: colors.primary.teal },
  postBtnOff: { opacity: 0.35 },
  hint: { fontSize: 13, color: colors.dark.textSecondary, lineHeight: 19, marginBottom: 12 },
  fieldLbl: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.dark.textMuted,
    marginBottom: 8,
    marginTop: 4,
  },
  introPlain: {
    paddingHorizontal: 6,
    paddingVertical: 6,
    fontSize: 15,
    color: colors.dark.text,
    marginBottom: 4,
  },
  list: { flex: 1 },
  row: {
    padding: 14,
    borderRadius: borderRadius.lg,
    borderWidth: 1,
    borderColor: colors.dark.border,
    marginBottom: 10,
    backgroundColor: colors.dark.card,
  },
  rowOn: { borderColor: colors.primary.teal + '99', backgroundColor: colors.primary.teal + '10' },
  rowTop: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  circlePill: {
    fontSize: 11,
    fontWeight: '800',
    color: colors.primary.teal,
    textTransform: 'uppercase',
    letterSpacing: 0.6,
  },
  meta: { fontSize: 11, color: colors.dark.textMuted, fontWeight: '600' },
  title: { fontSize: 15, fontWeight: '700', color: colors.dark.text, lineHeight: 21 },
  empty: { fontSize: 14, color: colors.dark.textMuted, textAlign: 'center', marginTop: 24 },
});
