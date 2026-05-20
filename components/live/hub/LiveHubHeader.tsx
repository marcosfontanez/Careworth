import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Pressable } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { PROFILE_NEON_BORDER_PRESETS } from '@/components/mypage/ProfileNeonPills';
import { colors, borderRadius, spacing, typography } from '@/theme';

const GO_LIVE_NEON = PROFILE_NEON_BORDER_PRESETS[2];

export type LiveHubHeaderProps = {
  compact: boolean;
  onSearch: () => void;
  onBell: () => void;
  onGoLive: () => void;
};

/**
 * PulseVerse Live tab header — premium lockup + collapse on scroll (subtitle / brand hide when compact).
 */
export function LiveHubHeader({ compact, onSearch, onBell, onGoLive }: LiveHubHeaderProps) {
  return (
    <View style={[styles.header, compact && styles.headerCompact]}>
      <TouchableOpacity onPress={onSearch} hitSlop={12} style={styles.headerSideBtn} accessibilityLabel="Search">
        <Ionicons name="search-outline" size={22} color={colors.dark.textSecondary} />
      </TouchableOpacity>

      <View style={styles.headerCenter}>
        <View style={styles.headerTitleBlock}>
          {!compact ? <Text style={styles.headerBrand}>PULSEVERSE</Text> : null}
          <View style={styles.headerTitleRow}>
            <View style={[styles.headerLivePill, compact && styles.headerLivePillCompact]} accessibilityLabel="Live broadcasts">
              <View style={styles.headerLivePulse} />
              <Text style={styles.headerLivePillTxt}>LIVE</Text>
            </View>
          </View>
          {!compact ? (
            <Text style={styles.headerSubtitle}>Discover · Learn · Shop</Text>
          ) : null}
        </View>
      </View>

      <View style={styles.headerRight}>
        <TouchableOpacity onPress={onBell} hitSlop={10} accessibilityLabel="Notifications">
          <Ionicons name="notifications-outline" size={compact ? 20 : 21} color={colors.dark.textSecondary} />
        </TouchableOpacity>
        <Pressable
          style={({ pressed }) => [pressed && styles.goLiveNeonPressed]}
          onPress={onGoLive}
          accessibilityLabel="Go Live"
        >
          <LinearGradient
            colors={[GO_LIVE_NEON[0], GO_LIVE_NEON[1]]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={[styles.goLiveNeonRing, compact && styles.goLiveNeonRingCompact]}
          >
            <View style={[styles.goLiveNeonInner, compact && styles.goLiveNeonInnerCompact]}>
              <Text style={[styles.goLiveNeonText, compact && styles.goLiveNeonTextCompact]}>Go Live</Text>
            </View>
          </LinearGradient>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.dark.borderSubtle,
  },
  headerCompact: {
    paddingVertical: spacing.xs + 2,
  },
  headerSideBtn: { width: 40, height: 40, alignItems: 'center', justifyContent: 'center' },
  headerCenter: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitleBlock: { alignItems: 'center', maxWidth: '78%' },
  headerBrand: {
    fontSize: 9,
    fontWeight: '800',
    color: colors.dark.textMuted,
    letterSpacing: 2.4,
    marginBottom: 2,
    textAlign: 'center',
  },
  headerTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
  },
  headerLivePill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 9,
    paddingVertical: 4,
    borderRadius: borderRadius.sm,
    backgroundColor: 'rgba(239,68,68,0.22)',
    borderWidth: 1,
    borderColor: 'rgba(252,165,165,0.45)',
  },
  headerLivePulse: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#FCA5A5',
  },
  headerLivePillTxt: {
    fontSize: 10,
    fontWeight: '900',
    color: '#FEE2E2',
    letterSpacing: 1,
  },
  headerLivePillCompact: {
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  headerSubtitle: {
    ...typography.caption,
    fontSize: 11,
    fontWeight: '600',
    color: colors.dark.textMuted,
    marginTop: 3,
    letterSpacing: 0.15,
    textAlign: 'center',
  },
  headerRight: { flexDirection: 'row', alignItems: 'center', gap: spacing.lg },
  goLiveNeonPressed: { opacity: 0.92 },
  goLiveNeonRing: {
    borderRadius: borderRadius.full,
    padding: 2,
  },
  goLiveNeonRingCompact: {
    padding: 1.5,
  },
  goLiveNeonInner: {
    paddingHorizontal: spacing.md,
    paddingVertical: 8,
    borderRadius: borderRadius.full,
    backgroundColor: 'rgba(6,14,26,0.94)',
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: 'rgba(255,255,255,0.12)',
  },
  goLiveNeonInnerCompact: {
    paddingHorizontal: spacing.sm + 2,
    paddingVertical: 6,
  },
  goLiveNeonText: {
    ...typography.button,
    fontSize: 12,
    fontWeight: '900',
    color: '#A5F3FC',
    letterSpacing: 0.25,
  },
  goLiveNeonTextCompact: {
    fontSize: 11,
  },
});
