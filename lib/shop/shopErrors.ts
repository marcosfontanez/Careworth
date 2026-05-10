/** Map Edge / IAP codes to short UI copy (full server message still available). */
export function shopErrorHint(code: string, isBorderGift = false): string {
  switch (code) {
    case 'DUPLICATE_PURCHASE':
      return isBorderGift
        ? 'This user already owns this border.'
        : 'You already own this border.';
    case 'SELF_GIFT_NOT_ALLOWED':
      return 'You can’t gift a border to yourself.';
    case 'INVALID_RECIPIENT':
      return 'We couldn’t find that @handle.';
    case 'INSUFFICIENT_SPARKS':
      return 'Not enough Sparks.';
    case 'USER_CANCELLED':
      return 'Purchase was cancelled.';
    case 'IAP_UNAVAILABLE':
    case 'IAP_INIT_FAILED':
      return 'Purchases need the iOS/Android app build with the store connected.';
    case 'INVALID_RECEIPT':
    case 'STORE_REJECTED':
      return 'The store could not validate this purchase. Try again or contact support.';
    case 'PRODUCT_MISMATCH':
      return 'Store product did not match the catalog item.';
    case 'FREE_CLAIM_NOT_AVAILABLE':
      return 'This border isn’t offered as a free claim anymore.';
    case 'FREE_CLAIM_FAILED':
      return 'Could not complete free claim. Try again.';
    case 'IAP_TIMEOUT':
      return 'The store took too long. If you were charged, tap Restore in settings or contact support.';
    default:
      return '';
  }
}
