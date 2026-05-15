import React, { useMemo } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Platform } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { colors, borderRadius, pulseverse, pvKit } from '@/theme';
import { formatCount } from '@/utils/format';
import type { Community } from '@/types';
import { JoinButton } from './JoinButton';

const GLASS = pvKit.circles.glassList;

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

  const softLift =
    Platform.OS === 'ios'
      ? {
          shadowColor: '#020617',
          shadowOffset: { width: 0, height: 5 },
          shadowOpacity: 0.3,
          shadowRadius: 10,
        }
      : { elevation: 3 };

  const inner = (
    <>
      <TouchableOpacity style={styles.main} onPress={onPress} activeOpacity={0.88}>
        <View style={[styles.iconWrap, { shadowColor: `${accent}66` }]}>
          <LinearGradient colors={[`${accent}55`, `${accent}18`]} style={[styles.iconInner, discovery && styles.iconInnerDiscovery]}>
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
          <Text style={styles.desc} numberOfLines={2}>
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
    </>
  );

  if (discovery) {
    return (
      <LinearGradient
        colors={[GLASS.fillTop, GLASS.fillBottom]}
        style={[styles.row, styles.rowDiscovery, softLift]}
      >
        <LinearGradient
          colors={['rgba(34,211,238,0.07)', 'transparent']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={StyleSheet.absoluteFill}
          pointerEvents="none"
        />
        {inner}
      </LinearGradient>
    );
  }

  return <View style={styles.row}>{inner}</View>;
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 12,
    paddingVertical: 2,
  },
  rowDiscovery: {
    paddingHorizontal: 14,
    paddingVertical: 12,
    marginBottom: 12,
    borderRadius: borderRadius['2xl'],
    borderWidth: 1,
    borderColor: GLASS.border,
    overflow: 'hidden',
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
    borderColor: `${colors.primary.gold}55`,
  },
  iconInner: {
    width: 50,
    height: 50,
    borderRadius: 25,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(34,211,238,0.2)',
  },
  iconInnerDiscovery: {
    borderWidth: 1.5,
    borderColor: `${colors.primary.gold}88`,
  },
  emoji: { fontSize: 23 },
  textCol: { flex: 1, minWidth: 0 },
  nameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    flexWrap: 'wrap',
  },
  newPill: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: borderRadius.sm,
    backgroundColor: 'rgba(34,211,238,0.1)',
    borderWidth: 1,
    borderColor: `${pulseverse.electric}66`,
  },
  newPillText: {
    fontSize: 9,
    fontWeight: '900',
    color: pulseverse.electricSoft,
    letterSpacing: 1,
    textTransform: 'uppercase',
  },
  name: { flex: 1, fontSize: 16, fontWeight: '800', color: colors.dark.text, minWidth: 0, letterSpacing: -0.25 },
  desc: { fontSize: 12, color: colors.dark.textSecondary, marginTop: 4, lineHeight: 17 },
  meta: {
    fontSize: 11,
    fontWeight: '700',
    color: pulseverse.electricMuted,
    marginTop: 6,
    letterSpacing: 0.15,
  },
  activityHint: {
    fontSize: 10,
    fontWeight: '600',
    color: colors.dark.textQuiet,
    marginTop: 4,
    fontStyle: 'italic',
  },
});
