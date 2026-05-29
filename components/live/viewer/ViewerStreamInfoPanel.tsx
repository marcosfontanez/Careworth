import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import {
  PulseButton,
  PulseCard,
  PulseChip,
  PulseSectionHeader,
} from '@/components/ui/pulse';
import { pulseColors, pulseRadius, pulseSpacing, pulseTypography } from '@/lib/theme/pulseTheme';
import type { CreatorSummary } from '@/types';

type Props = {
  host: CreatorSummary;
  streamTitle?: string;
  viewerCount: number;
  welcomeMessage?: string;
  isFollowing: boolean;
  canFollow: boolean;
  onToggleFollow: () => void;
  onShare?: () => void;
  onOpenLeaderboard?: () => void;
  showLeaderboard?: boolean;
  onOpenQna?: () => void;
  qnaAvailable?: boolean;
  onReportStream?: () => void;
  onBlockHost?: () => void;
  /** Open the host's Pulse Page. When omitted the host name is not tappable. */
  onOpenHostProfile?: () => void;
  signedIn?: boolean;
};

function LinkRow({
  icon,
  label,
  onPress,
  accent = 'default',
}: {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  onPress: () => void;
  accent?: 'default' | 'teal' | 'gift' | 'purple';
}) {
  const iconColor =
    accent === 'gift'
      ? pulseColors.gift
      : accent === 'purple'
        ? pulseColors.purple
        : pulseColors.teal;

  return (
    <Pressable onPress={onPress} style={[styles.linkRow, linkAccent[accent]]}>
      <Ionicons name={icon} size={18} color={iconColor} />
      <Text style={styles.linkTxt}>{label}</Text>
      <Ionicons name="chevron-forward" size={16} color={pulseColors.mutedText} />
    </Pressable>
  );
}

/** Stream info + safety actions for the viewer More sheet. */
export function ViewerStreamInfoPanel({
  host,
  streamTitle,
  viewerCount,
  welcomeMessage,
  isFollowing,
  canFollow,
  onToggleFollow,
  onShare,
  onOpenLeaderboard,
  showLeaderboard,
  onOpenQna,
  qnaAvailable = true,
  onReportStream,
  onBlockHost,
  onOpenHostProfile,
  signedIn,
}: Props) {
  return (
    <View style={styles.wrap}>
      <PulseCard variant="glass">
        {onOpenHostProfile ? (
          <Pressable
            onPress={onOpenHostProfile}
            accessibilityRole="button"
            accessibilityLabel={`Open ${host.displayName}'s Pulse Page`}
            hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}
          >
            <Text style={styles.hostName}>{host.displayName}</Text>
            {host.username ? <Text style={styles.handle}>@{host.username}</Text> : null}
          </Pressable>
        ) : (
          <>
            <Text style={styles.hostName}>{host.displayName}</Text>
            {host.username ? <Text style={styles.handle}>@{host.username}</Text> : null}
          </>
        )}
        {streamTitle ? <Text style={styles.streamTitle}>{streamTitle}</Text> : null}
        <PulseChip
          label={`${viewerCount.toLocaleString()} watching`}
          tone="muted"
          icon="eye-outline"
          style={styles.watchChip}
        />
        {canFollow ? (
          <PulseButton
            label={isFollowing ? 'Following' : 'Follow host'}
            variant={isFollowing ? 'secondary' : 'primary'}
            onPress={onToggleFollow}
            style={styles.followBtn}
          />
        ) : null}
      </PulseCard>

      {welcomeMessage ? (
        <PulseCard variant="default">
          <View style={styles.welcomeRow}>
            <Ionicons name="heart-outline" size={16} color={pulseColors.teal} />
            <Text style={styles.cardBody}>{welcomeMessage}</Text>
          </View>
        </PulseCard>
      ) : null}

      {onShare ? <LinkRow icon="share-social-outline" label="Share stream" onPress={onShare} accent="purple" /> : null}

      {qnaAvailable && onOpenQna ? (
        <LinkRow icon="help-circle-outline" label="Questions & answers" onPress={onOpenQna} accent="teal" />
      ) : null}

      {showLeaderboard && onOpenLeaderboard ? (
        <LinkRow icon="ribbon-outline" label="View top supporters" onPress={onOpenLeaderboard} accent="gift" />
      ) : null}

      {signedIn ? (
        <View style={styles.safetySection}>
          <PulseSectionHeader title="Safety" />
          {onReportStream ? (
            <LinkRow icon="flag-outline" label="Report stream" onPress={onReportStream} accent="teal" />
          ) : null}
          {onBlockHost ? (
            <Pressable onPress={onBlockHost} style={styles.actionRowDanger}>
              <Ionicons name="ban-outline" size={18} color={pulseColors.danger} />
              <Text style={styles.actionTxtDanger}>Block host</Text>
            </Pressable>
          ) : null}
        </View>
      ) : (
        <Text style={styles.signInHint}>Sign in to report or block.</Text>
      )}
    </View>
  );
}

const linkAccent = StyleSheet.create({
  default: { borderColor: pulseColors.border },
  teal: { borderColor: pulseColors.borderAccent },
  gift: { borderColor: 'rgba(246, 196, 83, 0.28)' },
  purple: { borderColor: 'rgba(139, 92, 246, 0.28)' },
});

const styles = StyleSheet.create({
  wrap: { gap: pulseSpacing.md, paddingBottom: pulseSpacing.sm },
  hostName: { ...pulseTypography.sectionTitle },
  handle: { ...pulseTypography.caption },
  streamTitle: { ...pulseTypography.bodySmall, marginTop: pulseSpacing.xs },
  watchChip: { marginTop: pulseSpacing.sm },
  followBtn: { marginTop: pulseSpacing.md, alignSelf: 'flex-start' },
  welcomeRow: { flexDirection: 'row', gap: pulseSpacing.sm, alignItems: 'flex-start' },
  cardBody: { ...pulseTypography.bodySmall, flex: 1, lineHeight: 20 },
  linkRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: pulseSpacing.sm,
    paddingVertical: pulseSpacing.md,
    paddingHorizontal: pulseSpacing.md,
    borderRadius: pulseRadius.lg,
    backgroundColor: pulseColors.glass,
    borderWidth: 1,
  },
  linkTxt: { ...pulseTypography.bodySmall, flex: 1, fontWeight: '700', color: pulseColors.text },
  safetySection: { gap: pulseSpacing.sm, marginTop: pulseSpacing.xs },
  actionRowDanger: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: pulseSpacing.sm,
    paddingVertical: pulseSpacing.md,
    paddingHorizontal: pulseSpacing.md,
    borderRadius: pulseRadius.lg,
    backgroundColor: 'rgba(69, 10, 10, 0.42)',
    borderWidth: 1,
    borderColor: 'rgba(248, 113, 113, 0.28)',
  },
  actionTxtDanger: { ...pulseTypography.bodySmall, fontWeight: '700', color: pulseColors.danger },
  signInHint: { ...pulseTypography.caption, textAlign: 'center' },
});
