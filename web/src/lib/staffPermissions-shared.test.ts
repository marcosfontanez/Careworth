import { describe, expect, it } from "vitest";

import {
  hasStaffPermission,
  normalizeStaffRoles,
  permissionForAdminPath,
} from "./staffPermissions-shared";

describe("staffPermissions", () => {
  it("legacy role_admin maps to owner", () => {
    expect(normalizeStaffRoles([], true)).toEqual(["owner"]);
  });

  it("moderator cannot access economy or platform api keys", () => {
    expect(hasStaffPermission(["moderator"], "economy.write")).toBe(false);
    expect(hasStaffPermission(["moderator"], "platform.api_keys")).toBe(false);
    expect(hasStaffPermission(["moderator"], "moderation.write")).toBe(true);
  });

  it("marketing can access campaigns but not user bans", () => {
    expect(hasStaffPermission(["marketing"], "campaigns.write")).toBe(true);
    expect(hasStaffPermission(["marketing"], "users.moderate")).toBe(false);
    expect(hasStaffPermission(["marketing"], "users.staff_manage")).toBe(false);
  });

  it("analyst is read-only", () => {
    expect(hasStaffPermission(["analyst"], "insights.read")).toBe(true);
    expect(hasStaffPermission(["analyst"], "campaigns.write")).toBe(false);
    expect(hasStaffPermission(["analyst"], "users.moderate")).toBe(false);
  });

  it("owner can manage staff", () => {
    expect(hasStaffPermission(["owner"], "users.staff_manage")).toBe(true);
  });

  it("maps admin routes to permissions", () => {
    expect(permissionForAdminPath("/admin/economy")).toBe("economy.read");
    expect(permissionForAdminPath("/admin/platform/webhooks")).toBe("platform.webhooks");
  });
});
