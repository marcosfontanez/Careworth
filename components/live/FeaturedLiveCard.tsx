import React, { useMemo, useState } from 'react';
import { View, Text, Pressable, StyleSheet, Platform } from 'react-native';
import { Image } from 'expo-image';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { colors, borderRadius, spacing, typography, shadows } from '@/theme';
import { PulseChip } from '@/components/ui/pulse';
import { pulseColors, pulseGradients, pulseRadius } from '@/lib/theme/pulseTheme';
import { pulseImageFeedHeroProps, pulseImageListThumbProps } from '@/lib/pulseImage';
import { LiveHeroPlaceholder } from '@/components/live/LiveHeroPlaceholder';
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

export const FEATURED_LIVE_HERO_HEIGHT = 420;
export const FEATURED_LIVE_COMPACT_HEIGHT = 320;

const HERO_HEIGHTS = { hero: FEATURED_LIVE_HERO_HEIGHT, compact: FEATURED_LIVE_COMPACT_HEIGHT } as const;

function safeTitle(stream: LiveStream): string {
  const t = stream.title?.trim();
  return t || 'Live on PulseVerse';
}

function safeHostName(stream: LiveStream): string {
  return stream.host?.displayName?.trim() || 'PulseVerse Creator';
}

function safeAvatarUri(stream: LiveStream): string | undefined {
  const uri = stream.host?.avatarUrl?.trim();
  return uri || undefined;
}

function hostInitials(stream: LiveStream): string {
  const name = safeHostName(stream);
  const parts = name.split(/\s+/).filter(Boolean);
  if (parts.length >= 2) return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
  return name.slice(0, 2).toUpperCase() || 'PV';
}

