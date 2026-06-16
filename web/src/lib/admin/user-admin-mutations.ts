import "server-only";

import { revalidatePath } from "next/cache";

import type { SupabaseClient } from "@supabase/supabase-js";

import { writeAdminAudit } from "@/lib/admin/audit-log";
import { requireAdminSupabaseForModeration } from "@/lib/admin/moderation-auth";
import { requireStaffPermission, type StaffPermission } from "@/lib/admin/staff-permissions";
import { normalizeStaffRoles, type StaffRole } from "@/lib/staffPermissions-shared";
import { createAdminDataSupabaseClient } from "@/lib/supabase/admin-data";
import { isSupabaseConfigured } from "@/lib/supabase/server";

async function gate(permission?: StaffPermission) {
  const g = await requireAdminSupabaseForModeration();
  if (!g.ok) return g;
  if (!permission) return g;
  const perm = await requireStaffPermission(g.supabase, g.adminUserId, permission);
  if (!perm.ok) return { ok: false as const, error: perm.error };
  return g;
}

function auditMeta(extra?: Record<string, unknown>) {
  return { source_surface: "web", timestamp: new Date().toISOString(), ...(extra ?? {}) };
}

export type AdminUserDetailProfile = {
  id: string;
  displayName: string;
  username: string | null;
  profession: string;
  specialty: string;
  avatarUrl: string | null;
  roleAdmin: boolean;
  staffRoles: StaffRole[];
  isVerified: boolean;
  createdAt: string;
  followerCount: number;
  postCount: number;
};

export type AdminUserBanRow = {
  id: string;
  reason: string;
  createdAt: string;
  expiresAt: string | null;
  bannedBy: string | null;
};

export type AdminUserReportSnippet = {
  id: string;
  targetType: string;
  targetId: string;
  reason: string;
  status: string;
  createdAt: string;
};

export type AdminUserAuditSnippet = {
  id: string;
  action: string;
  entityType: string;
  entityId: string | null;
  createdAt: string;
  metadata: Record<string, unknown>;
};

export type AdminUserContentSnippet = {
  id: string;
  caption: string | null;
  privacyMode: string | null;
  createdAt: string;
};

export type AdminUserDetail = {
  profile: AdminUserDetailProfile;
  activeBan: AdminUserBanRow | null;
  staffCount: number;
  reportsByUser: AdminUserReportSnippet[];
  reportsAgainstUser: AdminUserReportSnippet[];
  moderationAudit: AdminUserAuditSnippet[];
  recentPosts: AdminUserContentSnippet[];
};

