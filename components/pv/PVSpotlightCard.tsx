import React from 'react';
import { View, Text, StyleSheet, Platform, type StyleProp, type ViewStyle } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { colors } from '@/theme/colors';
import { spacing, pulseverse, pvKit } from '@/theme';
import { PVHeroCard } from '@/components/pv/PVHeroCard';
import { PVPrimaryButton } from '@/components/pv/PVPrimaryButton';
import { PVSecondaryButton } from '@/components/pv/PVSecondaryButton';

export type PVSpotlightCardProps = {
  title: string;
  subtitle?: string;
  /** Uppercase micro-label (e.g. NEW) */
  kicker?: string;
  /** Left emblem — avatar / emoji inside your own ring, or pass a framed node */
  leading?: React.ReactNode;
  children?: React.ReactNode;
  /** Status row (Joined chip, live count, etc.) */
  statusSlot?: React.ReactNode;
  ctaTitle?: string;
  onCtaPress?: () => void;
  secondaryCtaTitle?: string;
  onSecondaryCtaPress?: () => void;
  style?: StyleProp<ViewStyle>;
  testID?: string;
};

/** Wide hero spotlight — editorial depth, optional dual CTAs, clear hierarchy. */
export function PVSpotlightCard({
  title,
  subtitle,
  kicker,
  leading,
  children,
  statusSlot,
  ctaTitle,
  onCtaPress,
  secondaryCtaTitle,
  onSecondaryCtaPress,
  style,
  testID,
}: PVSpotlightCardProps) {
  const hasPrimary = Boolean(ctaTitle && onCtaPress);
  const hasSecondary = Boolean(secondaryCtaTitle && onSecondaryCtaPress);

  return (
    <PVHeroCard style={style} contentStyle={styles.heroContent} testID={testID}>
      <LinearGradient
        colors={[...pvKit.cards.topSheen]}
        start={{ x: 0.5, y: 0 }}
        end={{ x: 0.5, y: 1 }}
        style={styles.sheenTop}
        pointerEvents="none"
      />
      <LinearGradient
        colors={['rgba(34,211,238,0.1)', 'transparent']}
        start={{ x: 0, y: 0.5 }}
        end={{ x: 1, y: 0.5 }}
        style={styles.sheenSide}
        pointerEvents="none"
      />
      <LinearGradient
        colors={[...pvKit.cards.bottomVignette]}
        start={{ x: 0.5, y: 0.45 }}
        end={{ x: 0.5, y: 1 }}
        style={styles.floorVig}
        pointerEvents="none"
      />

      <View style={styles.hairline} pointerEvents="none" />

      <View style={styles.foreground}>
        {leading || kicker ? (
          <View style={styles.topBand}>
            {leading ? <View style={styles.leadMount}>{leading}</View> : null}
            {kicker ? (
              <View style={[styles.kickerShell, !leading && styles.kickerShellSolo]}>
                <Text style={pvKit.cards.spotlight.kicker}>{kicker}</Text>
              </View>
            ) : null}
          </View>
        ) : null}

        <Text style={styles.title}>{title}</Text>
        {subtitle ? <Text style={styles.subtitle}>{subtitle}</Text> : null}
        {children ? <View style={styles.slot}>{children}</View> : null}
        {statusSlot ? <View style={styles.status}>{statusSlot}</View> : null}

        {hasPrimary || hasSecondary ? (
          <View style={[styles.ctaRow, hasPrimary && hasSecondary && styles.ctaRowSplit]}>
            {hasSecondary ? (
              <PVSecondaryButton
                title={secondaryCtaTitle!}
                onPress={onSecondaryCtaPress}
                {...(hasPrimary ? { style: styles.ctaFlex } : { style: styles.ctaFull })}
              />
            ) : null}
            {hasPrimary ? (
              <PVPrimaryButton
                title={ctaTitle!}
                onPress={onCtaPress}
                {...(hasSecondary ? { style: styles.ctaFlex } : { style: styles.ctaFull })}
              />
            ) : null}
          </View>
        ) : null}
      </View>
    </PVHeroCard>
  );
}

const styles = StyleSheet.create({
  heroContent: {
    position: 'relative',
    overflow: 'hidden',
  },
  sheenTop: {
    ...StyleSheet.absoluteFillObject,
    height: '52%',
    borderTopLeftRadius: pvKit.card.radiusLarge,
    borderTopRightRadius: pvKit.card.radiusLarge,
  },
  sheenSide: {
    position: 'absolute',
    left: 0,
    top: 0,
    bottom: 0,
    width: '38%',
    borderTopLeftRadius: pvKit.card.radiusLarge,
    borderBottomLeftRadius: pvKit.card.radiusLarge,
    opacity: 0.95,
  },
  floorVig: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    height: '50%',
    borderBottomLeftRadius: pvKit.card.radiusLarge,
    borderBottomRightRadius: pvKit.card.radiusLarge,
  },
  hairline: {
    ...StyleSheet.absoluteFillObject,
    borderRadius: pvKit.card.radiusLarge,
    borderWidth: 1,
    borderColor: pvKit.cards.innerHairline,
    margin: 1,
    opacity: 0.88,
    pointerEvents: 'none',
  },
  foreground: { position: 'relative', zIndex: 1 },
  topBand: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    marginBottom: spacing.md,
  },
  leadMount: {
    padding: 3,
    borderRadius: 999,
    borderWidth: 2,
    borderColor: `${colors.primary.gold}AA`,
    backgroundColor: 'rgba(212,166,58,0.12)',
    ...Platform.select({
      ios: {
        shadowColor: colors.primary.gold,
        shadowOpacity: 0.35,
        shadowRadius: 10,
        shadowOffset: { width: 0, height: 0 },
      },
      default: {},
    }),
  },
  kickerShell: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 11,
    borderWidth: 1.5,
    borderColor: 'rgba(34,211,238,0.58)',
    backgroundColor: 'rgba(34,211,238,0.12)',
    ...Platform.select({
      ios: {
        shadowColor: pulseverse.electric,
        shadowOpacity: 0.32,
        shadowRadius: 8,
        shadowOffset: { width: 0, height: 0 },
      },
      default: {},
    }),
  },
  kickerShellSolo: {
    alignSelf: 'flex-start',
  },
  title: {
    color: colors.dark.text,
    fontSize: 26,
    fontWeight: '900',
    letterSpacing: -0.65,
    lineHeight: 31,
  },
  subtitle: {
    marginTop: spacing.md,
    color: colors.dark.textSecondary,
    fontSize: 15,
    fontWeight: '500',
    lineHeight: 22,
  },
  slot: { marginTop: spacing['2xl'] },
  status: { marginTop: spacing.lg },
  ctaRow: {
    marginTop: spacing.lg,
    gap: spacing.md,
  },
  ctaRowSplit: {
    flexDirection: 'row',
    alignItems: 'stretch',
  },
  ctaFlex: { flex: 1, minWidth: 0 },
  ctaFull: { alignSelf: 'stretch' },
});
