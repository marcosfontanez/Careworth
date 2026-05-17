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
  /** Optional one-line context shown under the title. */
  subtitle?: string;
  /** Commerce hint on Shop Live / selling streams (promo or product). */
  shopBadge?: string;
};

const HERO_HEIGHT = 380;

/**
 * Premium hero card used inside the FeaturedLiveCarousel.
 * Cinematic image fill, gradient scrim, identity row, gold-accented Watch Now CTA.
 */
export function FeaturedLiveCard({ stream, width, onPress, subtitle, shopBadge }: Props) {
  const ctxLine =
    subtitle ??
    [stream.host.role, stream.host.specialty].filter(Boolean).join(' · ');

  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        styles.card,
        { width, height: HERO_HEIGHT },
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
        colors={['rgba(6,14,26,0.05)', 'rgba(6,14,26,0.45)', 'rgba(6,14,26,0.95)']}
        locations={[0, 0.45, 1]}
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
        <Text style={styles.title} numberOfLines={2}>
          {stream.title}
        </Text>
        {stream.description ? (
          <Text style={styles.subtitle} numberOfLines={1}>
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

        <View style={styles.cta}>
          <Text style={styles.ctaText}>Watch Now</Text>
          <View style={styles.ctaIconWrap}>
            <Ionicons name="play" size={11} color={colors.dark.bg} />
          </View>
        </View>
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
  title: {
    ...typography.h1,
    fontSize: 24,
    fontWeight: '800',
    color: colors.dark.text,
    letterSpacing: -0.4,
    lineHeight: 28,
  },
  subtitle: {
    ...typography.body,
    fontSize: 14,
    color: 'rgba(255,255,255,0.78)',
    marginTop: 4,
    letterSpacing: -0.1,
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
    color: colors.dark.text,
    letterSpacing: -0.1,
  },
  context: {
    ...typography.caption,
    fontSize: 12,
    color: 'rgba(255,255,255,0.65)',
    marginTop: 1,
  },
  cta: {
    marginTop: spacing.md + 2,
    alignSelf: 'flex-start',
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingLeft: spacing.lg,
    paddingRight: 6,
    paddingVertical: 6,
    borderRadius: borderRadius.full,
    backgroundColor: 'rgba(8,12,20,0.65)',
    borderWidth: 1,
    borderColor: colors.primary.gold + 'AA',
  },
  ctaText: {
    ...typography.button,
    fontSize: 13,
    fontWeight: '800',
    color: colors.primary.gold,
    letterSpacing: 0.1,
  },
  ctaIconWrap: {
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: colors.primary.gold,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
