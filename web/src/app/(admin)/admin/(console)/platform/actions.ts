"use server";

import { revalidatePath } from "next/cache";

import { writeAdminAudit } from "@/lib/admin/audit-log";
import { generatePartnerApiSecret, hashPartnerApiKey, partnerKeyPrefixFromSecret } from "@/lib/admin/partner-api-key";
import { createSupabaseServerClient } from "@/lib/supabase/server";

async function requireStaffId(): Promise<{ supabase: Awaited<ReturnType<typeof createSupabaseServerClient>>; userId: string } | null> {
  try {
    const supabase = await createSupabaseServerClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user?.id) return null;
    const { data: profile } = await supabase.from("profiles").select("role_admin").eq("id", user.id).maybeSingle();
    if (!profile?.role_admin) return null;
    return { supabase, userId: user.id };
  } catch {
    return null;
  }
}

export async function toggleFeatureFlagForm(formData: FormData): Promise<void> {
  const gate = await requireStaffId();
  if (!gate) return;
  const key = String(formData.get("key") ?? "").trim();
  const enabled = String(formData.get("enabled") ?? "") === "true";
  if (!key) return;
  await gate.supabase.from("feature_flags").update({ enabled, updated_at: new Date().toISOString() }).eq("key", key);
  await writeAdminAudit(gate.supabase, {
    staffUserId: gate.userId,
    action: enabled ? "feature_flag.enable" : "feature_flag.disable",
    entityType: "feature_flag",
    entityId: key,
    metadata: { key, enabled },
  });
  revalidatePath("/admin/platform");
}

export async function createPartnerApiKeyAction(label: string): Promise<{ secret?: string; error?: string }> {
  const gate = await requireStaffId();
  if (!gate) return { error: "Unauthorized." };
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
    created_by: gate.userId,
  });
  if (error) return { error: error.message };
  await writeAdminAudit(gate.supabase, {
    staffUserId: gate.userId,
    action: "partner_api_key.create",
    entityType: "partner_api_keys",
    metadata: { label: trimmed },
  });
  revalidatePath("/admin/platform");
  return { secret };
}

export async function revokePartnerApiKeyForm(formData: FormData): Promise<void> {
  const gate = await requireStaffId();
  if (!gate) return;
  const id = String(formData.get("id") ?? "").trim();
  if (!id) return;
  await gate.supabase.from("partner_api_keys").update({ revoked_at: new Date().toISOString() }).eq("id", id);
  await writeAdminAudit(gate.supabase, {
    staffUserId: gate.userId,
    action: "partner_api_key.revoke",
    entityType: "partner_api_keys",
    entityId: id,
  });
  revalidatePath("/admin/platform");
}

export async function toggleComplianceTaskForm(formData: FormData): Promise<void> {
  const gate = await requireStaffId();
  if (!gate) return;
  const taskId = String(formData.get("taskId") ?? "").trim();
  const done = String(formData.get("done") ?? "") === "true";
  if (!taskId) return;
  await gate.supabase
    .from("compliance_tasks")
    .update({
      completed_at: done ? new Date().toISOString() : null,
      completed_by: done ? gate.userId : null,
    })
    .eq("id", taskId);
  await writeAdminAudit(gate.supabase, {
    staffUserId: gate.userId,
    action: done ? "compliance_task.complete" : "compliance_task.uncomplete",
    entityType: "compliance_tasks",
    entityId: taskId,
    metadata: { done },
  });
  revalidatePath("/admin/platform");
}
