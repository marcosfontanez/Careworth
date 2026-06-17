/**
 * Staff role tiers + permission matrix (shared web + mobile).
 * Keep in sync with `lib/staffPermissions.ts` (mobile import path).
 * Legacy `profiles.role_admin = true` with empty staff_roles is treated as owner.
 */

export const STAFF_ROLES = [
  "owner",
  "admin",
  "moderator",
  "community",
  "marketing",
  "support",
  "analyst",
  "economy",
] as const;

export type StaffRole = (typeof STAFF_ROLES)[number];

export const STAFF_PERMISSIONS = [
  "dashboard.read",
  "insights.read",
  "audit.read",
  "platform.read",
  "platform.flags",
  "platform.api_keys",
  "platform.webhooks",
  "platform.compliance",
  "sound_catalog.manage",
  "merchandising.grant",
  "economy.read",
  "economy.write",
  "users.read",
  "users.moderate",
  "users.staff_manage",
  "circles.manage",
  "live.manage",
  "moderation.write",
  "reports.read",
  "appeals.write",
  "brand_safety.read",
  "partnerships.read",
  "campaigns.write",
  "inventory.write",
  "leads.write",
  "media_kit.read",
  "creators.read",
  "settings.read",
] as const;

export type StaffPermission = (typeof STAFF_PERMISSIONS)[number];

/** Owner inherits every permission. */
const OWNER_ONLY: StaffPermission[] = ["platform.api_keys", "users.staff_manage"];

const ADMIN_PERMISSIONS: StaffPermission[] = STAFF_PERMISSIONS.filter(
  (p) => !OWNER_ONLY.includes(p),
);

const MODERATOR_PERMISSIONS: StaffPermission[] = [
  "dashboard.read",
  "insights.read",
  "users.read",
  "users.moderate",
  "live.manage",
  "moderation.write",
  "reports.read",
  "appeals.write",
  "brand_safety.read",
  "settings.read",
];

const COMMUNITY_PERMISSIONS: StaffPermission[] = [
  "dashboard.read",
  "users.read",
  "circles.manage",
  "reports.read",
  "settings.read",
];

const MARKETING_PERMISSIONS: StaffPermission[] = [
  "dashboard.read",
  "insights.read",
  "partnerships.read",
  "campaigns.write",
  "inventory.write",
  "leads.write",
  "media_kit.read",
  "creators.read",
  "brand_safety.read",
  "settings.read",
];

const SUPPORT_PERMISSIONS: StaffPermission[] = [
  "dashboard.read",
  "users.read",
  "reports.read",
  "moderation.write",
  "settings.read",
];

const ANALYST_PERMISSIONS: StaffPermission[] = [
  "dashboard.read",
  "insights.read",
  "audit.read",
  "economy.read",
  "users.read",
  "reports.read",
  "partnerships.read",
  "media_kit.read",
  "creators.read",
  "brand_safety.read",
  "settings.read",
];

const ECONOMY_PERMISSIONS: StaffPermission[] = [
  "dashboard.read",
  "merchandising.grant",
  "economy.read",
  "economy.write",
  "settings.read",
];

export const ROLE_PERMISSIONS: Record<StaffRole, readonly StaffPermission[]> = {
  owner: STAFF_PERMISSIONS,
  admin: ADMIN_PERMISSIONS,
  moderator: MODERATOR_PERMISSIONS,
  community: COMMUNITY_PERMISSIONS,
  marketing: MARKETING_PERMISSIONS,
  support: SUPPORT_PERMISSIONS,
  analyst: ANALYST_PERMISSIONS,
  economy: ECONOMY_PERMISSIONS,
};

export function normalizeStaffRoles(
  roles: string[] | null | undefined,
  legacyRoleAdmin?: boolean,
): StaffRole[] {
  const parsed = (roles ?? []).filter((r): r is StaffRole =>
    STAFF_ROLES.includes(r as StaffRole),
  );
  if (parsed.length > 0) return [...new Set(parsed)];
  if (legacyRoleAdmin) return ["owner"];
  return [];
}

export function permissionsForRoles(roles: StaffRole[]): Set<StaffPermission> {
  const out = new Set<StaffPermission>();
  for (const role of roles) {
    for (const perm of ROLE_PERMISSIONS[role] ?? []) {
      out.add(perm);
    }
  }
  return out;
}

export function hasStaffPermission(
  roles: StaffRole[],
  permission: StaffPermission,
  legacyRoleAdmin?: boolean,
): boolean {
  const effective = normalizeStaffRoles(roles, legacyRoleAdmin);
  if (effective.length === 0) return false;
  return permissionsForRoles(effective).has(permission);
}

/** Admin console route → required permission (prefix match). */
export const ADMIN_ROUTE_PERMISSIONS: { prefix: string; permission: StaffPermission }[] = [
  { prefix: "/admin/dashboard", permission: "dashboard.read" },
  { prefix: "/admin/insights", permission: "insights.read" },
  { prefix: "/admin/audit", permission: "audit.read" },
  { prefix: "/admin/platform/webhooks", permission: "platform.webhooks" },
  { prefix: "/admin/platform", permission: "platform.read" },
  { prefix: "/admin/sound-catalog", permission: "sound_catalog.manage" },
  { prefix: "/admin/merchandising", permission: "merchandising.grant" },
  { prefix: "/admin/shop-catalog", permission: "merchandising.grant" },
  { prefix: "/admin/avatar-borders", permission: "merchandising.grant" },
  { prefix: "/admin/economy", permission: "economy.read" },
  { prefix: "/admin/users", permission: "users.read" },
  { prefix: "/admin/circles", permission: "circles.manage" },
  { prefix: "/admin/live", permission: "live.manage" },
  { prefix: "/admin/moderation", permission: "moderation.write" },
  { prefix: "/admin/reports/sponsored", permission: "partnerships.read" },
  { prefix: "/admin/reports", permission: "reports.read" },
  { prefix: "/admin/appeals", permission: "appeals.write" },
  { prefix: "/admin/brand-safety", permission: "brand_safety.read" },
  { prefix: "/admin/advertisers", permission: "partnerships.read" },
  { prefix: "/admin/audience-insights", permission: "partnerships.read" },
  { prefix: "/admin/campaigns", permission: "campaigns.write" },
  { prefix: "/admin/inventory", permission: "inventory.write" },
  { prefix: "/admin/creators", permission: "creators.read" },
  { prefix: "/admin/leads", permission: "leads.write" },
  { prefix: "/admin/media-kit", permission: "media_kit.read" },
  { prefix: "/admin/settings", permission: "settings.read" },
];

export function permissionForAdminPath(pathname: string): StaffPermission | null {
  const path = pathname.split("?")[0]?.split("#")[0] ?? pathname;
  if (path === "/admin/reports/sponsored" || /\/admin\/campaigns\/[^/]+\/report$/.test(path)) {
    return "partnerships.read";
  }
  const sorted = [...ADMIN_ROUTE_PERMISSIONS].sort((a, b) => b.prefix.length - a.prefix.length);
  for (const row of sorted) {
    if (path === row.prefix || path.startsWith(`${row.prefix}/`)) {
      return row.permission;
    }
  }
  return "dashboard.read";
}

export const ADMIN_SIDEBAR_HREF_PERMISSION: Record<string, StaffPermission> = Object.fromEntries(
  ADMIN_ROUTE_PERMISSIONS.map((r) => [r.prefix, r.permission]),
);
