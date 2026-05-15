import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Platform,
  type TextStyle,
  type ViewStyle,
  type ImageStyle,
} from 'react-native';
import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { BlurView } from 'expo-blur';
import { Ionicons } from '@expo/vector-icons';
import { PremiumAnimatedCard } from '@/components/shop/premium/PremiumAnimatedCard';
import { PROFILE_NEON_BORDER_PRESETS } from '@/components/mypage/ProfileNeonPills';
import { borderRadius, layout } from '@/theme';
import { pulseImageListThumbProps } from '@/lib/pulseImage';

/** Pulse Shop bag mark — PNG with alpha (`scripts/knock-out-pulse-shop-bag-bg.mjs` if the source has a black matte). */
const PULSE_SHOP_BAG = require('../../../assets/images/pulse-shop-bag-icon.png');

const serifTitle: TextStyle = {
  fontSize: 30,
  fontWeight: '700',
  letterSpacing: -0.6,
  lineHeight: 36,
  ...(Platform.OS === 'web'
    ? ({ fontFamily: 'Georgia, "Times New Roman", serif' } as const)
    : Platform.OS === 'ios'
      ? { fontFamily: 'Georgia' }
      : { fontFamily: 'serif' }),
};

function FeatureDivider() {
  return <View style={styles.featureDivider} />;
}

function FeatureItem({
  icon,
  label,
}: {
  icon: React.ComponentProps<typeof Ionicons>['name'];
  label: string;
}) {
  return (
    <View style={styles.featureItem}>
      <Ionicons name={icon} size={17} color="#67E8F9" style={styles.featureIcon} />
      <Text style={styles.featureLabel} numberOfLines={1}>
        {label}
      </Text>
    </View>
  );
}

type Props = {
  onPress: () => void;
  /** Pause motion when tab/screen not focused. */
  motionActive?: boolean;
};

/**
 * Pulse Shop hub card — FEATURED kicker, serif title, feature row with rules,
 * bag on soft cyan glow (no pedestal — pedestal is featured-border only). Explore CTA bottom-right.
 */
