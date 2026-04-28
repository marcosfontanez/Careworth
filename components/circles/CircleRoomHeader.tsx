import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Platform } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { colors, borderRadius } from '@/theme';
import { formatCount } from '@/utils/format';
import type { CircleAccent } from '@/lib/circleAccents';

type Props = {
  insetTop: number;
  iconEmoji: string;
  name: string;
  description: string;
  memberCount: number;
  onlineCount: number;
  isJoined: boolean;
  accent: CircleAccent;
  showShare: boolean;
  onBack: () => void;
  onShare: () => void;
  onMore: () => void;
  onJoin: () => void;
  onCreatePost: () => void;
};

/**
 * Premium room banner. Built to feel like the curated mockup:
 *
 *  - Tall hero (taller than a generic header) so the room name and icon
 *    have proper presence
 *  - 3-stop saturated gradient (light core → mid → very dark base) so the
 *    bottom edge can fade into the surrounding dark UI without a hard line
 *  - Stacked overlays: subtle radial-ish highlight behind the icon, top
 *    sheen, bottom darken, and decorative motif specks
 *  - Icon bubble sits in a glow ring + drop shadow (so it reads as lit,
 *    not pasted onto the gradient)
 *  - Stats are presented as soft glass pills rather than plain inline text
 *    — pulls the look away from a typical mobile sub-header
 *  - Join + Create Post buttons get distinct treatments (light pill vs.
 *    dark slate pill) so the primary action reads at a glance
 */
