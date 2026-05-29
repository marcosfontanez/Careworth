/** Shared creator gift system — shop catalog, assets, transactions, live overlay helpers. */
export {
  filterGiftsForContext,
  giftCatalogById,
  resolveGiftFromCatalog,
} from '@/lib/gifts/GiftCatalog';
export {
  isKnownCreatorGiftSlug,
  prefetchCreatorGiftAsset,
  resolveCreatorGiftImageSource,
} from '@/lib/gifts/GiftAssetResolver';
export {
  sendLiveCreatorGift,
  validateLiveCreatorGiftSend,
  type SendLiveCreatorGiftInput,
} from '@/lib/gifts/GiftTransactionService';
export {
  creatorLiveGiftToChatEvent,
  creatorLiveGiftToStreamMessage,
} from '@/lib/gifts/liveGiftMessages';
export type { CreatorLiveGiftEvent, LiveGiftSendValidation } from '@/lib/gifts/types';

/** Current gift picker UI — same tray used on Feed, Profile, Post, and Live. */
export { SendCreatorGiftTray as GiftPicker } from '@/components/shop/SendCreatorGiftTray';
export type { CreatorGiftContext } from '@/components/shop/SendCreatorGiftTray';

export { LiveGiftOverlay } from '@/components/gifts/LiveGiftOverlay';
export { LiveGiftDrawer } from '@/components/live/viewer/LiveGiftDrawer';
export type { LiveGiftSentPayload } from '@/components/live/viewer/LiveGiftDrawer';
