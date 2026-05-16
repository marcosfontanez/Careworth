import { supabase } from '@/lib/supabase';
import type { BorderCollectionRow } from '@/lib/shop/borderCatalogTaxonomy';
import type { ShopItemRow } from '@/lib/shop/types';

export type BorderCatalogAdminBorder = ShopItemRow;

export const borderCatalogAdminService = {
  async listCollections(): Promise<BorderCollectionRow[]> {
    const { data, error } = await supabase
      .from('border_collections')
      .select('*')
      .order('season_code', { ascending: false, nullsFirst: false });
    if (error) throw error;
    return (data ?? []) as unknown as BorderCollectionRow[];
  },

  async listBorderItems(): Promise<ShopItemRow[]> {
    const { data, error } = await supabase
      .from('shop_items')
      .select('*')
      .eq('type', 'border')
      .order('sort_order', { ascending: true });
    if (error) throw error;
    return (data ?? []) as unknown as ShopItemRow[];
  },
};
