import { InventoryBookingConsole } from "@/components/admin/inventory-booking-console";
import {
  isPlacementBookingEnabled,
  loadAllBookings,
  loadInventoryPlacementSummaries,
  loadPlacementCatalog,
  parseInventoryFilters,
} from "@/lib/admin/placement-booking";
import {
  isSponsoredPlacementDeliveryEnabled,
  summarizeInventoryDelivery,
} from "@/lib/admin/sponsored-placement-delivery";

export default async function AdminInventoryPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const sp = await searchParams;
  const filters = parseInventoryFilters(sp);

  const [summaries, bookings, placements, bookingEnabled, deliveryFlagEnabled] = await Promise.all([
    loadInventoryPlacementSummaries(filters),
    loadAllBookings(filters),
    loadPlacementCatalog(true),
    isPlacementBookingEnabled(),
    isSponsoredPlacementDeliveryEnabled(),
  ]);

  const deliveryRows = summarizeInventoryDelivery({
    summaries: summaries.map((s) => ({
      placement: s.placement,
      activeBookings: s.activeBookings,
    })),
    deliveryFlagEnabled,
  });

  return (
    <InventoryBookingConsole
      summaries={summaries}
      bookings={bookings}
      placements={placements}
      filters={filters}
      bookingEnabled={bookingEnabled}
      deliveryRows={deliveryRows}
      deliveryFlagEnabled={deliveryFlagEnabled}
    />
  );
}
