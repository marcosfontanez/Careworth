import React, { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  InteractionManager,
  Modal,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { usePathname, useSegments } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as Haptics from 'expo-haptics';
import { Ionicons } from '@expo/vector-icons';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '@/contexts/AuthContext';
import { colors, spacing, typography } from '@/theme';
import { needsLegalAcknowledgment } from '@/lib/legalAck';
import { shopKeys } from '@/lib/shop/queryKeys';
import { shopQueriesService } from '@/services/shop/shopQueries';
import { purchaseService } from '@/services/shop/purchaseService';
import { BorderPreviewPlate } from '@/components/shop/border/BorderPreviewPlate';
import { useAppStore } from '@/store/useAppStore';
import { analytics } from '@/lib/analytics';

const TEAM_COPY = 'From the PulseVerse team. Enjoy!';

function isFeedPath(pathname: string, segments: string[]): boolean {
  const p = pathname || '';
  const norm = p.startsWith('/') || p === '' ? p : `/${p}`;

  if (norm.includes('/feed') || norm.endsWith('feed')) return true;
  if (segments.some((s) => s === 'feed')) return true;

  if (norm.startsWith('/(tabs)') || norm === '(tabs)' || segments.includes('(tabs)')) return true;

  return false;
}

let lastTeamGiftGateUserId: string | null = null;

/**
 * Presents a full-screen “open your gift” flow when staff grant a shop border from the web admin.
 * Inventory is created only after the recipient taps Open (see `economy_accept_pending_border_gift`).
 */
export function PulseVerseTeamBorderGiftGate() {
  const insets = useSafeAreaInsets();
  const qc = useQueryClient();
  const segments = useSegments();
  const pathname = usePathname() ?? '';

  const { user, profile, isAuthenticated } = useAuth();
  const betaTesterBorderBlocking = useAppStore((s) => s.betaTesterBorderBlocking);
  const pulseMonthCelebrationBlocking = useAppStore((s) => s.pulseMonthCelebrationBlocking);
  const setTeamBorderGiftBlocking = useAppStore((s) => s.setTeamBorderGiftBlocking);

  const inAuth = segments.some((s) => s === 'auth') || pathname.startsWith('/auth');
  const termsComplete = profile != null && !needsLegalAcknowledgment(profile);
  const onFeed = isFeedPath(pathname, segments);

  const canShow =
    isAuthenticated &&
    Boolean(user?.id) &&
    termsComplete &&
    !inAuth &&
    onFeed &&
    !betaTesterBorderBlocking &&
    !pulseMonthCelebrationBlocking;

  const uid = user?.id;

  const pendingQ = useQuery({
    queryKey: shopKeys.pendingTeamBorderGifts(uid),
    queryFn: () => shopQueriesService.getNextPendingTeamBorderGift(uid!),
    enabled: !!uid && canShow,
    staleTime: 8_000,
  });

  const [open, setOpen] = useState(false);
  const [opening, setOpening] = useState(false);

  useEffect(() => {
    const id = user?.id ?? null;
    if (id === lastTeamGiftGateUserId) return;
    lastTeamGiftGateUserId = id;
    setOpen(false);
    setOpening(false);
    setTeamBorderGiftBlocking(false);
  }, [user?.id, setTeamBorderGiftBlocking]);

  useEffect(() => {
    if (!canShow && open) {
      setOpen(false);
      setTeamBorderGiftBlocking(false);
    }
  }, [canShow, open, setTeamBorderGiftBlocking]);

  const gift = pendingQ.data ?? null;

  useEffect(() => {
    if (open && !gift) {
      setOpen(false);
      setTeamBorderGiftBlocking(false);
    }
  }, [open, gift, setTeamBorderGiftBlocking]);

  useEffect(() => {
    if (!canShow || !gift || open || opening) return;

    let cancelled = false;
    void (async () => {
      await new Promise<void>((resolve) => {
        InteractionManager.runAfterInteractions(() => resolve());
      });
      if (cancelled || !canShow || !gift) return;
      requestAnimationFrame(() => {
        if (cancelled) return;
        setOpen(true);
        setTeamBorderGiftBlocking(true);
      });
    })();

    return () => {
      cancelled = true;
    };
  }, [canShow, gift, open, opening, setTeamBorderGiftBlocking]);

  const onOpenGift = useCallback(async () => {
    if (!gift || opening) return;
    setOpening(true);
    try {
      const res = await purchaseService.acceptPendingTeamBorderGift(gift.giftId);
      if (!res.ok) {
        Alert.alert('Could not open gift', res.message);
        return;
      }
      void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => undefined);
      analytics.track('team_border_gift_opened', { shop_item_id: gift.shopItem.id });
      await qc.invalidateQueries({ queryKey: shopKeys.pendingTeamBorderGifts(uid) });
      await qc.invalidateQueries({ queryKey: shopKeys.inventory(uid) });
      setOpen(false);
      setTeamBorderGiftBlocking(false);
    } catch (e) {
      console.warn('[PulseVerseTeamBorderGiftGate] accept', e);
      Alert.alert('Could not open gift', 'Something went wrong. Try again in a moment.');
    } finally {
      setOpening(false);
    }
  }, [gift, opening, qc, uid, setTeamBorderGiftBlocking]);

  if (!open || !gift) return null;

  const body = gift.note?.trim() || TEAM_COPY;

  return (
    <Modal
      visible
      animationType="fade"
      transparent
      statusBarTranslucent
      onRequestClose={() => undefined}
    >
      <View style={[styles.backdrop, { paddingTop: insets.top + spacing.lg, paddingBottom: insets.bottom + spacing.lg }]}>
        <View style={styles.card}>
          <View style={styles.iconRow}>
            <Ionicons name="gift" size={28} color="#FDE68A" />
          </View>
          <Text style={styles.title}>You received a border</Text>
          <Text style={styles.borderName} numberOfLines={2}>
            {gift.shopItem.name}
          </Text>
          <View style={styles.preview}>
            <BorderPreviewPlate shopItem={gift.shopItem} ringColor="#38BDF8" size={96} showMotionHint />
          </View>
          <Text style={styles.body}>{body}</Text>

          <Pressable
            style={[styles.primaryBtn, opening && styles.primaryBtnDisabled]}
            onPress={() => void onOpenGift()}
            disabled={opening}
            accessibilityRole="button"
            accessibilityLabel="Open border gift"
          >
            {opening ? (
              <ActivityIndicator color="#0f172a" />
            ) : (
              <Text style={styles.primaryBtnText}>Open gift</Text>
            )}
          </Pressable>

          <Text style={styles.hint}>You can equip it afterward in Customize My Pulse → Border.</Text>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.72)',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing.lg,
  },
  card: {
    width: '100%',
    maxWidth: 400,
    backgroundColor: colors.dark.card,
    borderRadius: 20,
    padding: spacing.xl,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
  },
  iconRow: {
    alignItems: 'center',
    marginBottom: spacing.sm,
  },
  title: {
    ...typography.screenTitle,
    color: colors.dark.text,
    textAlign: 'center',
    marginBottom: spacing.xs,
  },
  borderName: {
    ...typography.subtitle,
    color: colors.dark.textMuted,
    textAlign: 'center',
    marginBottom: spacing.lg,
  },
  preview: {
    alignItems: 'center',
    marginBottom: spacing.lg,
  },
  body: {
    ...typography.body,
    color: colors.dark.text,
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: spacing.xl,
  },
  primaryBtn: {
    backgroundColor: '#FDE68A',
    borderRadius: 14,
    paddingVertical: 14,
    alignItems: 'center',
  },
  primaryBtnDisabled: {
    opacity: 0.65,
  },
  primaryBtnText: {
    fontWeight: '700',
    fontSize: 16,
    color: '#0f172a',
  },
  hint: {
    ...typography.caption,
    color: colors.dark.textMuted,
    textAlign: 'center',
    marginTop: spacing.md,
  },
});