export function ShopEntryCard({ onPress, motionActive = true }: Props) {
  return (
    <TouchableOpacity
      activeOpacity={0.92}
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel="Explore the Shop"
      accessibilityHint="Opens Pulse Shop"
      style={styles.touchWrap}
    >
      <PremiumAnimatedCard
        ringColors={[PROFILE_NEON_BORDER_PRESETS[2][0], PROFILE_NEON_BORDER_PRESETS[2][1]]}
        backgroundVariant="shopButton"
        intensity="medium"
        motionActive={motionActive}
        sparkBorder
        contentStyle={styles.cardContentShell}
      >
        <View style={styles.layerStack}>
          {Platform.OS === 'web' ? (
            <View style={[StyleSheet.absoluteFill, styles.glassWeb]} />
          ) : (
            <BlurView intensity={48} tint="dark" style={StyleSheet.absoluteFill} />
          )}
          <LinearGradient
            colors={['rgba(6,14,26,0.42)', 'rgba(3,7,18,0.78)', 'rgba(8,15,35,0.65)']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={[StyleSheet.absoluteFill, { zIndex: 0 }]}
            pointerEvents="none"
          />
          <LinearGradient
            colors={['rgba(56,189,248,0.10)', 'rgba(0,0,0,0)', 'rgba(99,102,241,0.09)']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={[StyleSheet.absoluteFill, { zIndex: 0 }]}
            pointerEvents="none"
          />
          <LinearGradient
            colors={['rgba(255,255,255,0.34)', 'rgba(255,255,255,0.08)', 'transparent']}
            locations={[0, 0.18, 1]}
            start={{ x: 0.5, y: 0 }}
            end={{ x: 0.5, y: 1 }}
            style={[styles.cardTopShimmer, { zIndex: 0 }]}
            pointerEvents="none"
          />

          <View style={styles.foregroundStack} pointerEvents="box-none">
            <View style={styles.mainRow}>
              <View style={styles.leftCol}>
                <View style={styles.bagAura}>
                  <View style={styles.bagThinRing}>
                    <Image
                      source={PULSE_SHOP_BAG}
                      style={[styles.bagImg, Platform.OS === 'web' ? styles.bagImgWeb : null]}
                      contentFit="contain"
                      accessibilityLabel="Pulse Shop"
                      {...pulseImageListThumbProps}
                    />
                  </View>
                </View>
              </View>

              <View style={styles.rightCopy}>
                <View style={styles.rightCopyTop}>
                  <View style={styles.kickerPill}>
                    <Text style={styles.kickerText}>Featured</Text>
                  </View>
                  <Text style={styles.titleRow}>
                    <Text style={[styles.titlePulse, serifTitle]}>Pulse </Text>
                    <Text style={[styles.titleShop, serifTitle]}>Shop</Text>
                  </Text>
                  <Text style={styles.subtitle}>Premium borders, rewards and creator extras.</Text>

                  <View style={styles.featureRow}>
                    <FeatureItem icon="shield-checkmark-outline" label="Exclusive Borders" />
                    <FeatureDivider />
                    <FeatureItem icon="gift-outline" label="Creator Rewards" />
                    <FeatureDivider />
                    <FeatureItem icon="diamond-outline" label="Premium Extras" />
                  </View>
                </View>

                <View style={styles.ctaSpacer} />

                <View style={styles.ctaWrap}>
                  <LinearGradient
                    colors={['#0EA5E9', '#22D3EE', '#38BDF8', '#2563EB']}
                    locations={[0, 0.35, 0.65, 1]}
                    start={{ x: 0, y: 0.5 }}
                    end={{ x: 1, y: 0.5 }}
                    style={styles.ctaGrad}
                  >
                    <LinearGradient
                      colors={['rgba(255,255,255,0.45)', 'rgba(255,255,255,0.1)', 'rgba(255,255,255,0)']}
                      locations={[0, 0.35, 1]}
                      start={{ x: 0.5, y: 0 }}
                      end={{ x: 0.5, y: 1 }}
                      style={styles.ctaSheen}
                    />
                    <View style={styles.ctaInner}>
                      <Text style={styles.ctaText}>Explore the Shop</Text>
                      <Text style={styles.ctaChevron}>›</Text>
                    </View>
                  </LinearGradient>
                </View>
              </View>
            </View>
          </View>
        </View>
      </PremiumAnimatedCard>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  touchWrap: {
    marginTop: 0,
    marginBottom: 0,
  },
  cardContentShell: {
    minHeight: 232,
  },
  layerStack: {
    flex: 1,
    minHeight: 232,
    position: 'relative',
    paddingHorizontal: layout.screenPadding + 4,
    paddingTop: 18,
    paddingBottom: 30,
  },
  glassWeb: {
    backgroundColor: 'rgba(15,23,42,0.92)',
    zIndex: 0,
  },
  cardTopShimmer: {
    position: 'absolute',
    left: 0,
    right: 0,
    top: 0,
    height: '34%',
    borderTopLeftRadius: borderRadius['2xl'],
    borderTopRightRadius: borderRadius['2xl'],
  },
  foregroundStack: {
    zIndex: 2,
    width: '100%',
  },
  mainRow: {
    flexDirection: 'row',
    alignItems: 'stretch',
    gap: 14,
    width: '100%',
  },
  leftCol: {
    width: '34%',
    maxWidth: 128,
    minWidth: 100,
    alignItems: 'center',
    justifyContent: 'flex-start',
    paddingTop: 4,
  },
  bagAura: {
    width: 118,
    height: 118,
    borderRadius: 59,
    backgroundColor: 'rgba(34,211,238,0.14)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  bagThinRing: {
    width: 108,
    height: 108,
    borderRadius: 54,
    borderWidth: 2,
    borderColor: 'rgba(103,232,249,0.72)',
    backgroundColor: 'transparent',
    alignItems: 'center',
    justifyContent: 'center',
  },
  bagImg: { width: 72, height: 72 },
  /** Web: drops matte black via CSS blend; RN typings omit `mixBlendMode`. */
  bagImgWeb: Platform.select<ImageStyle>({
    web: { mixBlendMode: 'screen' } as ImageStyle,
    default: {},
  }),
  rightCopy: {
    flex: 1,
    minWidth: 0,
    paddingLeft: 4,
    paddingTop: 2,
  },
  rightCopyTop: {
    flexShrink: 1,
  },
  ctaSpacer: {
    flexGrow: 1,
    flexShrink: 0,
    minHeight: 10,
  },
  ctaWrap: {
    alignSelf: 'flex-end',
    marginTop: 14,
    marginBottom: 2,
  },
  kickerPill: {
    alignSelf: 'flex-start',
    paddingHorizontal: 11,
    paddingVertical: 5,
    borderRadius: borderRadius.full,
    backgroundColor: 'rgba(15,23,42,0.88)',
    borderWidth: 1,
    borderColor: 'rgba(212,166,58,0.42)',
    marginBottom: 10,
  },
  kickerText: {
    fontSize: 9,
    fontWeight: '900',
    color: '#E7C975',
    letterSpacing: 1.6,
    textTransform: 'uppercase',
  },
  titleRow: { marginBottom: 2 },
  titlePulse: {
    color: '#FFFFFF',
  },
  titleShop: {
    color: '#C4B5FD',
  },
  subtitle: {
    marginTop: 6,
    fontSize: 14,
    fontWeight: '500',
    lineHeight: 20,
    color: 'rgba(248,250,252,0.92)',
    letterSpacing: 0.15,
    ...Platform.select({
      web: { fontFamily: 'ui-sans-serif, system-ui, sans-serif' } as const,
      ios: {},
      default: {},
    }),
  },
  featureRow: {
    marginTop: 16,
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    rowGap: 8,
  },
  featureItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 7,
    maxWidth: '100%',
  },
  featureIcon: {
    opacity: 0.95,
  },
  featureLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: 'rgba(248,250,252,0.94)',
    letterSpacing: 0.2,
  },
  featureDivider: {
    width: StyleSheet.hairlineWidth,
    height: 18,
    backgroundColor: 'rgba(148,163,184,0.5)',
    marginHorizontal: 10,
  },
  ctaGrad: {
    borderRadius: borderRadius.full,
    overflow: 'hidden',
    position: 'relative',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.35)',
    ...Platform.select({
      ios: {
        shadowColor: '#38BDF8',
        shadowOpacity: 0.45,
        shadowRadius: 12,
        shadowOffset: { width: 0, height: 3 },
      },
      android: { elevation: 8 },
      default: {},
    }),
  },
  ctaSheen: {
    position: 'absolute',
    left: 0,
    right: 0,
    top: 0,
    height: '50%',
    borderTopLeftRadius: borderRadius.full,
    borderTopRightRadius: borderRadius.full,
  },
  ctaInner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 13,
    paddingHorizontal: 26,
    zIndex: 1,
  },
  ctaText: {
    fontSize: 14,
    fontWeight: '800',
    color: '#FFF',
    letterSpacing: 0.2,
  },
  ctaChevron: {
    fontSize: 22,
    fontWeight: '300',
    color: '#FFF',
    lineHeight: 22,
    marginTop: -1,
  },
});
