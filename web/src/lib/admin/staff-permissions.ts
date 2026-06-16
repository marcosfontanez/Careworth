import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";

import {
  hasStaffPermission,
  normalizeStaffRoles,
  permissionsForRoles,
  type StaffPermission,
  type StaffRole,
} from "@/lib/staffPermissions-shared";
import { resolveStaffAccess } from "@/lib/admin/resolve-staff-access";
import { createAdminDataSupabaseClient } from "@/lib/supabase/admin-data";

export type StaffContext = {
  userId: string;
  roles: StaffRole[];
  permissions: Set<StaffPermission>;
  legacyRoleAdmin: boolean;
  isOwner: boolean;
};

export {
  hasStaffPermission,
  normalizeStaffRoles,
  permissionForAdminPath,
  permissionsForRoles,
  STAFF_PERMISSIONS,
  STAFF_ROLES,
  type StaffPermission,
  type StaffRole,
} from "@/lib/staffPermissions-shared";

async function loadStaffRolesFromDb(userId: string): Promise<{ roles: StaffRole[]; legacyRoleAdmin: boolean }> {
  try {
    const supabase = await createAdminDataSupabaseClient();
    const { data, error } = await supabase
      .from("profiles")
      .select("staff_roles, role_admin")
      .eq("id", userId)
      .maybeSingle();
    if (error || !data) {
      return { roles: [], legacyRoleAdmin: false };
    }
    const rawRoles = Array.isArray(data.staff_roles) ? (data.staff_roles as string[]) : [];
    const legacyRoleAdmin = data.role_admin === true;
    return {
      roles: normalizeStaffRoles(rawRoles, legacyRoleAdmin),
      legacyRoleAdmin,
    };
  } catch {
    return { roles: [], legacyRoleAdmin: false };
  }
}

async function loadStaffRolesViaRpc(supabase: SupabaseClient): Promise<StaffRole[]> {
  const { data, error } = await supabase.rpc("current_user_staff_roles");
  if (error || !Array.isArray(data)) return [];
  return normalizeStaffRoles(data as string[]);
}

export async function resolveStaffContext(
  supabase: SupabaseClient,
  userId: string,
): Promise<StaffContext | null> {
  const isStaff = await resolveStaffAccess(supabase, userId);
  if (!isStaff) return null;

  const fromDb = await loadStaffRolesFromDb(userId);
  let roles = fromDb.roles;
  if (roles.length === 0) {
    const fromRpc = await loadStaffRolesViaRpc(supabase);
    roles = fromRpc.length > 0 ? fromRpc : normalizeStaffRoles([], true);
  }

  return {
    userId,
    roles,
    permissions: permissionsForRoles(roles),
    legacyRoleAdmin: fromDb.legacyRoleAdmin,
    isOwner: roles.includes("owner"),
  };
}

export function staffContextHasPermission(ctx: StaffContext, permission: StaffPermission): boolean {
  return ctx.permissions.has(permission);
}

export async function requireStaffPermission(
  supabase: SupabaseClient,
  userId: string,
  permission: StaffPermission,
): Promise<{ ok: true; ctx: StaffContext } | { ok: false; error: string }> {
  const ctx = await resolveStaffContext(supabase, userId);
  if (!ctx) return { ok: false, error: "Unauthorized" };
  if (!staffContextHasPermission(ctx, permission)) {
    return { ok: false, error: "Forbidden" };
  }
  return { ok: true, ctx };
}

export async function requireStaffActionPermission(
  permission: StaffPermission,
): Promise<{ ok: true; ctx: StaffContext; supabase: SupabaseClient } | { ok: false }> {
  const { createSupabaseServerClient } = await import("@/lib/supabase/server");
  let supabase;
  try {
    supabase = await createSupabaseServerClient();
  } catch {
    return { ok: false };
  }
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false };
  const perm = await requireStaffPermission(supabase, user.id, permission);
  if (!perm.ok) return { ok: false };
  return { ok: true, ctx: perm.ctx, supabase };
}
