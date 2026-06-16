"use server";

import { revalidatePath } from "next/cache";

import { writeAdminAudit } from "@/lib/admin/audit-log";
import { generatePartnerApiSecret, hashPartnerApiKey, partnerKeyPrefixFromSecret } from "@/lib/admin/partner-api-key";
import { requireStaffActionPermission } from "@/lib/admin/staff-permissions";

export async function toggleFeatureFlagForm(formData: FormData): Promise<void> {
  const gate = await requireStaffActionPermission("platform.flags");
  if (!gate.ok) return;
  const key = String(formData.get("key") ?? "").trim();
  const enabled = String(formData.get("enabled") ?? "") === "true";
  if (!key) return;
  await gate.supabase.from("feature_flags").update({ enabled, updated_at: new Date().toISOString() }).eq("key", key);
  await writeAdminAudit(gate.supabase, {
    staffUserId: gate.ctx.userId,
    action: enabled ? "feature_flag.enable" : "feature_flag.disable",
    entityType: "feature_flag",
    entityId: key,
    metadata: { key, enabled, source_surface: "web" },
  });
  revalidatePath("/admin/platform");
}

export async function createPartnerApiKeyAction(label: string): Promise<{ secret?: string; error?: string }> {
  const gate = await requireStaffActionPermission("platform.api_keys");
  if (!gate.ok) return { error: "Unauthorized." };
  const trimmed = label.trim().slice(0, 120);
  if (!trimmed) return { error: "Label required." };
  const secret = generatePartnerApiSecret();
  const key_hash = hashPartnerApiKey(secret);
  const key_prefix = partnerKeyPrefixFromSecret(secret);
  const { error } = await gate.supabase.from("partner_api_keys").insert({
    label: trimmed,
    key_prefix,
    key_hash,
    scopes: ["read:health"],
    created_by: gate.ctx.userId,
  });
  if (error) return { error: error.message };
  await writeAdminAudit(gate.supabase, {
    staffUserId: gate.ctx.userId,
    action: "partner_api_key.create",
    entityType: "partner_api_keys",
    metadata: { label: trimmed, source_surface: "web" },
  });
  revalidatePath("/admin/platform");
  return { secret };
}

export async function revokePartnerApiKeyForm(formData: FormData): Promise<void> {
  const gate = await requireStaffActionPermission("platform.api_keys");
  if (!gate.ok) return;
  const id = String(formData.get("id") ?? "").trim();
  if (!id) return;
  await gate.supabase.from("partner_api_keys").update({ revoked_at: new Date().toISOString() }).eq("id", id);
  await writeAdminAudit(gate.supabase, {
    staffUserId: gate.ctx.userId,
    action: "partner_api_key.revoke",
    entityType: "partner_api_keys",
    entityId: id,
    metadata: { source_surface: "web" },
  });
  revalidatePath("/admin/platform");
}

export async function toggleComplianceTaskForm(formData: FormData): Promise<void> {
  const gate = await requireStaffActionPermission("platform.compliance");
  if (!gate.ok) return;
  const taskId = String(formData.get("taskId") ?? "").trim();
  const done = String(formData.get("done") ?? "") === "true";
  if (!taskId) return;
  await gate.supabase
    .from("compliance_tasks")
    .update({
      completed_at: done ? new Date().toISOString() : null,
      completed_by: done ? gate.ctx.userId : null,
    })
    .eq("id", taskId);
  await writeAdminAudit(gate.supabase, {
    staffUserId: gate.ctx.userId,
    action: done ? "compliance_task.complete" : "compliance_task.uncomplete",
    entityType: "compliance_tasks",
    entityId: taskId,
    metadata: { done, source_surface: "web" },
  });
  revalidatePath("/admin/platform");
}
