import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Image } from 'expo-image';
import { Ionicons } from '@expo/vector-icons';
import { colors, typography, pulseverse } from '@/theme';
import { pulseImageListThumbProps } from '@/lib/pulseImage';
import { RoleBadge } from '@/components/ui/RoleBadge';
import { SpecialtyBadge } from '@/components/ui/SpecialtyBadge';
import { formatCount } from '@/utils/format';
import type { LiveModeType } from '@/types/liveHub';
import type { CreatorSummary } from '@/types';
import { liveModeLabel } from '@/components/live/hub/HubDiscoveryCards';

export function DemoLiveViewerTopBar({
  viewerCount,
  onClose,
  onClip,
}: {
  viewerCount: number;
  onClose: () => void;
  onClip: () => void;
}) {
  return (
    <View style={styles.topBar}>
      <TouchableOpacity onPress={onClose} style={styles.iconBtn} accessibilityLabel="Close">
        <Ionicons name="close" size={22} color="#FFF" />
      </TouchableOpacity>
      <View style={styles.topCenter}>
        <View style={styles.liveBadge}>
          <View style={styles.livePulse} />
          <Text style={styles.liveText}>LIVE</Text>
        </View>
        <View style={styles.viewerBadge}>
          <Ionicons name="eye-outline" size={14} color={colors.dark.textSecondary} />
          <Text style={styles.viewerText}>{formatCount(viewerCount)}</Text>
        </View>
      </View>
      <TouchableOpacity onPress={onClip} style={styles.iconBtn} accessibilityLabel="Clip">
        <Ionicons name="cut-outline" size={20} color="#FFF" />
      </TouchableOpacity>
    </View>
  );
}

export function DemoLiveSessionBlock({
  mode,
  title,
  host,
  viewerUserId,
  isFollowing,
  onToggleFollow,
  gamingCaption,
}: {
  mode: LiveModeType;
  title: string;
  host: CreatorSummary;
  viewerUserId: string | undefined;
  isFollowing: boolean;
  onToggleFollow: () => void;
  gamingCaption: React.ReactNode | null;
}) {
  const subtitle =
    mode === 'irl' ? (
      <Text style={styles.modeSubtitle}>Walk-with-me · on-shift IRL</Text>
    ) : mode === 'casual' ? (
      <Text style={styles.modeSubtitle}>Hangout, Q&A, lifestyle</Text>
    ) : mode === 'shop' ? (
      <Text style={styles.modeSubtitle}>Live shopping · disclosures on</Text>
    ) : mode === 'learn' ? (
      <Text style={styles.modeSubtitle}>Structured session · tabs below</Text>
    ) : mode === 'gaming' ? (
      <Text style={styles.modeSubtitle}>Gameplay · respectful chat</Text>
    ) : null;

  return (
    <View style={styles.sessionBlock}>
      <View style={styles.modeRow}>
        <Text style={styles.modeLbl}>{liveModeLabel(mode)}</Text>
        {gamingCaption}
      </View>
      <Text style={styles.sessionTitle} numberOfLines={3}>
        {title}
      </Text>
      {subtitle}

      <View style={styles.creatorRow}>
        <Image
          source={{ uri: host.avatarUrl }}
          style={styles.creatorAvatar}
          {...pulseImageListThumbProps}
        />
        <View style={styles.creatorMeta}>
          <View style={styles.creatorNameRow}>
            <Text style={styles.creatorName} numberOfLines={1}>
              {host.displayName}
            </Text>
            {host.isVerified ? (
              <Ionicons name="checkmark-circle" size={15} color={colors.primary.teal} />
            ) : null}
          </View>
          <View style={styles.badgeRow}>
            <RoleBadge role={host.role} size="sm" variant="overlay" />
            <SpecialtyBadge specialty={host.specialty} />
          </View>
        </View>
        {viewerUserId && viewerUserId !== host.id ? (
          <TouchableOpacity
            style={[styles.followBtn, isFollowing && styles.followBtnActive]}
            onPress={onToggleFollow}
          >
            <Text style={[styles.followBtnText, isFollowing && styles.followBtnTextActive]}>
              {isFollowing ? 'Following' : 'Follow'}
            </Text>
          </TouchableOpacity>
        ) : null}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 10,
  },
  iconBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(0,0,0,0.35)',
  },
  topCenter: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  liveBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 8,
    backgroundColor: 'rgba(239,68,68,0.28)',
    borderWidth: 1,
    borderColor: 'rgba(252,165,165,0.45)',
  },
  livePulse: { width: 6, height: 6, borderRadius: 3, backgroundColor: '#FCA5A5' },
  liveText: { fontSize: 11, fontWeight: '900', color: '#FFF', letterSpacing: 1 },
  viewerBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 999,
    backgroundColor: 'rgba(15,23,42,0.55)',
  },
  viewerText: { fontSize: 12, fontWeight: '700', color: colors.dark.textSecondary },

  sessionBlock: { paddingHorizontal: 14 },
  modeRow: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 6 },
  modeLbl: {
    fontSize: 11,
    fontWeight: '900',
    color: pulseverse.electric,
    letterSpacing: 1.2,
    textTransform: 'uppercase',
  },
  sessionTitle: { ...typography.h3, fontSize: 20, color: '#FFF', marginBottom: 10 },
  modeSubtitle: {
    ...typography.caption,
    fontSize: 12,
    fontWeight: '600',
    color: 'rgba(226,232,240,0.82)',
    marginBottom: 10,
    marginTop: -4,
  },
  creatorRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  creatorAvatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.2)',
  },
  creatorMeta: { flex: 1 },
  creatorNameRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  creatorName: { ...typography.h3, fontSize: 15, color: '#FFF' },
  badgeRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: 4 },
  followBtn: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.35)',
    backgroundColor: 'rgba(0,0,0,0.25)',
  },
  followBtnActive: { borderColor: colors.primary.teal + '88', backgroundColor: 'rgba(56,189,248,0.15)' },
  followBtnText: { fontSize: 12, fontWeight: '800', color: '#FFF' },
  followBtnTextActive: { color: colors.primary.teal },
});
