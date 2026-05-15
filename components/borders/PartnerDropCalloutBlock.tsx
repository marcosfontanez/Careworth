import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { borderRadius, colors } from '@/theme';
import { openWebUrlSafely } from '@/lib/safeExternalLink';
import { BORDER_CTA } from '@/lib/borders/cta';
import type { BorderSponsorMeta } from '@/lib/borders/category';

export type PartnerDropCalloutBlockProps = {
  sponsor: BorderSponsorMeta;
  /** Compact two-line layout for cards. */
  compact?: boolean;
};

/**
 * "Brought to you by {Brand}" panel for advertiser-sponsored borders.
 * Strict separation from charity tone (violet vs. gold).
 */
export function PartnerDropCalloutBlock({ sponsor, compact }: PartnerDropCalloutBlockProps) {
  const open = () => {
    if (!sponsor.campaignUrl) return;
    openWebUrlSafely(sponsor.campaignUrl);
  };

  return (
    <LinearGradient
      colors={['rgba(167,139,250,0.18)', 'rgba(167,139,250,0.05)']}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
      style={[styles.card, compact && styles.cardCompact]}
    >
      <View style={styles.header}>
        <View style={styles.iconWrap}>
          <Ionicons name="megaphone" size={compact ? 16 : 18} color="#DDD6FE" />
        </View>
        <View style={{ flex: 1, minWidth: 0 }}>
          <Text style={styles.kicker}>Partner drop</Text>
          <Text style={styles.partner} numberOfLines={2}>
            Brought to you by {sponsor.brandName}
          </Text>
        </View>
      </View>
      {sponsor.campaignLabel ? (
        <Text style={[styles.body, compact && styles.bodyCompact]} numberOfLines={compact ? 2 : 4}>
          {sponsor.campaignLabel}
        </Text>
      ) : (
        <Text style={[styles.body, compact && styles.bodyCompact]}>
          A free, time-limited piece sponsored by {sponsor.brandName}.
        </Text>
      )}
      {sponsor.campaignUrl ? (
        <TouchableOpacity onPress={open} activeOpacity={0.85} style={styles.cta}>
          <Ionicons name="open-outline" size={14} color="#DDD6FE" />
          <Text style={styles.ctaText}>{BORDER_CTA.visitPartner}</Text>
        </TouchableOpacity>
      ) : null}
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: borderRadius.xl,
    borderWidth: 1,
    borderColor: 'rgba(167,139,250,0.42)',
    padding: 14,
    gap: 10,
  },
  cardCompact: { padding: 10, gap: 6 },
  header: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  iconWrap: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(167,139,250,0.18)',
    borderWidth: 1,
    borderColor: 'rgba(167,139,250,0.42)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  kicker: {
    fontSize: 10,
    fontWeight: '900',
    color: '#DDD6FE',
    letterSpacing: 1.4,
    textTransform: 'uppercase',
  },
  partner: {
    marginTop: 2,
    fontSize: 15,
    fontWeight: '900',
    color: colors.dark.text,
    letterSpacing: -0.2,
  },
  body: {
    fontSize: 13,
    lineHeight: 19,
    color: 'rgba(232,225,253,0.9)',
  },
  bodyCompact: { fontSize: 12, lineHeight: 17 },
  cta: {
    alignSelf: 'flex-start',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: 'rgba(221,214,254,0.45)',
    backgroundColor: 'rgba(221,214,254,0.08)',
  },
  ctaText: { fontSize: 12, fontWeight: '900', color: '#DDD6FE', letterSpacing: 0.3 },
});
