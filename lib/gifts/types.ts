import type { ShopItemRow } from '@/lib/shop/types';

/** Normalized live-room creator gift event (shop catalog, not legacy stickers). */
export type CreatorLiveGiftEvent = {
  id: string;
  streamId: string;
  senderId: string;
  senderName: string;
  senderAvatar?: string;
  giftItemId: string;
  giftSlug: string;
  giftName: string;
  sparksSpent: number;
  createdAt: string;
  shopItem?: ShopItemRow | null;
};

export type LiveGiftSendValidation =
  | { ok: true }
  | { ok: false; message: string };
