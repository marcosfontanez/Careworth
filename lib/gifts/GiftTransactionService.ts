import { purchaseService, type PurchaseOutcome } from '@/services/shop/purchaseService';
import { shopQueriesService } from '@/services/shop/shopQueries';
import type { ShopItemRow } from '@/lib/shop/types';
import type { LiveGiftSendValidation } from '@/lib/gifts/types';

export type SendLiveCreatorGiftInput = {
  giftItem: ShopItemRow;
  streamId: string;
  hostUserId: string;
  viewerUserId: string;
  streamStatus?: string | null;
  broadcastLive: boolean;
  idempotencyKey: string;
};

export function validateLiveCreatorGiftSend(input: {
  viewerUserId?: string | null;
  hostUserId?: string | null;
  streamId?: string | null;
  streamStatus?: string | null;
  broadcastLive: boolean;
  giftItem?: ShopItemRow | null;
}): LiveGiftSendValidation {
  if (!input.viewerUserId) {
    return { ok: false, message: 'Sign in to send gifts.' };
  }
  if (!input.streamId?.trim()) {
    return { ok: false, message: 'This live stream is unavailable.' };
  }
  if (!input.hostUserId) {
    return { ok: false, message: 'Could not find the host for this stream.' };
  }
  if (input.viewerUserId === input.hostUserId) {
    return { ok: false, message: 'You cannot gift yourself on your own live.' };
  }
  if (input.streamStatus === 'ended') {
    return { ok: false, message: 'This live stream has ended.' };
  }
  if (!input.broadcastLive) {
    return { ok: false, message: 'Gifts unlock once the host is broadcasting.' };
  }
  if (!input.giftItem?.id) {
    return { ok: false, message: 'Pick a gift from the catalog.' };
  }
  const contexts = input.giftItem.gift_contexts ?? [];
  if (contexts.length > 0 && !contexts.includes('live')) {
    return { ok: false, message: 'This gift is not available during live streams.' };
  }
  return { ok: true };
}

/** Atomic live creator gift via `economy_send_creator_gift` (Sparks debit + Diamonds credit). */
export async function sendLiveCreatorGift(input: SendLiveCreatorGiftInput): Promise<PurchaseOutcome> {
  const validation = validateLiveCreatorGiftSend({
    viewerUserId: input.viewerUserId,
    hostUserId: input.hostUserId,
    streamId: input.streamId,
    streamStatus: input.streamStatus,
    broadcastLive: input.broadcastLive,
    giftItem: input.giftItem,
  });
  if (!validation.ok) {
    return { ok: false, code: 'VALIDATION_FAILED', message: validation.message };
  }

  try {
    await shopQueriesService.ensureWallets(input.viewerUserId);
  } catch (err) {
    return {
      ok: false,
      code: 'WALLET_SETUP_FAILED',
      message: err instanceof Error ? err.message : 'Wallet setup failed. Try again.',
    };
  }

  return purchaseService.sendCreatorGift({
    giftItem: input.giftItem,
    creatorUserId: input.hostUserId,
    contextType: 'live',
    contextId: input.streamId,
    idempotencyKey: input.idempotencyKey,
  });
}
