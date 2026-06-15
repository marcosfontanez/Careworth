"use server";

import {
  adminBanUser,
  adminLiftBan,
  adminSetRoleAdmin,
  adminSetVerified,
  adminSuspendUser,
} from "@/lib/admin/user-admin-mutations";

export async function grantStaffAction(targetUserId: string, staffNote?: string) {
  return adminSetRoleAdmin(targetUserId, true, staffNote);
}

export async function revokeStaffAction(targetUserId: string, staffNote?: string) {
  return adminSetRoleAdmin(targetUserId, false, staffNote);
}

export async function toggleVerifiedAction(targetUserId: string, isVerified: boolean, staffNote?: string) {
  return adminSetVerified(targetUserId, isVerified, staffNote);
}

export async function banUserAction(targetUserId: string, reason: string, staffNote?: string) {
  return adminBanUser(targetUserId, reason, staffNote);
}

export async function liftBanAction(targetUserId: string, staffNote?: string) {
  return adminLiftBan(targetUserId, staffNote);
}

export async function suspendUserAction(
  targetUserId: string,
  reason: string,
  days: number,
  staffNote?: string,
) {
  const expiresAt = new Date(Date.now() + days * 24 * 60 * 60 * 1000).toISOString();
  return adminSuspendUser(targetUserId, reason, expiresAt, staffNote);
}
