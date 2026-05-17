import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { AppState, type AppStateStatus } from 'react-native';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '@/contexts/AuthContext';
import { rewardDeliveriesService } from '@/services/supabase/rewardDeliveries';
import { rewardDeliveryKeys } from '@/lib/queryKeys';
import type { RewardDeliveryRecord } from '@/lib/rewardDelivery/types';
import { rewardDeliveryDebug } from '@/lib/rewardDelivery/debugLog';
import {
  rewardToastTitle,
  rewardToastSubtitle,
  rewardToastAccessibilityLabel,
  REWARD_TOAST_ACCESSIBILITY_HINT,
} from '@/lib/rewardDelivery/toastCopy';
import { RewardDeliveryToast } from '@/components/rewards/RewardDeliveryToast';
import { RewardRevealModal } from '@/components/rewards/RewardRevealModal';
import { useAppStore } from '@/store/useAppStore';
import { shopKeys } from '@/lib/shop/queryKeys';
import { shopQueriesService } from '@/services/shop/shopQueries';
import { analytics } from '@/lib/analytics';

export function RewardDeliveryProvider({ children }: { children: React.ReactNode }) {
  const { user, isAuthenticated } = useAuth();
  const uid = user?.id ?? null;
  const qc = useQueryClient();

  useEffect(() => {
    if (!uid) return;
    void qc.invalidateQueries({ queryKey: rewardDeliveryKeys.pendingList(uid) });
  }, [uid, qc]);

  const rewardDeliveryBlocking = useAppStore((s) => s.rewardDeliveryBlocking);
  const setRewardDeliveryBlocking = useAppStore((s) => s.setRewardDeliveryBlocking);
  const pulseMonthCelebrationBlocking = useAppStore((s) => s.pulseMonthCelebrationBlocking);

  /**
   * Hide the in-app toast while our reveal modal is open, or while the monthly Pulse celebration
   * summary is open (that modal now routes top‑5 rewards through the same toast → gift box flow).
   *
   * Team border + beta tester gates stay non-blocking for the toast so creator Diamond deliveries
   * from gifts are still surfaced.
   */
  const toastPresentationBlocked = rewardDeliveryBlocking || pulseMonthCelebrationBlocking;

  const pendingQuery = useQuery({
    queryKey: rewardDeliveryKeys.pendingList(uid),
    queryFn: () => rewardDeliveriesService.listPending(),
    enabled: Boolean(isAuthenticated && uid),
    staleTime: 12_000,
    /** Keep polling during Pulse Month — only pause while our reveal modal owns the screen. */
    refetchInterval: rewardDeliveryBlocking ? false : 22_000,
    refetchOnWindowFocus: true,
    retry: 2,
  });

  useEffect(() => {
    if (!pendingQuery.isError || !pendingQuery.error) return;
    rewardDeliveryDebug.listPendingError(pendingQuery.error);
  }, [pendingQuery.isError, pendingQuery.error]);

  useEffect(() => {
    if (!pendingQuery.isSuccess || !uid) return;
    const rows = pendingQuery.data ?? [];
    rewardDeliveryDebug.listPendingOk(
      rows.length,
      rows.map((r) => ({ id: r.id, status: r.status, item_type: r.item_type })),
    );
  }, [pendingQuery.isSuccess, pendingQuery.data, uid]);

  const deliveries = pendingQuery.isError ? [] : (pendingQuery.data ?? []);
  const head = deliveries[0];

  const promotedRef = useRef<string | null>(null);
  useEffect(() => {
    if (!head || head.status !== 'pending') return;
    /** Don’t advance to toast_shown until the monthly celebration modal is gone — avoids buried toasts. */
    if (pulseMonthCelebrationBlocking) return;
    if (promotedRef.current === head.id) return;
    promotedRef.current = head.id;
    void (async () => {
      try {
        rewardDeliveryDebug.transition('pending → toast_shown', head.id);
        await rewardDeliveriesService.setStatus(head.id, 'toast_shown');
        await qc.invalidateQueries({ queryKey: rewardDeliveryKeys.pendingList(uid) });
      } catch (e) {
        if (__DEV__) console.warn('[RewardDelivery] promote toast', e);
      }
    })();
  }, [head, qc, uid, pulseMonthCelebrationBlocking]);

  /** Warm catalog art before reveal opens — creator Sparks gift → Diamonds uses `item_id` as shop item. */
  useEffect(() => {
    if (!head || head.status !== 'toast_shown') return;
    const meta = head.metadata ?? {};
    if (head.item_type !== 'diamonds' || meta.reason !== 'gift_conversion') return;
    const sid = head.item_id?.trim();
    if (!sid) return;
    void qc.prefetchQuery({
      queryKey: shopKeys.shopItemsByIds(sid),
      queryFn: () => shopQueriesService.getShopItemsByIds([sid]),
      staleTime: 120_000,
    });
  }, [head?.id, head?.status, head?.item_type, head?.item_id, head?.metadata, qc]);

  const pulseMonthWasBlockingRef = useRef(false);
  useEffect(() => {
    if (!uid) return;
    const was = pulseMonthWasBlockingRef.current;
    pulseMonthWasBlockingRef.current = pulseMonthCelebrationBlocking;
    if (was && !pulseMonthCelebrationBlocking) {
      void qc.invalidateQueries({ queryKey: rewardDeliveryKeys.pendingList(uid) });
    }
  }, [pulseMonthCelebrationBlocking, uid, qc]);

  useEffect(() => {
    if (!head) promotedRef.current = null;
  }, [head]);

  const appStateRef = useRef<AppStateStatus>(AppState.currentState);
  useEffect(() => {
    const sub = AppState.addEventListener('change', (next) => {
      if (appStateRef.current.match(/inactive|background/) && next === 'active' && uid) {
        void qc.invalidateQueries({ queryKey: rewardDeliveryKeys.pendingList(uid) });
      }
      appStateRef.current = next;
    });
    return () => sub.remove();
  }, [qc, uid]);

  const [modalDeliveryId, setModalDeliveryId] = useState<string | null>(null);

  const modalDelivery = useMemo(
    () => (modalDeliveryId ? deliveries.find((d) => d.id === modalDeliveryId) ?? null : null),
    [deliveries, modalDeliveryId],
  );

  useEffect(() => {
    if (!modalDeliveryId) return;
    if (!deliveries.some((d) => d.id === modalDeliveryId)) {
      setModalDeliveryId(null);
      setRewardDeliveryBlocking(false);
    }
  }, [deliveries, modalDeliveryId, setRewardDeliveryBlocking]);

  const toastVisible = Boolean(
    head && head.status === 'toast_shown' && !toastPresentationBlocked && !modalDeliveryId,
  );

  const openFromToast = useCallback(async () => {
    if (!head) return;
    try {
      analytics.track('reward_toast_opened', { delivery_id: head.id, item_type: head.item_type });
      rewardDeliveryDebug.transition('toast_shown → opened', head.id);
      await rewardDeliveriesService.setStatus(head.id, 'opened');
      await qc.invalidateQueries({ queryKey: rewardDeliveryKeys.pendingList(uid) });
      setModalDeliveryId(head.id);
      setRewardDeliveryBlocking(true);
    } catch (e) {
      if (__DEV__) console.warn('[RewardDelivery] open', e);
    }
  }, [head, qc, uid, setRewardDeliveryBlocking]);

  const dismissToast = useCallback(async () => {
    if (!head) return;
    try {
      analytics.track('reward_toast_dismissed', { delivery_id: head.id, item_type: head.item_type });
      rewardDeliveryDebug.transition('* → dismissed (toast)', head.id);
      await rewardDeliveriesService.setStatus(head.id, 'dismissed');
      await qc.invalidateQueries({ queryKey: rewardDeliveryKeys.pendingList(uid) });
    } catch (e) {
      if (__DEV__) console.warn('[RewardDelivery] dismiss toast', e);
    }
  }, [head, qc, uid]);

  const closeModalOnly = useCallback(() => {
    setModalDeliveryId(null);
    setRewardDeliveryBlocking(false);
  }, [setRewardDeliveryBlocking]);

  const acknowledge = useCallback(
    async (id: string, outcome: 'acknowledged' | 'dismissed') => {
      try {
        rewardDeliveryDebug.transition(`opened → ${outcome}`, id);
        await rewardDeliveriesService.setStatus(id, outcome);
        await qc.invalidateQueries({ queryKey: rewardDeliveryKeys.pendingList(uid) });
      } catch (e) {
        if (__DEV__) console.warn('[RewardDelivery] acknowledge', e);
      }
    },
    [qc, uid],
  );

  return (
    <>
      {children}
      <RewardDeliveryToast
        visible={toastVisible}
        title={head ? rewardToastTitle(head) : ''}
        subtitle={head ? rewardToastSubtitle(head) : undefined}
        accessibilityLabel={head ? rewardToastAccessibilityLabel(head) : 'Reward'}
        accessibilityHint={REWARD_TOAST_ACCESSIBILITY_HINT}
        onOpen={() => void openFromToast()}
        onDismiss={() => void dismissToast()}
      />
      <RewardRevealModal
        visible={Boolean(modalDelivery)}
        delivery={modalDelivery}
        onDismiss={closeModalOnly}
        onAcknowledge={acknowledge}
      />
    </>
  );
}
