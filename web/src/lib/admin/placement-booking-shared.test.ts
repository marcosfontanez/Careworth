import { describe, expect, it } from "vitest";

import {
  bookingCountsAgainstCapacity,
  parseInventoryFilters,
  rangesOverlap,
} from "./placement-booking-shared";

describe("placement-booking-shared", () => {
  it("parseInventoryFilters maps query params", () => {
    const f = parseInventoryFilters({
      surface: "feed",
      status: "reserved",
      from: "2026-06-01",
      to: "2026-06-30",
      available: "1",
      conflict: "1",
    });
    expect(f.surface).toBe("feed");
    expect(f.status).toBe("reserved");
    expect(f.availableOnly).toBe(true);
    expect(f.conflictOnly).toBe(true);
  });

  it("bookingCountsAgainstCapacity excludes draft and terminal states", () => {
    expect(bookingCountsAgainstCapacity("draft")).toBe(false);
    expect(bookingCountsAgainstCapacity("reserved")).toBe(true);
    expect(bookingCountsAgainstCapacity("cancelled")).toBe(false);
    expect(bookingCountsAgainstCapacity("completed")).toBe(false);
  });

  it("rangesOverlap detects overlapping windows", () => {
    expect(rangesOverlap(0, 10, 5, 15)).toBe(true);
    expect(rangesOverlap(0, 5, 5, 10)).toBe(false);
  });
});
