import React, { useMemo } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Platform } from 'react-native';
import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { featuredCardSchemeForSlug } from '@/constants/featuredCircleSchemes';
import { borderRadius, colors, typography } from '@/theme';
import { formatCount } from '@/utils/format';
import type { Community } from '@/types';

const CARD_HEIGHT = 268;
const BUBBLE = 78;

function blurbOneLine(s: string, max = 52) {
  const t = s.replace(/\s+/g, ' ').trim();
  if (t.length <= max) return t;
  return `${t.slice(0, max).trim()}…`;
}

type Props = {
  community: Community;
  accent: string;
  onPress: () => void;
};

export function CircleCardFeatured({ community, accent, onPress }: Props) {
  const scheme = useMemo(
    () => featuredCardSchemeForSlug(community.slug, accent || colors.primary.teal),
    [community.slug, accent],
  );

  const tag = useMemo(() => blurbOneLine(community.description), [community.description]);

  const avatars = (community.presenceAvatars ?? []).slice(0, 5).filter(Boolean);
  const online = Math.max(0, community.onlineCount ?? 0);
  const shownFaces = Math.min(avatars.length, 5);
  const restOnline = Math.max(0, online - shownFaces);

  const neonShadow =
    Platform.OS === 'ios'
      ? {
          shadowColor: scheme.glow,
          shadowOffset: { width: 0, height: 0 },
          shadowOpacity: 0.88,
          shadowRadius: 22,
        }
      : { elevation: 14 };

  const borderW = scheme.borderEmphasis;

  return (
    <TouchableOpacity style={styles.outer} activeOpacity={0.88} onPress={onPress}>
      <LinearGradient
        colors={scheme.gradient}
        style={[
          styles.card,
          { borderColor: `${scheme.glow}99`, borderWidth: borderW },
          neonShadow,
        ]}
      >
        <View style={[styles.glowRing, { shadowColor: scheme.glow }]}>
          <LinearGradient
            colors={scheme.bubble}
            style={[styles.iconBubble, { borderColor: `${scheme.glow}aa` }]}
          >
            <Text style={styles.emoji}>{community.icon}</Text>
          </LinearGradient>
        </View>

        <Text style={styles.name} numberOfLines={2}>
          {community.name}
        </Text>
        <Text style={styles.tag} numberOfLines={1}>
          {tag}
        </Text>
        <Text style={styles.meta}>{formatCount(community.memberCount)} members</Text>

        <View style={styles.presenceRow}>
          {avatars.map((uri, i) => (
            <View key={`${uri}-${i}`} style={[styles.avatarSlot, { zIndex: 10 - i, marginLeft: i === 0 ? 0 : -10 }]}>
              <Image source={{ uri }} style={styles.avatarImg} contentFit="cover" />
            </View>
          ))}
          <View style={styles.onlineCol}>
            {online > 0 ? (
              <View style={styles.onlineLine}>
                <Text style={[styles.onlineStrong, { color: scheme.onlineAccent }]}>{formatCount(online)}</Text>
                <Text style={styles.onlineMuted}> online</Text>
                {avatars.length > 0 && restOnline > 0 ? (
                  <Text style={styles.plusMore}> · +{formatCount(restOnline)}</Text>
                ) : null}
              </View>
            ) : (
              <Text style={styles.onlineMuted}>Be the first online</Text>
            )}
          </View>
        </View>
      </LinearGradient>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  outer: { width: 174 },
  card: {
    borderRadius: borderRadius['2xl'],
    paddingHorizontal: 12,
    paddingTop: 14,
    paddingBottom: 14,
    height: CARD_HEIGHT,
    justifyContent: 'flex-start',
  },
  glowRing: {
    alignSelf: 'center',
    marginBottom: 10,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.95,
    shadowRadius: 24,
    elevation: 12,
  },
  iconBubble: {
    width: BUBBLE,
    height: BUBBLE,
    borderRadius: BUBBLE / 2,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1.5,
  },
  emoji: {
    fontSize: 40,
    transform: [{ scale: 1.05 }],
  },
  name: {
    ...typography.sectionTitle,
    fontSize: 14,
    fontWeight: '800',
    color: colors.dark.text,
    textAlign: 'center',
    minHeight: 36,
  },
  tag: {
    fontSize: 11,
    lineHeight: 15,
    color: colors.dark.textSecondary,
    textAlign: 'center',
    marginTop: 4,
    opacity: 0.92,
    minHeight: 18,
  },
  meta: {
    fontSize: 11,
    fontWeight: '600',
    color: colors.dark.textMuted,
    textAlign: 'center',
    marginTop: 10,
  },
  presenceRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 12,
    flexWrap: 'wrap',
    paddingHorizontal: 4,
  },
  avatarSlot: {
    width: 28,
    height: 28,
    borderRadius: 14,
    borderWidth: 2,
    borderColor: colors.dark.bg,
    overflow: 'hidden',
    backgroundColor: colors.dark.cardAlt,
  },
  avatarImg: { width: '100%', height: '100%' },
  onlineCol: {
    marginLeft: 8,
    flexShrink: 1,
    justifyContent: 'center',
  },
  onlineLine: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center' },
  onlineStrong: {
    fontSize: 12,
    fontWeight: '800',
  },
  onlineMuted: {
    fontSize: 11,
    fontWeight: '600',
    color: colors.dark.textMuted,
  },
  plusMore: {
    fontSize: 11,
    fontWeight: '700',
    color: colors.dark.textSecondary,
  },
});
