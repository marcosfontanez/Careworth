import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors, borderRadius, typography } from '@/theme';
import type { CreatorSummary } from '@/types';

type Props = {
  host: CreatorSummary;
  isFollowing: boolean;
  canFollow: boolean;
  onToggleFollow: () => void;
};

/** Small host identity chip — not a full profile card. */
export function ViewerHostChip({ host, isFollowing, canFollow, onToggleFollow }: Props) {
  return (
    <View style={styles.wrap}>
      <View style={styles.nameRow}>
        <Text style={styles.name} numberOfLines={1}>
          {host.displayName}
        </Text>
        {host.isVerified ? (
          <Ionicons name="checkmark-circle" size={14} color={colors.primary.teal} />
        ) : null}
      </View>
      {canFollow ? (
        <Pressable
          onPress={onToggleFollow}
          style={[styles.followBtn, isFollowing && styles.followBtnOn]}
          accessibilityLabel={isFollowing ? 'Following host' : 'Follow host'}
        >
          <Text style={[styles.followTxt, isFollowing && styles.followTxtOn]}>
            {isFollowing ? 'Following' : 'Follow'}
          </Text>
        </Pressable>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    gap: 8,
    maxWidth: '78%',
    marginTop: 10,
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderRadius: borderRadius.full,
    backgroundColor: 'rgba(12,18,32,0.55)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
  },
  nameRow: { flexDirection: 'row', alignItems: 'center', gap: 4, flexShrink: 1 },
  name: {
    ...typography.caption,
    fontSize: 13,
    fontWeight: '800',
    color: colors.neutral.white,
    flexShrink: 1,
  },
  followBtn: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: borderRadius.full,
    backgroundColor: 'rgba(56,189,248,0.18)',
    borderWidth: 1,
    borderColor: 'rgba(56,189,248,0.35)',
  },
  followBtnOn: {
    backgroundColor: 'rgba(255,255,255,0.08)',
    borderColor: 'rgba(255,255,255,0.12)',
  },
  followTxt: { fontSize: 11, fontWeight: '800', color: colors.primary.teal },
  followTxtOn: { color: 'rgba(248,250,252,0.75)' },
});
