import { InventoryBookingConsole } from "@/components/admin/inventory-booking-console";
import {
  isPlacementBookingEnabled,
  loadAllBookings,
  loadInventoryPlacementSummaries,
  loadPlacementCatalog,
  parseInventoryFilters,
} from "@/lib/admin/placement-booking";

export default async function AdminInventoryPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const sp = await searchParams;
  const filters = parseInventoryFilters(sp);

  const [summaries, bookings, placements, bookingEnabled] = await Promise.all([
    loadInventoryPlacementSummaries(filters),
    loadAllBookings(filters),
    loadPlacementCatalog(true),
    isPlacementBookingEnabled(),
  ]);

  return (
    <InventoryBookingConsole
      summaries={summaries}
      bookings={bookings}
      placements={placements}
      filters={filters}
      bookingEnabled={bookingEnabled}
    />
  );
}
