import React, { useMemo } from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { colors, borderRadius } from '@/theme';
import { formatCount } from '@/utils/format';
import type { Community } from '@/types';
import { JoinButton } from './JoinButton';

function oneLine(s: string, max = 72) {
  const t = s.replace(/\s+/g, ' ').trim();
  if (t.length <= max) return t;
  return `${t.slice(0, max).trim()}…`;
}

type Props = {
  community: Community;
  accent: string;
  joined: boolean;
  onPress: () => void;
  onToggleJoin: () => void;
  /** Softer “discovery” row for New Circles. */
  discovery?: boolean;
  /** Optional second line under member count (e.g. post count / online). */
  activityHint?: string | null;
};

export function CircleCardCompact({
  community,
  accent,
  joined,
  onPress,
  onToggleJoin,
  discovery,
  activityHint,
}: Props) {
  const blurb = useMemo(() => oneLine(community.description), [community.description]);

  return (
    <View style={[styles.row, discovery && styles.rowDiscovery]}>
      <TouchableOpacity style={styles.main} onPress={onPress} activeOpacity={0.82}>
        <View style={[styles.iconWrap, { shadowColor: accent + '55' }]}>
          <LinearGradient colors={[accent + '42', accent + '10']} style={styles.iconInner}>
            <Text style={styles.emoji}>{community.icon}</Text>
          </LinearGradient>
          {discovery ? (
            <View style={styles.spark}>
              <Ionicons name="sparkles" size={11} color={colors.primary.gold} />
            </View>
          ) : null}
        </View>
        <View style={styles.textCol}>
          <View style={styles.nameRow}>
            {discovery ? (
              <View style={styles.newPill}>
                <Text style={styles.newPillText}>New</Text>
              </View>
            ) : null}
            <Text style={styles.name} numberOfLines={1}>
              {community.name}
            </Text>
          </View>
          <Text style={styles.desc} numberOfLines={1}>
            {blurb}
          </Text>
          <Text style={styles.meta}>
            {formatCount(community.memberCount)} members
            {typeof community.postCount === 'number' && community.postCount > 0
              ? ` · ${formatCount(community.postCount)} posts`
              : ''}
            {typeof community.onlineCount === 'number' && community.onlineCount > 0
              ? ` · ${community.onlineCount} online`
              : ''}
            {discovery ? ' · explore' : ''}
          </Text>
          {activityHint ? <Text style={styles.activityHint}>{activityHint}</Text> : null}
        </View>
      </TouchableOpacity>
      <JoinButton joined={joined} onToggle={onToggleJoin} compact />
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 10,
    paddingVertical: 2,
  },
  rowDiscovery: {
    paddingHorizontal: 10,
    paddingVertical: 8,
    marginBottom: 8,
    borderRadius: borderRadius.xl,
    backgroundColor: 'rgba(255,255,255,0.03)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.06)',
  },
  main: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    minWidth: 0,
  },
  iconWrap: {
    position: 'relative',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.45,
    shadowRadius: 10,
    elevation: 3,
  },
  spark: {
    position: 'absolute',
    top: -4,
    right: -4,
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: colors.dark.bg,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: colors.primary.gold + '44',
  },
  iconInner: {
    width: 50,
    height: 50,
    borderRadius: 25,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: colors.dark.border,
  },
  emoji: { fontSize: 23 },
  textCol: { flex: 1, minWidth: 0 },
  nameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    flexWrap: 'wrap',
  },
  newPill: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
    backgroundColor: colors.primary.teal + '18',
    borderWidth: 1,
    borderColor: colors.primary.teal + '35',
  },
  newPillText: {
    fontSize: 9,
    fontWeight: '900',
    color: colors.primary.teal,
    letterSpacing: 0.6,
    textTransform: 'uppercase',
  },
  name: { flex: 1, fontSize: 15, fontWeight: '800', color: colors.dark.text, minWidth: 0 },
  desc: { fontSize: 12, color: colors.dark.textSecondary, marginTop: 3, lineHeight: 16 },
  meta: { fontSize: 10, fontWeight: '700', color: colors.dark.textMuted, marginTop: 5, letterSpacing: 0.2 },
  activityHint: {
    fontSize: 10,
    fontWeight: '600',
    color: colors.dark.textQuiet,
    marginTop: 3,
    fontStyle: 'italic',
  },
});
