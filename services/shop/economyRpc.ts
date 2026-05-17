/**
 * Typed Pulse Shop economy RPC entrypoints (aligned with `lib/database.types.ts` Functions).
 * Prefer these over stringly `rpc(... as any)` calls so renames surface at compile time.
 */

import { supabase } from '@/lib/supabase';

export function rpcEconomyCreateOrGetWallets(p_user_id: string) {
  return supabase.rpc('economy_create_or_get_wallets', { p_user_id });
}

export function rpcEconomyClaimFreeShopBorder(p_shop_item_id: string) {
  return supabase.rpc('economy_claim_free_shop_border', { p_shop_item_id });
}

export function rpcEconomyEquipBorder(p_inventory_item_id: string) {
  return supabase.rpc('economy_equip_border', { p_inventory_item_id });
}

export function rpcEconomyAcceptPendingBorderGift(p_border_gift_id: string) {
  return supabase.rpc('economy_accept_pending_border_gift', { p_border_gift_id });
}

/** Sparks creator gift (live / post / profile). Same logic as edge `send_creator_gift`; avoids undeployed/broken functions returning non-JSON. */
export function rpcEconomySendCreatorGift(params: {
  p_creator_user_id: string;
  p_gift_item_id: string;
  p_context_type: 'live' | 'post' | 'profile';
  p_context_id: string | null;
  p_idempotency_key: string;
}) {
  return supabase.rpc('economy_send_creator_gift', params);
}