export function CircleRoomHeader({
  insetTop,
  iconEmoji,
  name,
  description,
  memberCount,
  onlineCount,
  isJoined,
  accent,
  showShare,
  onBack,
  onShare,
  onMore,
  onJoin,
  onCreatePost,
}: Props) {
  return (
    <View style={{ position: 'relative' }}>
      <LinearGradient
        colors={accent.gradient as unknown as readonly [string, string, ...string[]]}
        locations={[0, 0.55, 1]}
        style={[styles.banner, { paddingTop: insetTop + 10 }]}
      >
        {/* Layered overlays — each layer adds dimension without an SVG.
            (1) very subtle top sheen, (2) wider radial-style hot spot
            behind the icon, (3) bottom darken so the hero blends into the
            page below it. Pointer events are disabled across all so taps
            still pass through to the buttons. */}
        <LinearGradient
          colors={['rgba(255,255,255,0.12)', 'rgba(255,255,255,0)']}
          style={styles.sheen}
          pointerEvents="none"
        />
        <View style={styles.haloWrap} pointerEvents="none">
          <View style={[styles.halo, { backgroundColor: 'rgba(255,255,255,0.10)' }]} />
        </View>
        <LinearGradient
          colors={['rgba(0,0,0,0)', 'rgba(0,0,0,0.55)']}
          style={styles.fade}
          pointerEvents="none"
        />

        {/* Decorative motif specks — purely visual, very low opacity. */}
        {accent.motif && accent.motif.length > 0 ? (
          <View pointerEvents="none" style={StyleSheet.absoluteFill}>
            {MOTIF_POSITIONS.slice(0, accent.motif.length).map((pos, i) => (
              <Text
                key={i}
                style={[
                  styles.motif,
                  pos,
                  { transform: [{ rotate: pos.rotate ?? '0deg' }] },
                ]}
              >
                {accent.motif![i]}
              </Text>
            ))}
          </View>
        ) : null}

        <View style={styles.nav}>
          <TouchableOpacity onPress={onBack} style={styles.navBtn} hitSlop={6}>
            <Ionicons name="arrow-back" size={22} color={colors.onVideo.primary} />
          </TouchableOpacity>
          <View style={styles.navRight}>
            {showShare && (
              <TouchableOpacity onPress={onShare} style={styles.navBtn} hitSlop={6}>
                <Ionicons name="share-outline" size={20} color={colors.onVideo.primary} />
              </TouchableOpacity>
            )}
            <TouchableOpacity onPress={onMore} style={styles.navBtn} hitSlop={6}>
              <Ionicons name="ellipsis-horizontal" size={20} color={colors.onVideo.primary} />
            </TouchableOpacity>
          </View>
        </View>

        <View style={styles.identity}>
          <View style={styles.iconColumn}>
            {/* Outer faint ring + soft inner glow + bubble — three layers of
                depth so the icon reads as elevated, not flat. */}
            <View style={styles.iconRing}>
              <View style={styles.iconGlow}>
                <View style={styles.iconBubble}>
                  <Text style={styles.iconText}>{iconEmoji}</Text>
                </View>
              </View>
            </View>
          </View>
          <View style={{ flex: 1, minWidth: 0 }}>
            <Text style={styles.name} numberOfLines={1}>{name}</Text>
            <Text style={styles.desc} numberOfLines={2}>{description}</Text>
          </View>
        </View>

        {/* Inline member/online row — moved out of glass pills into a single
            quiet stat strip. Pills were starting to read as separate buttons,
            which competed with the actual buttons below. The stat strip
            stays informational and lets the eye land on the CTAs. */}
        <View style={styles.statsRow}>
          <Ionicons name="people" size={14} color={colors.onVideo.emphasis} />
          <Text style={styles.statValue}>{formatCount(memberCount)}</Text>
          <Text style={styles.statLabel}>members</Text>
          <View style={styles.statSep} />
          <View style={styles.onlineDot} />
          <Text style={styles.statValue}>{onlineCount}</Text>
          <Text style={styles.statLabel}>online now</Text>
        </View>

        {/* Action row — joined state now reads as a quiet, confirmed glass
            pill (so it doesn't compete with Create Post for attention).
            Create Post stays the hero with a subtle accent-tinted glass
            instead of the dark slate, so the room's color identity
            extends into the primary CTA. */}
        <View style={styles.actions}>
          <TouchableOpacity
            style={[styles.joinBtn, isJoined && styles.joinedBtn]}
            onPress={onJoin}
            activeOpacity={0.85}
          >
            <Ionicons
              name={isJoined ? 'checkmark-circle' : 'add'}
              size={isJoined ? 17 : 16}
              color={isJoined ? colors.onVideo.primary : accent.color}
            />
            <Text style={[styles.joinText, { color: isJoined ? colors.onVideo.primary : accent.color }]}>
              {isJoined ? 'Joined' : 'Join'}
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.createBtn}
            onPress={onCreatePost}
            activeOpacity={0.9}
          >
            <LinearGradient
              colors={['rgba(0,0,0,0.55)', 'rgba(0,0,0,0.30)']}
              start={{ x: 0, y: 0 }}
              end={{ x: 0, y: 1 }}
              style={styles.createGradient}
            >
              <Ionicons name="create-outline" size={16} color={colors.onVideo.primary} />
              <Text style={styles.createText}>Create Post</Text>
            </LinearGradient>
          </TouchableOpacity>
        </View>
      </LinearGradient>

      {/* Halo bleed — short accent fade just below the banner so the
          highlights row sits in a soft pool of the room's color rather
          than against a hard cut to the dark page. Tiny detail, big lift. */}
      <LinearGradient
        colors={[`${accent.color}26`, `${accent.color}00`]}
        style={styles.bleed}
        pointerEvents="none"
      />
    </View>
  );
}

/**
 * Pre-computed positions for decorative motif glyphs. Right-side drift to
 * avoid colliding with the icon/name on the left. Tiny rotations make them
 * feel hand-placed rather than gridded.
 */
const MOTIF_POSITIONS: Array<{
  top: number;
  right: number;
  fontSize: number;
  opacity: number;
  rotate?: string;
}> = [
  { top: 70, right: 18, fontSize: 22, opacity: 0.20, rotate: '8deg' },
  { top: 110, right: 64, fontSize: 14, opacity: 0.24, rotate: '-12deg' },
  { top: 154, right: 28, fontSize: 18, opacity: 0.18, rotate: '20deg' },
  { top: 188, right: 88, fontSize: 12, opacity: 0.22, rotate: '0deg' },
];

