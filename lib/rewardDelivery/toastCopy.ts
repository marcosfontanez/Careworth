/**
 * Reward delivery toast copy aligned with {@link RewardRevealModal} headlines/subtitles.
 */

import type { RewardDeliveryRecord } from '@/lib/rewardDelivery/types';

function metaStr(meta: Record<string, unknown>, key: string): string | null {
  const v = meta[key];
  return typeof v === 'string' && v.trim() ? v.trim() : null;
}

function sparksQty(d: RewardDeliveryRecord, meta: Record<string, unknown>): number {
  const metaQty = metaStr(meta, 'quantity');
  const parsed = metaQty != null ? Number(metaQty) : NaN;
  const base = d.quantity;
  if (typeof base === 'number' && Number.isFinite(base)) return base;
  if (Number.isFinite(parsed)) return parsed;
  return 0;
}

export function rewardToastTitle(d: RewardDeliveryRecord): string {
  const meta = d.metadata ?? {};
  switch (d.item_type) {
    case 'border':
      return 'Border unlocked';
    case 'sparks':
      return 'Sparks delivered';
    case 'diamonds':
      if (meta.reason === 'gift_conversion' || meta.reason === 'live_stream') {
        return 'New gift delivered';
      }
      return 'Diamonds delivered';
    case 'future_item':
      if (meta.kind === 'pulse_leaderboard_frame') return 'Leaderboard reward';
      if (meta.kind === 'beta_tester_frame') return 'Beta gift unlocked';
      return 'Reward waiting';
    default:
      return 'Reward waiting';
  }
}

export function rewardToastSubtitle(d: RewardDeliveryRecord): string | undefined {
  const meta = d.metadata ?? {};
  if (d.item_type === 'border') {
    const name = typeof meta.border_name === 'string' ? meta.border_name.trim() : '';
    return name
      ? `${name} · Saved to My Borders · Tap to open`
      : 'Saved to My Borders · Tap to open';
  }
  if (d.item_type === 'sparks') {
    const qty = sparksQty(d, meta);
    const credit =
      qty > 0 ? `Wallet credit · +${qty.toLocaleString()} Sparks` : 'Sparks wallet updated';
    return `${credit} · Spend on gifts or borders · Tap to open`;
  }
  if (d.item_type === 'diamonds') {
    const q = d.quantity;
    const giftName = typeof meta.gift_name === 'string' ? meta.gift_name.trim() : '';
    const su = metaStr(meta, 'sender_username');
    const qtyLine = typeof q === 'number' ? `+${q.toLocaleString()} Diamonds` : 'Diamonds credit';
    let ctxHint = '';
    if (meta.reason === 'gift_conversion') {
      if (meta.context_type === 'live') ctxHint = ' · Live';
      else if (meta.context_type === 'post') ctxHint = ' · From a post';
      else if (meta.context_type === 'profile') ctxHint = ' · From profile';
    } else if (meta.reason === 'live_stream') {
      ctxHint = ' · Live sticker';
    }
    if (meta.reason === 'gift_conversion' || meta.reason === 'live_stream') {
      if (su) {
        const mid = giftName ? ` · ${giftName}` : '';
        return `Gifted by @${su} · ${qtyLine}${mid}${ctxHint} · Tap to open`;
      }
      const base = giftName ? `${qtyLine} · ${giftName}${ctxHint}` : `${qtyLine}${ctxHint}`;
      return `${base} · Tap to open`;
    }
    const base = giftName ? `${qtyLine} · ${giftName}` : qtyLine;
    return `${base} · Tap to open`;
  }
  if (d.item_type === 'future_item') {
    if (meta.kind === 'pulse_leaderboard_frame') {
      const label = typeof meta.frame_label === 'string' ? meta.frame_label.trim() : '';
      return label ? `Exclusive border · ${label} · Tap to open` : 'Exclusive leaderboard border · Tap to open';
    }
    if (meta.kind === 'beta_tester_frame') {
      return 'Beta border · Tap to open';
    }
  }
  return 'Tap to open';
}

export function rewardToastAccessibilityLabel(d: RewardDeliveryRecord): string {
  const title = rewardToastTitle(d);
  const sub = rewardToastSubtitle(d);
  return sub ? `${title}. ${sub}` : `${title}. Tap to open celebration.`;
}

export const REWARD_TOAST_ACCESSIBILITY_HINT =
  'Opens the full-screen gift celebration. Use the close control on the banner to dismiss without opening.';
