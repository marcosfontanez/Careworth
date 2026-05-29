import type { ShopItemRow } from '@/lib/shop/types';

/**
 * Human-readable IAP SKU list for staff (App Store Connect / Play Console).
 * IDs come from live `shop_items` rows — keep consoles aligned with Supabase.
 */
export function buildSparkPackStoreIdsForStaff(packs: ShopItemRow[]): string {
  const rows = [...packs]
    .filter((p) => p.type === 'spark_pack')
    .sort((a, b) => (a.spark_amount ?? 0) - (b.spark_amount ?? 0));

  const lines: string[] = [
    'Pulse Shop spark packs — create consumables with these exact product IDs:',
    '',
  ];

  for (const p of rows) {
    const amt = p.spark_amount ?? 0;
    const ios = p.store_product_id_ios?.trim() || '(missing in catalog)';
    const android = p.store_product_id_android?.trim() || '(missing in catalog)';
    lines.push(`${amt.toLocaleString()} Sparks — ${p.name}`);
    lines.push(`  iOS:     ${ios}`);
    lines.push(`  Android: ${android} (Play: Consumable)`);
    lines.push('');
  }

  lines.push('Google Play launch SKUs — see lib/shop/googlePlayProducts.ts');
  lines.push('Border SKUs on Play are One-time (non-consumable).');

  lines.push('iOS bundle ID: com.pulseverse.app');
  lines.push('Confirm Paid Apps agreements are active in both consoles.');
  return lines.join('\n');
}