export async function loadAdminUserDetail(userId: string): Promise<AdminUserDetail | null> {
  if (!isSupabaseConfigured()) return null;
  try {
    const supabase = await createAdminDataSupabaseClient();
    const now = new Date().toISOString();

    const { data: profile, error: profileErr } = await supabase
      .from("profiles")
      .select(
        "id, display_name, username, role, specialty, avatar_url, role_admin, staff_roles, is_verified, created_at, follower_count, post_count",
      )
      .eq("id", userId)
      .maybeSingle();

    if (profileErr || !profile) return null;

    const [
      { data: bans },
      { count: staffCount },
      { data: reportsBy },
      { data: reportsAgainst },
      { data: auditRows },
      { data: posts },
    ] = await Promise.all([
      supabase
        .from("user_bans")
        .select("id, reason, created_at, expires_at, banned_by")
        .eq("user_id", userId)
        .or(`expires_at.is.null,expires_at.gt.${now}`)
        .order("created_at", { ascending: false })
        .limit(1),
      supabase.from("profiles").select("id", { count: "exact", head: true }).eq("role_admin", true),
      supabase
        .from("reports")
        .select("id, target_type, target_id, reason, status, created_at")
        .eq("reporter_id", userId)
        .order("created_at", { ascending: false })
        .limit(20),
      supabase
        .from("reports")
        .select("id, target_type, target_id, reason, status, created_at")
        .eq("target_type", "profile")
        .eq("target_id", userId)
        .order("created_at", { ascending: false })
        .limit(20),
      supabase
        .from("admin_audit_log")
        .select("id, action, entity_type, entity_id, created_at, metadata")
        .eq("entity_id", userId)
        .order("created_at", { ascending: false })
        .limit(30),
      supabase
        .from("posts")
        .select("id, caption, privacy_mode, created_at")
        .eq("creator_id", userId)
        .order("created_at", { ascending: false })
        .limit(12),
    ]);

    const activeBan = (bans ?? [])[0]
      ? {
          id: bans![0].id as string,
          reason: bans![0].reason as string,
          createdAt: bans![0].created_at as string,
          expiresAt: (bans![0].expires_at as string | null) ?? null,
          bannedBy: (bans![0].banned_by as string | null) ?? null,
        }
      : null;

    return {
      profile: {
        id: profile.id,
        displayName: (profile.display_name as string) || "Unknown",
        username: (profile.username as string | null) ?? null,
        profession: (profile.role as string) || "—",
        specialty: (profile.specialty as string) || "—",
        avatarUrl: (profile.avatar_url as string | null) ?? null,
        roleAdmin: profile.role_admin === true,
        staffRoles: normalizeStaffRoles(
          Array.isArray(profile.staff_roles) ? (profile.staff_roles as string[]) : [],
          profile.role_admin === true,
        ),
        isVerified: profile.is_verified === true,
        createdAt: profile.created_at as string,
        followerCount: Number(profile.follower_count ?? 0),
        postCount: Number(profile.post_count ?? 0),
      },
      activeBan,
      staffCount: staffCount ?? 0,
      reportsByUser: (reportsBy ?? []).map((r) => ({
        id: r.id as string,
        targetType: r.target_type as string,
        targetId: r.target_id as string,
        reason: r.reason as string,
        status: r.status as string,
        createdAt: r.created_at as string,
      })),
      reportsAgainstUser: (reportsAgainst ?? []).map((r) => ({
        id: r.id as string,
        targetType: r.target_type as string,
        targetId: r.target_id as string,
        reason: r.reason as string,
        status: r.status as string,
        createdAt: r.created_at as string,
      })),
      moderationAudit: (auditRows ?? []).map((a) => ({
        id: a.id as string,
        action: a.action as string,
        entityType: a.entity_type as string,
        entityId: (a.entity_id as string | null) ?? null,
        createdAt: a.created_at as string,
        metadata: (a.metadata as Record<string, unknown>) ?? {},
      })),
      recentPosts: (posts ?? []).map((p) => ({
        id: p.id as string,
        caption: (p.caption as string | null) ?? null,
        privacyMode: (p.privacy_mode as string | null) ?? null,
        createdAt: p.created_at as string,
      })),
    };
  } catch (e) {
    console.error("loadAdminUserDetail:", e);
    return null;
  }
}

export async function countStaffAdmins(supabase: SupabaseClient): Promise<number> {
  const { count } = await supabase.from("profiles").select("id", { count: "exact", head: true }).eq("role_admin", true);
  return count ?? 0;
}

