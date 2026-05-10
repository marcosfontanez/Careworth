/** React Query keys for Pulse Shop. */

export const shopKeys = {
  root: () => ['shop'] as const,
  catalog: () => ['shop', 'catalog'] as const,
  borderCollections: () => ['shop', 'borderCollections'] as const,
  sparkWallet: (userId: string | undefined) => ['shop', 'sparkWallet', userId ?? ''] as const,
  inventory: (userId: string | undefined) => ['shop', 'inventory', userId ?? ''] as const,
  receipts: (userId: string | undefined) => ['shop', 'receipts', userId ?? ''] as const,
  profileByUsername: (handle: string) => ['shop', 'profileHandle', handle.toLowerCase()] as const,
  /** Pending admin/team border gifts (border_gifts.status = pending). */
  pendingTeamBorderGifts: (userId: string | undefined) =>
    ['shop', 'pendingTeamBorderGifts', userId ?? ''] as const,
  /** Stable key for catalog rows resolved by id (e.g. owned inactive borders). */
  shopItemsByIds: (idKey: string) => ['shop', 'shopItemsByIds', idKey] as const,
  profileUsernames: (idKey: string) => ['shop', 'profileUsernames', idKey] as const,
};
