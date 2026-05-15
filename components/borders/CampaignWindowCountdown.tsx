import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import type { ShopItemRow } from '@/lib/shop/types';
import { readCampaignWindow, useCampaignCountdown, formatCampaignWindow } from '@/lib/borders/campaignWindow';

export type CampaignWindowCountdownProps = {
  item: ShopItemRow;
  /** When true, show the live "Xd Yh left" countdown (re-renders); else static "Until May 31". */
  live?: boolean;
  variant?: 'chip' | 'inline';
};

export function CampaignWindowCountdown({ item, live, variant = 'chip' }: CampaignWindowCountdownProps) {
  const win = readCampaignWindow(item);
  const liveLabel = useCampaignCountdown(live && win.isOpen ? win.expiresAt : null);
  if (!win.expiresAt && !win.isUpcoming) return null;

  let text: string | null = null;
  let tone: 'open' | 'warn' | 'closed' | 'upcoming' = 'open';

  if (win.isClosed) {
    text = formatCampaignWindow(item);
    tone = 'closed';
  } else if (win.isUpcoming) {
    text = formatCampaignWindow(item);
    tone = 'upcoming';
  } else if (live && liveLabel) {
    text = liveLabel;
    tone = liveLabel.includes('Closes') || /^\d+m left/.test(liveLabel) ? 'warn' : 'open';
  } else {
    text = formatCampaignWindow(item);
    tone = 'open';
  }

  if (!text) return null;

  const palette =
    tone === 'closed'
      ? { fg: '#94A3B8', bg: 'rgba(71,85,105,0.32)', bd: 'rgba(148,163,184,0.32)', icon: 'time' as const }
      : tone === 'upcoming'
        ? { fg: '#A5F3FC', bg: 'rgba(34,211,238,0.10)', bd: 'rgba(34,211,238,0.35)', icon: 'calendar-outline' as const }
        : tone === 'warn'
          ? { fg: '#FCD34D', bg: 'rgba(245,158,11,0.14)', bd: 'rgba(245,158,11,0.45)', icon: 'flame' as const }
          : { fg: '#BBF7D0', bg: 'rgba(34,197,94,0.12)', bd: 'rgba(34,197,94,0.42)', icon: 'time-outline' as const };

  if (variant === 'inline') {
    return (
      <View style={styles.inlineRow}>
        <Ionicons name={palette.icon} size={13} color={palette.fg} />
        <Text style={[styles.inlineText, { color: palette.fg }]}>{text}</Text>
      </View>
    );
  }

  return (
    <View style={[styles.chip, { backgroundColor: palette.bg, borderColor: palette.bd }]}>
      <Ionicons name={palette.icon} size={11} color={palette.fg} style={{ marginRight: 5 }} />
      <Text style={[styles.chipText, { color: palette.fg }]}>{text}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 999,
    borderWidth: 1,
    alignSelf: 'flex-start',
  },
  chipText: { fontSize: 11, fontWeight: '900', letterSpacing: 0.3 },
  inlineRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  inlineText: { fontSize: 12, fontWeight: '700' },
});
