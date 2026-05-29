import type { CreatorLiveGiftEvent } from '@/lib/gifts/types';
import type { ShopItemRow } from '@/lib/shop/types';
import type { LiveGiftEvent, StreamMessage } from '@/types';

export function creatorLiveGiftToChatEvent(
  event: CreatorLiveGiftEvent,
  shopItem?: ShopItemRow | null,
): LiveGiftEvent {
  const item = shopItem ?? event.shopItem ?? null;
  return {
    id: event.id,
    streamId: event.streamId,
    gift: {
      id: event.giftItemId,
      name: event.giftName,
      emoji: '✨',
      sparkCost: event.sparksSpent,
      tier: 'standard',
      color: '#FBBF24',
    },
    senderId: event.senderId,
    senderName: event.senderName,
    senderAvatar: event.senderAvatar,
    quantity: 1,
    comboCount: 1,
    createdAt: event.createdAt,
    creatorGiftSlug: event.giftSlug,
    creatorGiftItemId: event.giftItemId,
    shopItem: item ?? undefined,
  };
}

export function creatorLiveGiftToStreamMessage(
  event: CreatorLiveGiftEvent,
  shopItem?: ShopItemRow | null,
): StreamMessage {
  return {
    id: `gift-${event.id}`,
    streamId: event.streamId,
    userId: event.senderId,
    displayName: event.senderName,
    avatarUrl: event.senderAvatar,
    content: '',
    isHost: false,
    isModerator: false,
    createdAt: event.createdAt,
    messageType: 'gift',
    giftData: creatorLiveGiftToChatEvent(event, shopItem),
  };
}
