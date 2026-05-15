/**
 * Campaign window helpers for monthly / limited borders.
 *
 * Reads `release_at` and `expires_at` directly off `ShopItemRow` (the DB is
 * already populated for monthly drops). Returns formatted countdown strings
 * + a tiny hook for live-updating chips.
 */

import { useEffect, useState } from 'react';
import type { ShopItemRow } from '@/lib/shop/types';

export type BorderCampaignWindow = {
  /** ISO timestamp when the border begins / began being available. */
  releaseAt: string | null;
  /** ISO timestamp when claim / purchase windows close. */
  expiresAt: string | null;
  /** True if `release_at` is in the future. */
  isUpcoming: boolean;
  /** True if `expires_at` is in the past. */
  isClosed: boolean;
  /** True if window is open right now. */
  isOpen: boolean;
};

export function readCampaignWindow(item: ShopItemRow): BorderCampaignWindow {
  const releaseAt = item.release_at;
  const expiresAt = item.expires_at;
  const now = Date.now();
  const releaseT = releaseAt ? Date.parse(releaseAt) : Number.NEGATIVE_INFINITY;
  const expiresT = expiresAt ? Date.parse(expiresAt) : Number.POSITIVE_INFINITY;
  const isUpcoming = Number.isFinite(releaseT) && releaseT > now;
  const isClosed = Number.isFinite(expiresT) && expiresT <= now;
  const isOpen = !isUpcoming && !isClosed;
  return { releaseAt, expiresAt, isUpcoming, isClosed, isOpen };
}

/**
 * Human-readable time-left string: "12d left", "5h left", "23m left",
 * "Closes today", or null when there's no window.
 */
export function formatTimeLeft(targetIso: string | null | undefined, nowMs: number = Date.now()): string | null {
  if (!targetIso) return null;
  const t = Date.parse(targetIso);
  if (!Number.isFinite(t)) return null;
  const diff = t - nowMs;
  if (diff <= 0) return 'Closed';
  const sec = Math.floor(diff / 1000);
  const min = Math.floor(sec / 60);
  const hr = Math.floor(min / 60);
  const day = Math.floor(hr / 24);
  if (day >= 2) return `${day}d left`;
  if (day === 1) return `1d ${hr - 24}h left`;
  if (hr >= 2) return `${hr}h left`;
  if (hr === 1) return `1h ${min - 60}m left`;
  if (min >= 2) return `${min}m left`;
  return 'Closes any moment';
}

/** Compact hero label: "Free until May 31" / "Drops Apr 27" / null. */
export function formatCampaignWindow(item: ShopItemRow): string | null {
  const w = readCampaignWindow(item);
  if (w.isUpcoming && w.releaseAt) return `Drops ${formatShortDate(w.releaseAt)}`;
  if (w.isOpen && w.expiresAt) return `Until ${formatShortDate(w.expiresAt)}`;
  if (w.isClosed && w.expiresAt) return `Closed ${formatShortDate(w.expiresAt)}`;
  return null;
}

function formatShortDate(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
}

/**
 * Live countdown hook — re-renders every minute (or every second for
 * windows < 1 hour). Use sparingly; only on the focused detail/hero card.
 */
export function useCampaignCountdown(targetIso: string | null | undefined): string | null {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    if (!targetIso) return;
    const t = Date.parse(targetIso);
    if (!Number.isFinite(t)) return;
    const diff = t - Date.now();
    const intervalMs = diff > 60 * 60 * 1000 ? 60_000 : 1_000;
    const id = setInterval(() => setNow(Date.now()), intervalMs);
    return () => clearInterval(id);
  }, [targetIso]);
  return formatTimeLeft(targetIso, now);
}
