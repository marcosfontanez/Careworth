import React from 'react';
import { View, Text, Pressable, StyleSheet, Platform } from 'react-native';
import { Image } from 'expo-image';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { colors, borderRadius, spacing, typography, shadows } from '@/theme';
import { pulseImageFeedHeroProps, pulseImageListThumbProps } from '@/lib/pulseImage';
import { LivePill } from './LivePill';
import { LiveViewerBadge } from './LiveViewerBadge';
import type { LiveStream } from '@/types';

type Props = {
  stream: LiveStream;
  width: number;
  onPress: () => void;
  /** Learn / Shop Live / Circle Live / … pill above title. */
  categoryLabel?: string;
  /** Optional one-line context shown under the title. */
  subtitle?: string;
  /** Commerce hint on Shop Live / selling streams (promo or product). */
  shopBadge?: string;
  /** `compact` matches denser marketing mockups; default is full cinematic height. */
  variant?: 'hero' | 'compact';
};

const HERO_HEIGHTS = { hero: 400, compact: 312 } as const;

/**
 * Premium hero card used inside the FeaturedLiveCarousel.
 * Cinematic image fill, gradient scrim, identity row, gold-accented Watch Now CTA.
 */
export function FeaturedLiveCard({
  stream,
  width,
  onPress,
  categoryLabel,
  subtitle,
  shopBadge,
  variant = 'hero',
}: Props) {
  const ctxLine =
    subtitle ??
    [stream.host.role, stream.host.specialty].filter(Boolean).join(' · ');
  const cardH = HERO_HEIGHTS[variant];

  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        styles.card,
        { width, height: cardH },
        pressed && styles.pressed,
      ]}
      accessibilityRole="button"
      accessibilityLabel={`Open live stream: ${stream.title}`}
    >
      <Image
        source={{ uri: stream.thumbnailUrl }}
        style={StyleSheet.absoluteFill}
        contentFit="cover"
        transition={150}
        {...pulseImageFeedHeroProps}
      />
      <LinearGradient
        colors={['rgba(6,14,26,0.08)', 'rgba(6,14,26,0.42)', 'rgba(6,14,26,0.97)']}
        locations={[0, 0.38, 1]}
        style={StyleSheet.absoluteFill}
      />

      <View style={styles.topRow}>
        <View style={styles.topLeftStack}>
          <LivePill />
          {shopBadge ? (
            <View style={styles.shopBadge}>
              <Ionicons name="bag-handle" size={12} color={colors.primary.gold} />
              <Text style={styles.shopBadgeTxt} numberOfLines={1}>
                {shopBadge}
              </Text>
            </View>
          ) : null}
        </View>
        <LiveViewerBadge count={stream.viewerCount} />
      </View>

      <View style={styles.bottom}>
        {categoryLabel ? (
          <View style={styles.categoryPill}>
            <Text style={styles.categoryPillTxt}>{categoryLabel}</Text>
          </View>
        ) : null}
        <Text style={styles.title} numberOfLines={2}>
          {stream.title}
        </Text>
        {stream.description ? (
          <Text style={styles.subtitle} numberOfLines={2}>
            {stream.description}
          </Text>
        ) : null}

        <View style={styles.identityRow}>
          <Image source={{ uri: stream.host.avatarUrl }} style={styles.avatar} {...pulseImageListThumbProps} />
          <View style={styles.identityText}>
            <Text style={styles.name} numberOfLines={1}>
              {stream.host.displayName}
            </Text>
            <Text style={styles.context} numberOfLines={1}>
              {ctxLine}
            </Text>
          </View>
        </View>

        <LinearGradient
          colors={[colors.primary.teal, '#6366F1']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 0 }}
          style={styles.ctaGradient}
        >
          <Text style={styles.ctaText}>Watch Live</Text>
          <View style={styles.ctaIconWrap}>
            <Ionicons name="play" size={11} color="#0B1220" />
          </View>
        </LinearGradient>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: borderRadius['3xl'] - 4,
    overflow: 'hidden',
    backgroundColor: colors.dark.cardAlt,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
    ...Platform.select({
      ios: shadows.lifted,
      android: { elevation: 8 },
      default: {},
    })!,
  },
  pressed: { opacity: 0.96, transform: [{ scale: 0.99 }] },
  topRow: {
    position: 'absolute',
    top: spacing.md,
    left: spacing.md,
    right: spacing.md,
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
  },
  topLeftStack: {
    flexDirection: 'column',
    alignItems: 'flex-start',
    gap: spacing.sm,
    flex: 1,
    marginRight: spacing.md,
  },
  shopBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    maxWidth: '100%',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: borderRadius.full,
    backgroundColor: 'rgba(15,23,42,0.72)',
    borderWidth: 1,
    borderColor: colors.primary.gold + '55',
  },
  shopBadgeTxt: {
    ...typography.caption,
    flex: 1,
    minWidth: 0,
    fontSize: 11,
    fontWeight: '800',
    color: colors.primary.gold,
    letterSpacing: 0.2,
  },
  bottom: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    padding: spacing.lg,
  },
  categoryPill: {
    alignSelf: 'flex-start',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: borderRadius.sm,
    backgroundColor: 'rgba(56,189,248,0.18)',
    borderWidth: 1,
    borderColor: 'rgba(56,189,248,0.45)',
    marginBottom: spacing.sm,
  },
  categoryPillTxt: {
    fontSize: 10,
    fontWeight: '900',
    color: '#A5F3FC',
    letterSpacing: 0.8,
    textTransform: 'uppercase',
  },
  title: {
    ...typography.h1,
    fontSize: 24,
    fontWeight: '800',
    color: '#F8FAFC',
    letterSpacing: -0.4,
    lineHeight: 28,
  },
  subtitle: {
    ...typography.body,
    fontSize: 14,
    color: 'rgba(248,250,252,0.72)',
    marginTop: 6,
    letterSpacing: -0.1,
    lineHeight: 19,
  },
  identityRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm + 2,
    marginTop: spacing.md,
  },
  avatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
    borderWidth: 1.5,
    borderColor: 'rgba(255,255,255,0.35)',
  },
  identityText: { flex: 1, minWidth: 0 },
  name: {
    ...typography.subtitle,
    fontSize: 14,
    fontWeight: '700',
    color: '#F1F5F9',
    letterSpacing: -0.1,
  },
  context: {
    ...typography.caption,
    fontSize: 12,
    color: 'rgba(248,250,252,0.62)',
    marginTop: 1,
  },
  ctaGradient: {
    marginTop: spacing.md + 4,
    alignSelf: 'flex-start',
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingLeft: spacing.lg,
    paddingRight: 7,
    paddingVertical: 10,
    borderRadius: borderRadius.full,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.22)',
    shadowColor: '#6366F1',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.35,
    shadowRadius: 8,
    elevation: 6,
  },
  ctaText: {
    ...typography.button,
    fontSize: 13,
    fontWeight: '800',
    color: '#0B1220',
    letterSpacing: 0.2,
  },
  ctaIconWrap: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: 'rgba(255,255,255,0.92)',
    alignItems: 'center',
    justifyContent: 'center',
  },
});
