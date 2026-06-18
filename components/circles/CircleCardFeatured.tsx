import React, { useMemo } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Platform } from 'react-native';
import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { BlurView } from 'expo-blur';
import { featuredCardSchemeForSlug } from '@/constants/featuredCircleSchemes';
import { borderRadius, colors, pulseverse, spacing, pvKit, rhythm } from '@/theme';
import { formatCount } from '@/utils/format';
import type { Community } from '@/types';
import { pulseImageListThumbProps } from '@/lib/pulseImage';

/** Tall enough for 2-line title + 2-line blurb + meta + avatar stack without clipping (fixed height + overflow:hidden). */
const CARD_HEIGHT = rhythm.carouselCardHeight;
const BUBBLE = 82;
const CARD_WIDTH = rhythm.carouselCardWidth;

const TOP_WASH_ALPHA = Math.round(pvKit.circles.featured.topWashOpacity * 255)
  .toString(16)
  .padStart(2, '0');

function blurbOneLine(s: string, max = 52) {
  const t = s.replace(/\s+/g, ' ').trim();
  if (t.length <= max) return t;
  return `${t.slice(0, max).trim()}…`;
}

type Props = {
  community: Community;
  accent: string;
  onPress: () => void;
  /** Position in featured carousel — unknown slugs cycle primary → secondary → neon, then repeat. */
  carouselIndex?: number;
};

