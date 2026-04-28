import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { colors } from '@/theme';
import { formatCount } from '@/utils/format';
import type { Community } from '@/types';
import * as Haptics from 'expo-haptics';

interface Props {
  community: Community;
  onPress: () => void;
  onJoin: () => void;
}

export function CommunityCard({ community, onPress, onJoin }: Props) {
  return (
    <TouchableOpacity style={styles.card} onPress={onPress} activeOpacity={0.7}>
      <View style={[styles.iconWrap, { backgroundColor: (community.accentColor ?? colors.primary.teal) + '20' }]}>
        <Text style={styles.icon}>{community.icon}</Text>
      </View>
      <View style={styles.body}>
        <Text style={styles.name}>{community.name}</Text>
        <Text style={styles.desc} numberOfLines={1}>{community.description}</Text>
        <Text style={styles.stats}>
          {formatCount(community.memberCount)} members · {formatCount(community.postCount)} posts
        </Text>
      </View>
      <TouchableOpacity
        style={[styles.joinBtn, community.isJoined && styles.joinedBtn]}
        onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); onJoin(); }}
        activeOpacity={0.7}
      >
        <Text style={[styles.joinText, community.isJoined && styles.joinedText]}>
          {community.isJoined ? 'Joined' : 'Join'}
        </Text>
      </TouchableOpacity>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.dark.card,
    borderRadius: 14,
    padding: 14,
    gap: 12,
    borderWidth: 1,
    borderColor: colors.dark.border,
  },
  iconWrap: {
    width: 48, height: 48, borderRadius: 14,
    alignItems: 'center', justifyContent: 'center',
  },
  icon: { fontSize: 24 },
  body: { flex: 1 },
  name: { fontSize: 15, fontWeight: '700', color: colors.dark.text },
  desc: { fontSize: 12, color: colors.dark.textSecondary, marginTop: 2 },
  stats: { fontSize: 11, color: colors.dark.textMuted, marginTop: 4, fontWeight: '500' },
  joinBtn: {
    paddingHorizontal: 18, paddingVertical: 8,
    borderRadius: 20, backgroundColor: colors.primary.teal,
  },
  joinedBtn: {
    backgroundColor: 'transparent',
    borderWidth: 1.5, borderColor: colors.dark.textMuted,
  },
  joinText: { fontSize: 13, fontWeight: '700', color: '#FFF' },
  joinedText: { color: colors.dark.textMuted },
});