const styles = StyleSheet.create({
  banner: {
    paddingHorizontal: 16,
    paddingBottom: 22,
    overflow: 'hidden',
  },
  sheen: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 110,
  },
  /** Approximated radial highlight using a soft circular blur behind the
   *  icon. Positioned to drift slightly off-center so it doesn't look
   *  like a spotlight. */
  haloWrap: {
    position: 'absolute',
    top: -40,
    left: -20,
    width: 240,
    height: 240,
    alignItems: 'center',
    justifyContent: 'center',
  },
  halo: {
    width: 240,
    height: 240,
    borderRadius: 120,
    opacity: 0.55,
  },
  fade: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: 80,
  },
  motif: {
    position: 'absolute',
    color: '#FFFFFF',
    fontWeight: '900',
  },

  nav: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  navBtn: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: 'rgba(0,0,0,0.32)',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: 'rgba(255,255,255,0.14)',
  },
  navRight: { flexDirection: 'row', gap: 8 },

  identity: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
    marginBottom: 14,
  },
  iconColumn: { alignItems: 'center', justifyContent: 'center' },
  /** Outer thin rim ring. Adds a hairline edge so the bubble reads as a
   *  lit medallion rather than a flat dot. */
  iconRing: {
    width: 96,
    height: 96,
    borderRadius: 48,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.18)',
    backgroundColor: 'rgba(255,255,255,0.04)',
  },
  iconGlow: {
    width: 84,
    height: 84,
    borderRadius: 42,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255,255,255,0.10)',
    /* Drop shadow for the bubble itself — pulls it forward off the gradient. */
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 8 },
        shadowOpacity: 0.50,
        shadowRadius: 16,
      },
      android: { elevation: 12 },
      default: {},
    }),
  },
  iconBubble: {
    width: 70,
    height: 70,
    borderRadius: 35,
    backgroundColor: 'rgba(0,0,0,0.22)',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1.5,
    borderColor: 'rgba(255,255,255,0.32)',
  },
  iconText: { fontSize: 36 },
  name: {
    fontSize: 26,
    fontWeight: '900',
    color: colors.onVideo.primary,
    letterSpacing: -0.5,
  },
  desc: {
    fontSize: 13.5,
    color: colors.onVideo.emphasis,
    lineHeight: 19,
    marginTop: 5,
    /* Slight optical weight so the description reads as a confident tag
       line rather than secondary metadata. */
    fontWeight: '500',
  },

  /** Inline stat strip. Reads quieter than glass pills and lets the
   *  primary CTAs below get the visual weight they deserve. */
  statsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 16,
  },
  statValue: { fontSize: 13, fontWeight: '800', color: colors.onVideo.primary },
  statLabel: { fontSize: 12, color: colors.onVideo.mutedStrong, fontWeight: '600' },
  statSep: {
    width: 3,
    height: 3,
    borderRadius: 1.5,
    backgroundColor: colors.onVideo.mutedStrong,
    marginHorizontal: 6,
    opacity: 0.65,
  },
  onlineDot: {
    width: 7,
    height: 7,
    borderRadius: 3.5,
    backgroundColor: '#22C55E',
    /* Soft glow ring so "online now" reads as a live indicator on darker
       gradients, not just a flat dot. */
    ...Platform.select({
      ios: {
        shadowColor: '#22C55E',
        shadowOffset: { width: 0, height: 0 },
        shadowOpacity: 0.7,
        shadowRadius: 4,
      },
      android: { elevation: 0 },
      default: {},
    }),
  },

  actions: { flexDirection: 'row', gap: 10 },
  joinBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    backgroundColor: 'rgba(255,255,255,0.96)',
    borderRadius: borderRadius.button ?? 24,
    paddingVertical: 12,
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.22,
        shadowRadius: 8,
      },
      android: { elevation: 4 },
      default: {},
    }),
  },
  joinedBtn: {
    backgroundColor: 'rgba(255,255,255,0.14)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.30)',
    /* Joined is a confirmed state, not a primary CTA — kill the lift so
       it stops competing with Create Post for visual weight. */
    shadowOpacity: 0,
    elevation: 0,
  },
  joinText: { fontSize: 14, fontWeight: '800', letterSpacing: 0.1 },
  /** Create Post — wrapper holds the elevation, inner gradient holds
   *  the fill. The double-stop dark gradient gives the button a real
   *  surface (not just a flat color) so it reads premium against the
   *  banner gradient without breaking room identity. */
  createBtn: {
    flex: 1.05,
    borderRadius: borderRadius.button ?? 24,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.16)',
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.34,
        shadowRadius: 8,
      },
      android: { elevation: 4 },
      default: {},
    }),
  },
  createGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 12,
  },
  createText: { fontSize: 14, fontWeight: '800', color: colors.onVideo.primary, letterSpacing: 0.1 },

  /** Halo bleed under the banner — soft accent fade so the page beneath
   *  inherits a hint of the room's color before settling into dark. */
  bleed: {
    position: 'absolute',
    bottom: -28,
    left: 0,
    right: 0,
    height: 28,
  },
});
