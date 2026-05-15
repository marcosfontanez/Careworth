import React from 'react';
import {
  View,
  Text,
  Pressable,
  StyleSheet,
  Platform,
  type StyleProp,
  type ViewStyle,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { colors } from '@/theme/colors';
import { spacing, pulseverse, pvKit, pvGlassDepthShadow, pvCardRimBloom } from '@/theme';

const GL = pvKit.circles.glassList;
const CK = pvKit.cards.circle;
const META = pvKit.cards.meta;

export type PVCircleCardProps = {
  title: string;
  subtitle?: string;
  meta?: string;
  metaSecondary?: string;
  footerHint?: string;
  badge?: React.ReactNode;
  trailing?: React.ReactNode;
  ctaSlot?: React.ReactNode;
  leading?: React.ReactNode;
  accent?: string;
  onPress?: () => void;
  style?: StyleProp<ViewStyle>;
  testID?: string;
};

function plateColors(accent?: string): [string, string] {
  if (accent) {
    return [`${accent}55`, `${accent}18`];
  }
  return [CK.iconFillTop, CK.iconFillBottom];
}

function plateBorder(accent?: string): string {
  if (accent) return `${accent}AA`;
  return CK.iconBorder;
}

/** Social / circle row — layered glass, collectible rim, independent trailing CTA hit target. */
export function PVCircleCard({
  title,
  subtitle,
  meta,
  metaSecondary,
  footerHint,
  badge,
  trailing,
  ctaSlot,
  leading,
  accent,
  onPress,
  style,
  testID,
}: PVCircleCardProps) {
  const aura =
    Platform.OS === 'ios'
      ? {
          shadowColor: accent ?? pulseverse.electric,
          shadowOpacity: CK.auraOpacity.ios,
          shadowRadius: CK.auraRadius.ios,
          shadowOffset: { width: 0, height: 0 },
        }
      : { elevation: 5 };

  const body = (
    <View
      style={[styles.outer, pvGlassDepthShadow(), pvCardRimBloom(accent ?? pulseverse.electric), style]}
      testID={testID}
    >
      <LinearGradient
        colors={[GL.fillTop, GL.fillMid, GL.fillBottom]}
        locations={[0, 0.5, 1]}
        start={{ x: 0.5, y: 0 }}
        end={{ x: 0.5, y: 1 }}
        style={styles.fill}
      >
        <LinearGradient
          colors={[...pvKit.cards.topSheen]}
          start={{ x: 0.5, y: 0 }}
          end={{ x: 0.5, y: 1 }}
          style={styles.topSheen}
          pointerEvents="none"
        />
        <LinearGradient
          colors={[...pvKit.cards.sideSheen]}
          start={{ x: 0, y: 0.5 }}
          end={{ x: 1, y: 0.5 }}
          style={styles.edgeSheen}
          pointerEvents="none"
        />
        <LinearGradient
          colors={[...pvKit.cards.bottomVignette]}
          start={{ x: 0.5, y: 0.4 }}
          end={{ x: 0.5, y: 1 }}
          style={styles.floorVig}
          pointerEvents="none"
        />

        <View style={styles.pad}>
          <View style={styles.row}>
            {onPress ? (
              <Pressable
                style={styles.mainHit}
                onPress={onPress}
                accessibilityRole="button"
                accessibilityLabel={title}
              >
                <View style={styles.mainInner}>
                  {leading ? (
                    <View style={[styles.aura, aura]}>
                      <LinearGradient
                        colors={plateColors(accent)}
                        style={[styles.iconPlate, { borderColor: plateBorder(accent) }]}
                      >
                        {leading}
                      </LinearGradient>
                    </View>
                  ) : null}
                  <View style={styles.copy}>
                    {badge ? <View style={styles.badgeMount}>{badge}</View> : null}
                    <Text style={styles.title} numberOfLines={2}>
                      {title}
                    </Text>
                    {subtitle ? (
                      <Text style={styles.subtitle} numberOfLines={2}>
                        {subtitle}
                      </Text>
                    ) : null}
                    {meta || metaSecondary ? (
                      <View style={styles.metaRow}>
                        {meta ? (
                          <Text style={styles.metaPrimary} numberOfLines={1}>
                            {meta}
                          </Text>
                        ) : null}
                        {meta && metaSecondary ? <Text style={styles.metaDot}>·</Text> : null}
                        {metaSecondary ? (
                          <Text style={styles.metaSecondary} numberOfLines={1}>
                            {metaSecondary}
                          </Text>
                        ) : null}
                      </View>
                    ) : null}
                    {footerHint ? (
                      <Text style={styles.footerHint} numberOfLines={2}>
                        {footerHint}
                      </Text>
                    ) : null}
                    {ctaSlot ? <View style={styles.ctaMount}>{ctaSlot}</View> : null}
                  </View>
                </View>
              </Pressable>
            ) : (
              <View style={styles.mainHit}>
                <View style={styles.mainInner}>
                  {leading ? (
                    <View style={[styles.aura, aura]}>
                      <LinearGradient
                        colors={plateColors(accent)}
                        style={[styles.iconPlate, { borderColor: plateBorder(accent) }]}
                      >
                        {leading}
                      </LinearGradient>
                    </View>
                  ) : null}
                  <View style={styles.copy}>
                    {badge ? <View style={styles.badgeMount}>{badge}</View> : null}
                    <Text style={styles.title} numberOfLines={2}>
                      {title}
                    </Text>
                    {subtitle ? (
                      <Text style={styles.subtitle} numberOfLines={2}>
                        {subtitle}
                      </Text>
                    ) : null}
                    {meta || metaSecondary ? (
                      <View style={styles.metaRow}>
                        {meta ? (
                          <Text style={styles.metaPrimary} numberOfLines={1}>
                            {meta}
                          </Text>
                        ) : null}
                        {meta && metaSecondary ? <Text style={styles.metaDot}>·</Text> : null}
                        {metaSecondary ? (
                          <Text style={styles.metaSecondary} numberOfLines={1}>
                            {metaSecondary}
                          </Text>
                        ) : null}
                      </View>
                    ) : null}
                    {footerHint ? (
                      <Text style={styles.footerHint} numberOfLines={2}>
                        {footerHint}
                      </Text>
                    ) : null}
                    {ctaSlot ? <View style={styles.ctaMount}>{ctaSlot}</View> : null}
                  </View>
                </View>
              </View>
            )}
            {trailing ? <View style={styles.trail}>{trailing}</View> : null}
          </View>
        </View>

        <View style={styles.hairline} pointerEvents="none" />
      </LinearGradient>
    </View>
  );

  return body;
}

const styles = StyleSheet.create({
  outer: {
    borderRadius: CK.radius,
    borderWidth: 1,
    borderColor: GL.border,
    overflow: 'hidden',
    backgroundColor: colors.dark.card,
  },
  fill: { borderRadius: CK.radius, position: 'relative' },
  topSheen: {
    position: 'absolute',
    left: 0,
    right: 0,
    top: 0,
    height: '52%',
    borderTopLeftRadius: CK.radius,
    borderTopRightRadius: CK.radius,
  },
  edgeSheen: {
    position: 'absolute',
    left: 0,
    top: 0,
    bottom: 0,
    width: '38%',
    borderTopLeftRadius: CK.radius,
    borderBottomLeftRadius: CK.radius,
    opacity: 0.92,
  },
  floorVig: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    height: '55%',
    borderBottomLeftRadius: CK.radius,
    borderBottomRightRadius: CK.radius,
  },
  hairline: {
    ...StyleSheet.absoluteFillObject,
    borderRadius: CK.radius,
    borderWidth: 1,
    borderColor: pvKit.cards.innerHairline,
    margin: 1,
    opacity: 0.98,
  },
  pad: { padding: spacing.xl },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.lg,
  },
  mainHit: { flex: 1, minWidth: 0 },
  mainInner: { flexDirection: 'row', alignItems: 'flex-start', gap: spacing.lg },
  aura: { marginTop: 2 },
  iconPlate: {
    width: CK.iconSize,
    height: CK.iconSize,
    borderRadius: CK.iconRadius,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    overflow: 'hidden',
  },
  copy: { flex: 1, minWidth: 0 },
  badgeMount: { alignSelf: 'flex-start', marginBottom: spacing.md },
  title: {
    color: colors.dark.text,
    fontSize: 18,
    fontWeight: '900',
    letterSpacing: -0.45,
    lineHeight: 23,
  },
  subtitle: {
    marginTop: spacing.md,
    color: colors.dark.textSecondary,
    fontSize: 14,
    fontWeight: '500',
    lineHeight: 20,
  },
  metaRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    gap: spacing.md,
    marginTop: spacing.lg,
  },
  metaPrimary: {
    fontSize: 13,
    fontWeight: '800',
    letterSpacing: 0.15,
    color: pulseverse.electricSoft,
  },
  metaDot: {
    fontSize: 13,
    color: colors.dark.textMuted,
    opacity: 0.7,
  },
  metaSecondary: {
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 0.02,
    color: META.engagement,
    flexShrink: 1,
  },
  footerHint: {
    marginTop: spacing.md,
    fontSize: 12,
    fontWeight: '600',
    lineHeight: 16,
    color: pvKit.circles.firstOnline,
    letterSpacing: 0.12,
  },
  ctaMount: { marginTop: spacing.lg },
  trail: { alignSelf: 'center' },
});