export function CircleCardFeatured({ community, accent, onPress, carouselIndex = 0 }: Props) {
  const scheme = useMemo(
    () =>
      featuredCardSchemeForSlug(community.slug, accent || pulseverse.electric, carouselIndex),
    [community.slug, accent, carouselIndex],
  );

  const tag = useMemo(() => blurbOneLine(community.description), [community.description]);

  const avatars = (community.presenceAvatars ?? []).slice(0, 5).filter(Boolean);
  const online = Math.max(0, community.onlineCount ?? 0);
  const shownFaces = Math.min(avatars.length, 5);
  const restOnline = Math.max(0, online - shownFaces);

  const { featured } = pvKit.circles;
  const rimHex = `${scheme.glow}${featured.borderAlpha}`;

  const softLift =
    Platform.OS === 'ios'
      ? {
          shadowColor: scheme.glow,
          shadowOffset: { width: 0, height: featured.shadowOffsetY },
          shadowOpacity: featured.shadowOpacity,
          shadowRadius: featured.shadowRadius,
        }
      : { elevation: 6 };

  const auraGlow =
    Platform.OS === 'ios'
      ? {
          shadowColor: scheme.glow,
          shadowOffset: { width: 0, height: 0 },
          shadowOpacity: 0.38,
          shadowRadius: 18,
        }
      : { elevation: 4 };

  const borderW = scheme.borderEmphasis;
  const topWashColor = `${scheme.glow}${TOP_WASH_ALPHA}`;

  return (
    <TouchableOpacity style={styles.outer} activeOpacity={0.9} onPress={onPress}>
      <LinearGradient
        colors={scheme.gradient}
        style={[
          styles.card,
          {
            borderColor: rimHex,
            borderWidth: borderW,
          },
          softLift,
        ]}
      >
        {Platform.OS === 'web' ? (
          <View style={[StyleSheet.absoluteFill, styles.glassWebVeil]} pointerEvents="none" />
        ) : (
          <BlurView intensity={Platform.OS === 'ios' ? 28 : 22} tint="dark" style={styles.blurFill} pointerEvents="none" />
        )}
        <LinearGradient
          colors={[topWashColor, 'transparent']}
          start={{ x: 0.5, y: 0 }}
          end={{ x: 0.5, y: 0.55 }}
          style={styles.topWash}
          pointerEvents="none"
        />
        <LinearGradient
          colors={['rgba(255,255,255,0.42)', 'rgba(255,255,255,0.12)', 'transparent']}
          locations={[0, 0.22, 1]}
          start={{ x: 0.5, y: 0 }}
          end={{ x: 0.5, y: 1 }}
          style={styles.topShimmer}
          pointerEvents="none"
        />
        <LinearGradient
          colors={[...pvKit.cards.bottomVignette]}
          start={{ x: 0.5, y: 0.38 }}
          end={{ x: 0.5, y: 1 }}
          style={styles.bottomVig}
          pointerEvents="none"
        />
        <View style={styles.innerHairline} pointerEvents="none" />

        <View style={[styles.glowRing, auraGlow]}>
          <LinearGradient
            colors={scheme.bubble}
            style={[styles.iconBubble, { borderColor: `${scheme.glow}88` }]}
          >
            <Text style={styles.emoji}>{community.icon}</Text>
          </LinearGradient>
        </View>

        <Text style={styles.name} numberOfLines={2}>
          {community.name}
        </Text>
        <Text style={styles.tag} numberOfLines={2}>
          {tag}
        </Text>
        <Text style={styles.meta}>{formatCount(community.memberCount)} members</Text>

        <View style={styles.presenceRow}>
          {avatars.map((uri, i) => (
            <View key={`${uri}-${i}`} style={[styles.avatarSlot, { zIndex: 10 - i, marginLeft: i === 0 ? 0 : -10 }]}>
              <Image
                source={{ uri }}
                style={styles.avatarImg}
                contentFit="cover"
                {...pulseImageListThumbProps}
              />
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
              <Text style={styles.firstOnline}>Be the first online</Text>
            )}
          </View>
        </View>
      </LinearGradient>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  outer: { width: CARD_WIDTH },
  card: {
    borderRadius: borderRadius['3xl'],
    paddingHorizontal: spacing.lg,
    paddingTop: 16,
    paddingBottom: 20,
    minHeight: CARD_HEIGHT,
    justifyContent: 'flex-start',
    overflow: 'hidden',
  },
  blurFill: {
    ...StyleSheet.absoluteFillObject,
    borderRadius: borderRadius['3xl'],
  },
  glassWebVeil: {
    backgroundColor: 'rgba(15,23,42,0.22)',
    borderRadius: borderRadius['3xl'],
  },
  topWash: {
    ...StyleSheet.absoluteFillObject,
    height: '52%',
    borderTopLeftRadius: borderRadius['3xl'],
    borderTopRightRadius: borderRadius['3xl'],
  },
  topShimmer: {
    position: 'absolute',
    left: 0,
    right: 0,
    top: 0,
    height: '30%',
    borderTopLeftRadius: borderRadius['3xl'],
    borderTopRightRadius: borderRadius['3xl'],
  },
  bottomVig: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    height: '58%',
    borderBottomLeftRadius: borderRadius['3xl'],
    borderBottomRightRadius: borderRadius['3xl'],
  },
  innerHairline: {
    ...StyleSheet.absoluteFillObject,
    borderRadius: borderRadius['3xl'],
    borderWidth: 1,
    borderColor: pvKit.cards.innerHairline,
    margin: 1,
    opacity: 0.95,
    pointerEvents: 'none',
  },
  glowRing: {
    alignSelf: 'center',
    marginBottom: 10,
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
    fontSize: 42,
    transform: [{ scale: 1.06 }],
  },
  name: {
    fontSize: 17,
    fontWeight: '900',
    color: colors.dark.text,
    textAlign: 'center',
    letterSpacing: -0.5,
    lineHeight: 21,
  },
  tag: {
    fontSize: 13,
    lineHeight: 18,
    color: colors.dark.textSecondary,
    textAlign: 'center',
    marginTop: 6,
    fontWeight: '500',
  },
  meta: {
    fontSize: 13,
    fontWeight: '800',
    color: pulseverse.electricSoft,
    textAlign: 'center',
    marginTop: 8,
    letterSpacing: 0.15,
  },
  presenceRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 12,
    marginBottom: 2,
    flexWrap: 'wrap',
    paddingHorizontal: 4,
    paddingBottom: 6,
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
  firstOnline: {
    fontSize: 11,
    fontWeight: '600',
    color: pvKit.circles.firstOnline,
    letterSpacing: 0.15,
  },
  plusMore: {
    fontSize: 11,
    fontWeight: '700',
    color: colors.dark.textSecondary,
  },
});