export async function adminSetStaffRoles(
  targetUserId: string,
  roles: StaffRole[],
  staffNote?: string,
): Promise<{ ok: boolean; error?: string }> {
  const g = await gate("users.staff_manage");
  if (!g.ok) return { ok: false, error: g.error };
  const { supabase, adminUserId } = g;

  const normalized = normalizeStaffRoles(roles);
  if (normalized.length === 0) {
    return { ok: false, error: "Select at least one staff role." };
  }

  const { data: target } = await supabase
    .from("profiles")
    .select("staff_roles, role_admin")
    .eq("id", targetUserId)
    .maybeSingle();
  if (!target) return { ok: false, error: "User not found" };

  const previous = normalizeStaffRoles(
    Array.isArray(target.staff_roles) ? (target.staff_roles as string[]) : [],
    target.role_admin === true,
  );

  const { error } = await supabase.rpc("admin_profile_set_staff_roles", {
    p_target_user_id: targetUserId,
    p_staff_roles: normalized,
  });
  if (error) {
    if (error.message.includes("last_owner_lockout")) {
      return { ok: false, error: "Cannot remove the last owner. Promote another owner first." };
    }
    return { ok: false, error: error.message };
  }

  await writeAdminAudit(supabase, {
    staffUserId: adminUserId,
    action: "staff.roles.update",
    entityType: "profile",
    entityId: targetUserId,
    metadata: auditMeta({
      target_user_id: targetUserId,
      actor_user_id: adminUserId,
      previous_roles: previous,
      new_roles: normalized,
      staff_note: staffNote?.trim() || null,
    }),
  });

  revalidatePath("/admin/users");
  revalidatePath(`/admin/users/${targetUserId}`);
  revalidatePath("/admin/audit");
  return { ok: true };
}

export async function adminSetRoleAdmin(
  targetUserId: string,
  roleAdmin: boolean,
  staffNote?: string,
): Promise<{ ok: boolean; error?: string }> {
  const g = await gate("users.staff_manage");
  if (!g.ok) return { ok: false, error: g.error };
  const { supabase, adminUserId } = g;

  const { data: target } = await supabase
    .from("profiles")
    .select("role_admin")
    .eq("id", targetUserId)
    .maybeSingle();
  if (!target) return { ok: false, error: "User not found" };

  const prev = target.role_admin === true;

  if (!roleAdmin && prev) {
    const staffCount = await countStaffAdmins(supabase);
    if (staffCount <= 1) {
      return { ok: false, error: "Cannot revoke the last staff account. Promote another staff member first." };
    }
    if (targetUserId === adminUserId && staffCount <= 1) {
      return { ok: false, error: "You cannot revoke your own staff access when no other staff exists." };
    }
  }

  const { error } = await supabase.rpc("admin_profile_set_role_admin", {
    p_target_user_id: targetUserId,
    p_role_admin: roleAdmin,
  });
  if (error) return { ok: false, error: error.message };

  await writeAdminAudit(supabase, {
    staffUserId: adminUserId,
    action: roleAdmin ? "staff.grant" : "staff.revoke",
    entityType: "profile",
    entityId: targetUserId,
    metadata: auditMeta({
      target_user_id: targetUserId,
      actor_user_id: adminUserId,
      old_value: prev,
      new_value: roleAdmin,
      staff_note: staffNote?.trim() || null,
    }),
  });

  revalidatePath("/admin/users");
  revalidatePath(`/admin/users/${targetUserId}`);
  revalidatePath("/admin/audit");
  return { ok: true };
}

export async function adminSetVerified(
  targetUserId: string,
  isVerified: boolean,
  staffNote?: string,
): Promise<{ ok: boolean; error?: string }> {
  const g = await gate("users.moderate");
  if (!g.ok) return { ok: false, error: g.error };
  const { supabase, adminUserId } = g;

  const { data: target } = await supabase.from("profiles").select("is_verified").eq("id", targetUserId).maybeSingle();
  if (!target) return { ok: false, error: "User not found" };
  const prev = target.is_verified === true;

  const { error } = await supabase.rpc("admin_profile_set_is_verified", {
    p_target_user_id: targetUserId,
    p_is_verified: isVerified,
  });
  if (error) return { ok: false, error: error.message };

  await writeAdminAudit(supabase, {
    staffUserId: adminUserId,
    action: isVerified ? "verified.grant" : "verified.revoke",
    entityType: "profile",
    entityId: targetUserId,
    metadata: auditMeta({
      target_user_id: targetUserId,
      actor_user_id: adminUserId,
      old_value: prev,
      new_value: isVerified,
      staff_note: staffNote?.trim() || null,
    }),
  });

  revalidatePath("/admin/users");
  revalidatePath(`/admin/users/${targetUserId}`);
  revalidatePath("/admin/audit");
  return { ok: true };
}

