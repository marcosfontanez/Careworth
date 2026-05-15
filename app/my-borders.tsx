import { MyBordersScreen } from '@/components/borders/inventory/MyBordersScreen';

/**
 * Dedicated full-screen Border Vault.
 *
 * The Customize → Look surface ships a simplified `BordersCollectionStrip`
 * (3 sort modes + horizontal carousel) so creators can equip in two taps
 * without leaving the customize flow. This route is the rich deep-dive:
 * the full vault with collection filters, rarity/source/availability
 * facets, sort options, and the "Live on your pulse" hero.
 */
export default function MyBordersRoute() {
  return <MyBordersScreen />;
}
