/** Helpers for Edge Function / RPC JSON returned after shop fulfillment. */

export function readPurchaseReceiptId(data: Record<string, unknown> | null | undefined): string | null {
  if (!data) return null;
  const id = data.purchase_receipt_id;
  return typeof id === 'string' && id.trim().length > 0 ? id.trim() : null;
}

export function readUserInventoryId(data: Record<string, unknown> | null | undefined): string | null {
  if (!data) return null;
  const keys = ['user_inventory_id', 'inventory_item_id'] as const;
  for (const k of keys) {
    const v = data[k];
    if (typeof v === 'string' && v.trim().length > 0) return v.trim();
  }
  return null;
}
