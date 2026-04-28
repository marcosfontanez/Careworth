import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Linking } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '@/theme';
import type { SponsorInfo } from '@/types';

interface Props {
  sponsor: SponsorInfo;
}

export function SponsoredBadge({ sponsor }: Props) {
  return (
    <View style={styles.container}>
      <View style={styles.badge}>
        <Ionicons name="megaphone-outline" size={10} color={colors.dark.textMuted} />
        <Text style={styles.label}>Sponsored</Text>
      </View>
      <Text style={styles.advertiser}>by {sponsor.advertiserName}</Text>
      {sponsor.ctaUrl && (
        <TouchableOpacity
          style={styles.ctaBtn}
          onPress={() => Linking.openURL(sponsor.ctaUrl)}
          activeOpacity={0.7}
        >
          <Text style={styles.ctaText}>{sponsor.ctaLabel || 'Learn More'}</Text>
          <Ionicons name="open-outline" size={12} color="#FFF" />
        </TouchableOpacity>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 6,
  },
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: 'rgba(255,255,255,0.12)',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
  },
  label: {
    fontSize: 10,
    fontWeight: '700',
    color: colors.dark.textMuted,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  advertiser: {
    fontSize: 11,
    color: 'rgba(255,255,255,0.6)',
    fontWeight: '500',
  },
  ctaBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: colors.primary.royal,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
    marginLeft: 'auto',
  },
  ctaText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#FFF',
  },
});
