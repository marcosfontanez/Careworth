export const PLACEMENT_SURFACES = [
  "feed",
  "circles",
  "live",
  "my_pulse",
  "creator_hub",
  "web",
] as const;
export type PlacementSurface = (typeof PLACEMENT_SURFACES)[number];

export const PLACEMENT_DEVICES = ["mobile", "web", "all"] as const;
export type PlacementDevice = (typeof PLACEMENT_DEVICES)[number];

export const CAPACITY_TYPES = ["exclusive", "shared", "rotation"] as const;
export type CapacityType = (typeof CAPACITY_TYPES)[number];

export const BOOKING_STATUSES = [
  "draft",
  "reserved",
  "active",
  "paused",
  "completed",
  "cancelled",
] as const;
export type BookingStatus = (typeof BOOKING_STATUSES)[number];

/** Bookings in these statuses consume placement capacity. */
export const CAPACITY_COUNTING_STATUSES: BookingStatus[] = ["reserved", "active", "paused"];

export const INVENTORY_BOOKING_DISCLAIMER =
  "Internal placement bookings only. Reserving a slot does not serve ads in the app — public delivery remains a separate future build.";

export type InventoryFilters = {
  surface: string;
  status: BookingStatus | "all";
  from: string;
  to: string;
  availableOnly: boolean;
  conflictOnly: boolean;
};

export type PlacementCatalogRow = {
  id: string;
  key: string;
  name: string;
  description: string | null;
  surface: string;
  device: string;
  isActive: boolean;
  capacityType: CapacityType;
  maxActiveCampaigns: number;
};

export type PlacementBookingRow = {
  id: string;
  campaignId: string;
  campaignName: string;
  placementId: string;
  placementKey: string;
  placementName: string;
  surface: string;
  placementDevice: string;
  placementIsActive: boolean;
  capacityType: CapacityType;
  maxActiveCampaigns: number;
  startAt: string;
  endAt: string;
  status: BookingStatus;
  priority: number;
  notes: string | null;
  createdAt: string;
  updatedAt: string;
  conflict: boolean;
  overCapacity: boolean;
};

export type InventoryPlacementSummary = {
  placement: PlacementCatalogRow;
  reservedCount: number;
  availableSlots: number;
  nextBookedStart: string | null;
  nextBookedEnd: string | null;
  hasConflict: boolean;
  hasOverCapacity: boolean;
  activeBookings: PlacementBookingRow[];
};

export type BookingValidation = {
  ok: boolean;
  error?: string;
  warning?: string;
  conflict?: boolean;
  overCapacity?: boolean;
};

export type BookingInput = {
  campaignId: string;
  placementId: string;
  startAt: string;
  endAt: string;
  status: BookingStatus;
  priority?: number;
  notes?: string | null;
  confirmOverCapacity?: boolean;
  confirmExclusiveConflict?: boolean;
};

export function parseInventoryFilters(
  input: Record<string, string | string[] | undefined>,
): InventoryFilters {
  const pick = (key: string) => {
    const v = input[key];
    return typeof v === "string" ? v.trim() : "";
  };
  const statusRaw = pick("status");
  const status = BOOKING_STATUSES.includes(statusRaw as BookingStatus)
    ? (statusRaw as BookingStatus)
    : "all";
  return {
    surface: pick("surface"),
    status,
    from: pick("from"),
    to: pick("to"),
    availableOnly: pick("available") === "1",
    conflictOnly: pick("conflict") === "1",
  };
}

export function rangesOverlap(aStart: number, aEnd: number, bStart: number, bEnd: number): boolean {
  return aStart < bEnd && aEnd > bStart;
}

export function bookingCountsAgainstCapacity(status: BookingStatus): boolean {
  return CAPACITY_COUNTING_STATUSES.includes(status);
}
