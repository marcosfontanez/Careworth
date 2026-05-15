import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { borderRadius, colors } from '@/theme';
import { openWebUrlSafely } from '@/lib/safeExternalLink';
import { BORDER_CTA } from '@/lib/borders/cta';
import type { BorderCharityMeta } from '@/lib/borders/category';

export type CharityCalloutBlockProps = {
  charity: BorderCharityMeta;
  /** Compact two-line layout for cards; default (false) is detail-modal sized. */
  compact?: boolean;
};

/**
 * "A portion of every claim supports {Partner Cause}" panel.
 * Used inside BorderDetailModal and (compact) on charity hero tiles.
 */
export function CharityCalloutBlock({ charity, compact }: CharityCalloutBlockProps) {
  const open = () => {
    if (!charity.donationUrl) return;
    openWebUrlSafely(charity.donationUrl);
  };

  return (
    <LinearGradient
      colors={['rgba(212,166,58,0.18)', 'rgba(212,166,58,0.05)']}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
      style={[styles.card, compact && styles.cardCompact]}
    >
      <View style={styles.header}>
        <View style={styles.iconWrap}>
          <Ionicons name="heart" size={compact ? 16 : 18} color="#FDE68A" />
        </View>
        <View style={{ flex: 1, minWidth: 0 }}>
          <Text style={styles.kicker}>Charity drop</Text>
          <Text style={styles.partner} numberOfLines={2}>
            {charity.partnerName}
          </Text>
        </View>
      </View>
      {charity.proceedsDescription ? (
        <Text style={[styles.body, compact && styles.bodyCompact]} numberOfLines={compact ? 2 : 4}>
          {charity.proceedsDescription}
        </Text>
      ) : (
        <Text style={[styles.body, compact && styles.bodyCompact]}>
          A portion of every claim supports {charity.partnerName}.
        </Text>
      )}
      {charity.donationUrl ? (
        <TouchableOpacity onPress={open} activeOpacity={0.85} style={styles.cta}>
          <Ionicons name="open-outline" size={14} color="#FDE68A" />
          <Text style={styles.ctaText}>{BORDER_CTA.supportCause}</Text>
        </TouchableOpacity>
      ) : null}
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: borderRadius.xl,
    borderWidth: 1,
    borderColor: 'rgba(212,166,58,0.42)',
    padding: 14,
    gap: 10,
  },
  cardCompact: { padding: 10, gap: 6 },
  header: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  iconWrap: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(212,166,58,0.18)',
    borderWidth: 1,
    borderColor: 'rgba(212,166,58,0.42)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  kicker: {
    fontSize: 10,
    fontWeight: '900',
    color: '#FDE68A',
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
    color: 'rgba(248,232,196,0.9)',
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
    borderColor: 'rgba(253,230,138,0.45)',
    backgroundColor: 'rgba(253,230,138,0.08)',
  },
  ctaText: { fontSize: 12, fontWeight: '900', color: '#FDE68A', letterSpacing: 0.3 },
});