export async function adminBanUser(
  targetUserId: string,
  reason: string,
  staffNote?: string,
): Promise<{ ok: boolean; error?: string }> {
  const g = await gate("users.moderate");
  if (!g.ok) return { ok: false, error: g.error };
  const { supabase, adminUserId } = g;

  const trimmed = reason.trim();
  if (!trimmed) return { ok: false, error: "Ban reason is required." };

  const { error } = await supabase.from("user_bans").insert({
    user_id: targetUserId,
    banned_by: adminUserId,
    reason: trimmed.slice(0, 900),
  });
  if (error) return { ok: false, error: error.message };

  await writeAdminAudit(supabase, {
    staffUserId: adminUserId,
    action: "user.ban",
    entityType: "profile",
    entityId: targetUserId,
    metadata: auditMeta({
      target_user_id: targetUserId,
      reason: trimmed.slice(0, 200),
      staff_note: staffNote?.trim() || null,
    }),
  });

  revalidatePath("/admin/users");
  revalidatePath(`/admin/users/${targetUserId}`);
  revalidatePath("/admin/audit");
  return { ok: true };
}

export async function adminLiftBan(
  targetUserId: string,
  staffNote?: string,
): Promise<{ ok: boolean; error?: string }> {
  const g = await gate("users.moderate");
  if (!g.ok) return { ok: false, error: g.error };
  const { supabase, adminUserId } = g;

  const now = new Date().toISOString();
  const { data: active, error: readErr } = await supabase
    .from("user_bans")
    .select("id, reason")
    .eq("user_id", targetUserId)
    .or(`expires_at.is.null,expires_at.gt.${now}`);

  if (readErr) return { ok: false, error: readErr.message };
  if (!active?.length) return { ok: false, error: "No active ban found for this user." };

  const { error } = await supabase.from("user_bans").delete().in(
    "id",
    active.map((b) => b.id as string),
  );
  if (error) return { ok: false, error: error.message };

  await writeAdminAudit(supabase, {
    staffUserId: adminUserId,
    action: "user.unban",
    entityType: "profile",
    entityId: targetUserId,
    metadata: auditMeta({
      target_user_id: targetUserId,
      lifted_ban_ids: active.map((b) => b.id),
      staff_note: staffNote?.trim() || null,
    }),
  });

  revalidatePath("/admin/users");
  revalidatePath(`/admin/users/${targetUserId}`);
  revalidatePath("/admin/audit");
  return { ok: true };
}

export async function adminSuspendUser(
  targetUserId: string,
  reason: string,
  expiresAt: string,
  staffNote?: string,
): Promise<{ ok: boolean; error?: string }> {
  const g = await gate("users.moderate");
  if (!g.ok) return { ok: false, error: g.error };
  const { supabase, adminUserId } = g;

  const trimmed = reason.trim();
  if (!trimmed) return { ok: false, error: "Suspension reason is required." };

  const { error } = await supabase.from("user_bans").insert({
    user_id: targetUserId,
    banned_by: adminUserId,
    reason: trimmed.slice(0, 900),
    expires_at: expiresAt,
  });
  if (error) return { ok: false, error: error.message };

  await writeAdminAudit(supabase, {
    staffUserId: adminUserId,
    action: "user.suspend",
    entityType: "profile",
    entityId: targetUserId,
    metadata: auditMeta({
      target_user_id: targetUserId,
      reason: trimmed.slice(0, 200),
      expires_at: expiresAt,
      staff_note: staffNote?.trim() || null,
    }),
  });

  revalidatePath("/admin/users");
  revalidatePath(`/admin/users/${targetUserId}`);
  revalidatePath("/admin/audit");
  return { ok: true };
}
