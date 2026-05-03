import React, { useCallback } from 'react';
import { TouchableOpacity, Text, StyleSheet, Alert, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '@/contexts/AuthContext';
import { useAppStore } from '@/store/useAppStore';
import { profileUpdatesService } from '@/services/profileUpdates';
import { colors, borderRadius } from '@/theme';
import { profileUpdateKeys } from '@/lib/queryKeys';
import type { CircleThread } from '@/types';

type Props = {
  circleSlug: string;
  thread: CircleThread;
  /** Inline chip for thread cards · full row for thread detail. */
  layout?: 'compact' | 'full';
  label?: string;
};

export function ShareToMyPulseButton({ circleSlug, thread, layout = 'full', label }: Props) {
  const router = useRouter();
  const queryClient = useQueryClient();
  const { profile } = useAuth();
  const storeUser = useAppStore((s) => s.currentUser);
  const user = profile ?? storeUser;

  const mutation = useMutation({
    mutationFn: () => {
      if (!user?.id) throw new Error('Not signed in');
      return profileUpdatesService.add(user.id, {
        type: 'link_circle',
        content: `${thread.title} — pinned on My Pulse`,
        previewText: thread.body.slice(0, 140),
        linkedCircleSlug: circleSlug,
        linkedDiscussionTitle: thread.title,
        linkedThreadId: thread.id,
      });
    },
    onSuccess: async () => {
      if (user?.id) await queryClient.invalidateQueries({ queryKey: profileUpdateKeys.forUser(user.id) });
      Alert.alert('Pinned to My Pulse', 'Visitors can open this discussion from your profile.', [
        { text: 'Done', style: 'cancel' },
        { text: 'View My Pulse', onPress: () => router.push('/(tabs)/my-pulse' as any) },
      ]);
    },
    onError: () => {
      Alert.alert('Couldn’t pin', 'Try again in a moment.');
    },
  });

  const onPress = useCallback(() => {
    mutation.mutate();
  }, [mutation]);

  if (!user) return null;

  if (layout === 'compact') {
    return (
      <TouchableOpacity
        style={[styles.compact, mutation.isPending && styles.compactDim]}
        onPress={onPress}
        disabled={mutation.isPending}
        activeOpacity={0.82}
        hitSlop={{ top: 6, bottom: 6, left: 8, right: 8 }}
      >
        <Ionicons name="albums-outline" size={16} color={colors.primary.teal} />
        <Text style={styles.compactText}>{label ?? 'My Pulse'}</Text>
      </TouchableOpacity>
    );
  }

  return (
    <TouchableOpacity
      style={[styles.bar, mutation.isPending && styles.barDim]}
      onPress={onPress}
      disabled={mutation.isPending}
      activeOpacity={0.88}
    >
      <View style={styles.barLeft}>
        <View style={styles.barIcon}>
          <Ionicons name="person-circle-outline" size={22} color={colors.primary.teal} />
        </View>
        <View>
          <Text style={styles.barTitle}>{label ?? 'Pin to My Pulse'}</Text>
          <Text style={styles.barSub}>Shows on your profile for visitors</Text>
        </View>
      </View>
      {mutation.isPending ? (
        <Text style={styles.pending}>…</Text>
      ) : (
        <Ionicons name="chevron-forward" size={18} color={colors.dark.textMuted} />
      )}
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  compact: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: borderRadius.full,
    backgroundColor: 'rgba(20,184,166,0.1)',
    borderWidth: 1,
    borderColor: colors.primary.teal + '35',
  },
  compactDim: { opacity: 0.55 },
  compactText: {
    fontSize: 12,
    fontWeight: '800',
    color: colors.primary.teal,
    letterSpacing: 0.2,
  },
  bar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
    paddingHorizontal: 12,
    borderRadius: borderRadius.lg,
    backgroundColor: colors.dark.elevated ?? colors.dark.cardAlt,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.07)',
  },
  barDim: { opacity: 0.6 },
  barLeft: { flexDirection: 'row', alignItems: 'center', gap: 10, flex: 1, minWidth: 0 },
  barIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(20,184,166,0.12)',
  },
  barTitle: {
    fontSize: 15,
    fontWeight: '800',
    color: colors.dark.text,
    letterSpacing: -0.2,
  },
  barSub: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.dark.textMuted,
    marginTop: 2,
  },
  pending: { fontSize: 16, color: colors.dark.textMuted, paddingRight: 4 },
});
