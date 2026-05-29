import React, { useMemo } from 'react';
import { View, Text, StyleSheet, Pressable, ActivityIndicator } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useQuery } from '@tanstack/react-query';
import { useAuth } from '@/contexts/AuthContext';
import { hrefTabCircles } from '@/lib/communityRoutes';
import { communitiesService } from '@/services/supabase';
import { pulseColors, pulseRadius, pulseSpacing, pulseTypography } from '@/lib/theme/pulseTheme';
import type { Community } from '@/types';

type Props = {
  selectedCommunityId: string | null;
  onSelect: (community: Community | null) => void;
  disabled?: boolean;
};

/** Optional Circle attachment for feed video upload — one joined Circle for MVP. */
export function VideoCirclePicker({ selectedCommunityId, onSelect, disabled = false }: Props) {
  const router = useRouter();
  const { user } = useAuth();
  const { data: joined = [], isPending } = useQuery({
    queryKey: ['communities', 'joinedForVideoUpload', user?.id],
    queryFn: () => (user?.id ? communitiesService.getJoined(user.id) : Promise.resolve([])),
    enabled: !!user?.id,
    staleTime: 60_000,
  });

  const selected = useMemo(
    () => joined.find((c) => c.id === selectedCommunityId) ?? null,
    [joined, selectedCommunityId],
  );

  if (!user?.id) return null;

  return (
    <View style={styles.wrap}>
      <Text style={styles.title}>Add to a Circle</Text>
      <Text style={styles.helper}>Optional — link one joined Circle to this video.</Text>

      {isPending ? (
        <ActivityIndicator color={pulseColors.teal} style={styles.loader} />
      ) : joined.length === 0 ? (
        <View style={styles.emptyWrap}>
          <Text style={styles.empty}>Join a Circle to link videos here, or browse communities to find one.</Text>
          <Pressable
            style={styles.browseBtn}
            onPress={() => router.push(hrefTabCircles('discover'))}
            disabled={disabled}
            accessibilityRole="button"
          >
            <Ionicons name="compass-outline" size={14} color={pulseColors.teal} />
            <Text style={styles.browseBtnText}>Browse Circles</Text>
          </Pressable>
        </View>
      ) : (
        <View style={styles.chipRow}>
          <Pressable
            style={[styles.chip, !selectedCommunityId && styles.chipActive]}
            onPress={() => onSelect(null)}
            disabled={disabled}
            accessibilityRole="button"
            accessibilityState={{ selected: !selectedCommunityId }}
          >
            <Text style={[styles.chipText, !selectedCommunityId && styles.chipTextActive]}>
              No Circle selected
            </Text>
          </Pressable>
          {joined.map((community) => {
            const active = community.id === selectedCommunityId;
            return (
              <Pressable
                key={community.id}
                style={[styles.chip, active && styles.chipActive]}
                onPress={() => onSelect(active ? null : community)}
                disabled={disabled}
                accessibilityRole="button"
                accessibilityState={{ selected: active }}
              >
                <Ionicons
                  name="people-outline"
                  size={12}
                  color={active ? pulseColors.teal : pulseColors.mutedText}
                />
                <Text style={[styles.chipText, active && styles.chipTextActive]} numberOfLines={1}>
                  {community.name}
                </Text>
              </Pressable>
            );
          })}
        </View>
      )}

      {selected ? (
        <Text style={styles.selectedHint}>Posted in {selected.name}</Text>
      ) : joined.length > 0 ? (
        <Pressable
          style={styles.browseLink}
          onPress={() => router.push(hrefTabCircles('discover'))}
          disabled={disabled}
          accessibilityRole="button"
        >
          <Text style={styles.browseLinkText}>Browse more Circles</Text>
        </Pressable>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    gap: pulseSpacing.sm,
    paddingVertical: pulseSpacing.sm,
  },
  title: {
    ...pulseTypography.cardTitle,
    fontSize: 14,
  },
  helper: {
    ...pulseTypography.bodySmall,
    color: pulseColors.mutedText,
  },
  loader: {
    marginVertical: pulseSpacing.sm,
  },
  emptyWrap: {
    gap: pulseSpacing.sm,
  },
  empty: {
    ...pulseTypography.bodySmall,
    color: pulseColors.textQuiet,
  },
  browseBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    gap: 6,
    paddingHorizontal: pulseSpacing.md,
    paddingVertical: pulseSpacing.sm,
    borderRadius: pulseRadius.full,
    borderWidth: 1,
    borderColor: pulseColors.borderAccent,
    backgroundColor: 'rgba(25, 211, 197, 0.08)',
  },
  browseBtnText: {
    ...pulseTypography.caption,
    fontWeight: '700',
    color: pulseColors.teal,
  },
  browseLink: {
    alignSelf: 'flex-start',
  },
  browseLinkText: {
    ...pulseTypography.caption,
    color: pulseColors.mutedText,
    fontWeight: '600',
    textDecorationLine: 'underline',
  },
  chipRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: pulseSpacing.sm,
  },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    maxWidth: '100%',
    paddingHorizontal: pulseSpacing.md,
    paddingVertical: pulseSpacing.sm,
    borderRadius: pulseRadius.full,
    borderWidth: 1,
    borderColor: pulseColors.border,
    backgroundColor: pulseColors.glass,
  },
  chipActive: {
    borderColor: pulseColors.borderAccent,
    backgroundColor: 'rgba(25, 211, 197, 0.12)',
  },
  chipText: {
    ...pulseTypography.caption,
    fontWeight: '700',
    color: pulseColors.mutedText,
    flexShrink: 1,
  },
  chipTextActive: {
    color: pulseColors.text,
  },
  selectedHint: {
    ...pulseTypography.caption,
    color: pulseColors.teal,
    fontWeight: '700',
  },
});
