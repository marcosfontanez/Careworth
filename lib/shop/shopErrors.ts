/**
 * Prefer the server message when store validation failed — the generic hint hid
 * the real Google/Apple error (e.g. missing service account, wrong product ID).
 */
export function shopPurchaseErrorMessage(
  code: string,
  serverMessage: string,
  isBorderGift = false,
): string {
  const msg = serverMessage?.trim() ?? '';
  const preferServer =
    code === 'STORE_REJECTED' ||
    code === 'STORE_NOT_CONFIGURED' ||
    code === 'INVALID_RECEIPT' ||
    code === 'PRODUCT_MISMATCH' ||
    code === 'MISSING_SKU' ||
    code === 'FULFILLMENT_FAILED';
  if (preferServer && msg.length > 0) return msg;
  const hint = shopErrorHint(code, isBorderGift);
  return hint || msg || 'Purchase could not be completed.';
}

/** Map Edge / IAP codes to short UI copy (full server message still available). */
export function shopErrorHint(code: string, isBorderGift = false): string {
  switch (code) {
    case 'DUPLICATE_PURCHASE':
      return isBorderGift
        ? 'This user already owns this border.'
        : 'You already own this border.';
    case 'SELF_GIFT_NOT_ALLOWED':
      return 'You can’t gift a border to yourself.';
    case 'GIFT_BLOCKED':
      return 'You can’t send a gift to this user.';
    case 'INVALID_RECIPIENT':
      return 'We couldn’t find that @handle.';
    case 'INVALID_GIFT_CONTEXT':
      return 'That gift target is no longer valid. Refresh and try again.';
    case 'INSUFFICIENT_SPARKS':
      return 'Not enough Sparks.';
    case 'USER_CANCELLED':
      return 'Purchase was cancelled.';
    case 'IAP_UNAVAILABLE':
    case 'IAP_INIT_FAILED':
      return 'Purchases need the iOS/Android app build with the store connected.';
    case 'STORE_NOT_CONFIGURED':
      return 'PulseVerse server is missing Google Play or App Store verification keys. Your card may have been charged — reopen Pulse Shop after the team fixes Supabase secrets, or use Restore Purchases.';
    case 'INVALID_RECEIPT':
    case 'STORE_REJECTED':
      return 'The store could not validate this purchase. Try again or contact support.';
    case 'PRODUCT_MISMATCH':
      return 'Store product did not match the catalog item.';
    case 'FREE_CLAIM_NOT_AVAILABLE':
      return 'This border isn’t offered as a free claim anymore.';
    case 'FREE_CLAIM_FAILED':
      return 'Could not complete free claim. Try again.';
    case 'PURCHASE_IN_PROGRESS':
      return 'A purchase is already in progress. Wait for it to finish.';
    case 'PURCHASE_PENDING':
      return 'Purchase is pending approval. It will unlock once approved.';
    case 'IAP_TIMEOUT':
      return 'The store took too long. If you were charged, tap Restore in settings or contact support.';
    case 'MISSING_SKU':
      return 'This item has no App Store / Play product ID in PulseVerse yet. Update shop_items in Supabase or redeploy migrations.';
    case 'ITEM_ALREADY_OWNED':
      return 'Google Play still has your last purchase open. Don’t buy again — tap Recover Sparks below (waits for Play to return your receipt), then try Continue once more.';
    case 'PENDING_STORE_PURCHASE':
      return 'A previous purchase for this pack is still finishing. Tap Recover Sparks below, or close Pulse Shop and reopen it.';
    case 'NO_PENDING':
      return ''; // Use full message from forceRecoverSparkPack / server.
    case 'SKU_NOT_FOUND':
    case 'sku-not-found':
      return 'This purchase isn’t available from the App Store or Google Play yet. If you’re on the PulseVerse team, finish consumable IAP setup so product IDs match the shop catalog; everyone else can try again later or contact support.';
    case 'FETCH_PRODUCTS_FAILED':
    case 'query-product':
      return 'Could not load products from the store. Check your connection, signing into Sandbox (iOS), and try again.';
    case 'empty-sku-list':
      return 'The store returned no products for this request. Confirm the product exists and your app’s bundle / package matches the console.';
    case 'FULFILLMENT_FAILED':
      return ''; // Use full server message (includes Edge deploy hints).
    case 'RPC_NOT_FOUND':
      return ''; // Message from purchaseService includes migration hint.
    default:
      return '';
  }
}