/**
 * Premium hero card for Happening Now — cinematic thumbnail or branded placeholder, full metadata fallbacks.
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
  const [thumbFailed, setThumbFailed] = useState(false);
  const cardH = HERO_HEIGHTS[variant];
  const title = safeTitle(stream);
  const hostName = safeHostName(stream);
  const avatarUri = safeAvatarUri(stream);
  const thumbnailUri = stream.thumbnailUrl?.trim() || '';
  const showThumbnail = Boolean(thumbnailUri) && !thumbFailed;
  const description =
    stream.description?.trim() ||
    subtitle?.trim() ||
    '';

  const tagChips = useMemo(() => {
    const raw = [...(stream.tags ?? [])];
    if (categoryLabel && !raw.some((t) => t.toLowerCase() === categoryLabel.toLowerCase())) {
      raw.unshift(categoryLabel);
    }
    return raw
      .map((t) => t.trim())
      .filter(Boolean)
      .slice(0, 3);
  }, [stream.tags, categoryLabel]);

  const ctxLine =
    subtitle?.trim() ||
    [stream.host?.role, stream.host?.specialty].filter(Boolean).join(' · ') ||
    'Tap to join the conversation';

  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        styles.card,
        { width, height: cardH },
        pressed && styles.pressed,
      ]}
      accessibilityRole="button"
      accessibilityLabel={`Join live stream: ${title}`}
    >
      <View style={styles.inner} collapsable={false}>
        <View style={styles.media} pointerEvents="none">
          {showThumbnail ? (
            <Image
              source={{ uri: thumbnailUri }}
              style={StyleSheet.absoluteFill}
              contentFit="cover"
              transition={180}
              onError={() => setThumbFailed(true)}
              {...pulseImageFeedHeroProps}
            />
          ) : (
            <LiveHeroPlaceholder />
          )}
          <LinearGradient
            colors={['rgba(7, 17, 31, 0.08)', 'rgba(7, 17, 31, 0.55)', 'rgba(7, 17, 31, 0.98)']}
            locations={[0, 0.38, 1]}
            style={StyleSheet.absoluteFill}
          />
          <LinearGradient
            colors={['rgba(56,189,248,0.14)', 'rgba(236,72,153,0.08)', 'transparent']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.accentVeil}
          />
        </View>

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
          <LiveViewerBadge count={Number.isFinite(stream.viewerCount) ? stream.viewerCount : 0} />
        </View>

        <View style={styles.bottomPanel}>
          {tagChips.length > 0 ? (
            <View style={styles.tagRow}>
              {tagChips.map((tag, index) => (
                <View key={`${tag}-${index}`} style={styles.tagChip}>
                  <Text style={styles.tagChipTxt} numberOfLines={1}>
                    {tag}
                  </Text>
                </View>
              ))}
            </View>
          ) : categoryLabel ? (
            <PulseChip label={categoryLabel} tone="premium" style={styles.categoryChip} />
          ) : null}

          <Text style={styles.title} numberOfLines={2}>
            {title}
          </Text>

          {description ? (
            <Text style={styles.description} numberOfLines={2}>
              {description}
            </Text>
          ) : null}

          <View style={styles.hostHeroRow}>
            <View style={styles.avatarRing}>
              {avatarUri ? (
                <Image source={{ uri: avatarUri }} style={styles.avatar} {...pulseImageListThumbProps} />
              ) : (
                <View style={styles.avatarFallback}>
                  <Text style={styles.avatarInitials}>{hostInitials(stream)}</Text>
                </View>
              )}
            </View>
            <View style={styles.identityText}>
              <Text style={styles.hostEyebrow}>Hosted by</Text>
              <Text style={styles.name} numberOfLines={1}>
                {hostName}
              </Text>
              <Text style={styles.context} numberOfLines={1}>
                {ctxLine}
              </Text>
            </View>
          </View>

          <LinearGradient
            colors={[...pulseGradients.primaryCta]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={styles.ctaGradient}
          >
            <Ionicons name="play-circle" size={20} color={pulseColors.onAccent} />
            <Text style={styles.ctaText}>Join Live</Text>
            <View style={styles.ctaIconWrap}>
              <Ionicons name="arrow-forward" size={14} color={pulseColors.teal} />
            </View>
          </LinearGradient>
        </View>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: pulseRadius['3xl'],
    overflow: 'hidden',
    backgroundColor: pulseColors.surface,
    borderWidth: 1,
    borderColor: pulseColors.borderStrong,
    ...Platform.select({
      ios: {
        ...shadows.lifted,
        shadowColor: '#38BDF8',
        shadowOpacity: 0.28,
        shadowRadius: 18,
      },
      android: { elevation: 12 },
      default: {},
    })!,
  },
  inner: {
    flex: 1,
  },
  media: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: pulseColors.background,
  },
  accentVeil: {
    ...StyleSheet.absoluteFillObject,
  },
  pressed: { opacity: 0.96, transform: [{ scale: 0.992 }] },
  topRow: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    paddingTop: spacing.md,
    paddingHorizontal: spacing.md,
    zIndex: 2,
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
  bottomPanel: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.lg,
    paddingTop: spacing.xl,
    zIndex: 2,
    backgroundColor: 'transparent',
  },
  tagRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    marginBottom: spacing.sm,
  },
  tagChip: {
    maxWidth: '46%',
    paddingHorizontal: 9,
    paddingVertical: 4,
    borderRadius: borderRadius.full,
    backgroundColor: 'rgba(15,28,48,0.72)',
    borderWidth: 1,
    borderColor: 'rgba(236,72,153,0.28)',
  },
  tagChipTxt: {
    fontSize: 10,
    fontWeight: '800',
    color: '#FBCFE8',
    letterSpacing: 0.4,
    textTransform: 'uppercase',
  },
  categoryChip: { marginBottom: spacing.sm },
  title: {
    ...typography.h1,
    fontSize: 24,
    fontWeight: '800',
    color: '#F8FAFC',
    letterSpacing: -0.4,
    lineHeight: 28,
    textShadowColor: 'rgba(0,0,0,0.45)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 6,
  },
  description: {
    ...typography.body,
    fontSize: 14,
    color: 'rgba(248,250,252,0.72)',
    marginTop: 6,
    letterSpacing: -0.1,
    lineHeight: 19,
  },
  hostHeroRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    marginTop: spacing.md,
    padding: spacing.sm,
    borderRadius: borderRadius.xl,
    backgroundColor: 'rgba(8,14,28,0.62)',
    borderWidth: 1,
    borderColor: 'rgba(56,189,248,0.22)',
  },
  avatarRing: {
    padding: 3,
    borderRadius: 999,
    borderWidth: 2,
    borderColor: 'rgba(56,189,248,0.55)',
    backgroundColor: 'rgba(15,23,42,0.85)',
  },
  avatar: {
    width: 56,
    height: 56,
    borderRadius: 28,
  },
  avatarFallback: {
    width: 56,
    height: 56,
    borderRadius: 28,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(56,189,248,0.22)',
  },
  avatarInitials: {
    fontSize: 16,
    fontWeight: '800',
    color: '#E0F2FE',
  },
  identityText: { flex: 1, minWidth: 0 },
  hostEyebrow: {
    ...typography.caption,
    fontSize: 10,
    fontWeight: '800',
    color: 'rgba(125,211,252,0.85)',
    letterSpacing: 0.8,
    textTransform: 'uppercase',
    marginBottom: 2,
  },
  name: {
    ...typography.subtitle,
    fontSize: 17,
    fontWeight: '800',
    color: '#F8FAFC',
    letterSpacing: -0.2,
  },
  context: {
    ...typography.caption,
    fontSize: 12,
    color: 'rgba(248,250,252,0.72)',
    marginTop: 3,
  },
  ctaGradient: {
    marginTop: spacing.md,
    width: '100%',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    paddingHorizontal: spacing.lg,
    paddingVertical: 14,
    borderRadius: borderRadius.xl,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.22)',
    shadowColor: '#38BDF8',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.32,
    shadowRadius: 12,
    elevation: 8,
  },
  ctaText: {
    ...typography.button,
    fontSize: 16,
    fontWeight: '800',
    color: pulseColors.onAccent,
    letterSpacing: 0.3,
  },
  ctaIconWrap: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: 'rgba(255,255,255,0.92)',
    alignItems: 'center',
    justifyContent: 'center',
  },
});
