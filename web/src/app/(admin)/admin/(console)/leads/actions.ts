"use server";

import { revalidatePath } from "next/cache";

import { writeAdminAudit } from "@/lib/admin/audit-log";
import { isMarketingLeadStatus } from "@/lib/admin/marketing-lead-status";
import { requireStaffActionPermission } from "@/lib/admin/staff-permissions";

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

async function requireStaffGate(): Promise<
  { ok: true; supabase: Awaited<ReturnType<typeof import("@/lib/supabase/server").createSupabaseServerClient>>; staffId: string } | { ok: false }
> {
  const gate = await requireStaffActionPermission("leads.write");
  if (!gate.ok) return { ok: false };
  return { ok: true, supabase: gate.supabase, staffId: gate.ctx.userId };
}

export async function updateMarketingLeadAction(formData: FormData): Promise<void> {
  const gate = await requireStaffGate();
  if (!gate.ok) {
    console.warn("updateMarketingLeadAction: unauthorized");
    return;
  }

  const id = String(formData.get("id") ?? "").trim();
  if (!id || !UUID_RE.test(id)) return;

  const statusRaw = String(formData.get("status") ?? "").trim();
  if (!isMarketingLeadStatus(statusRaw)) return;

  const ownerRaw = String(formData.get("owner_id") ?? "").trim();
  const owner_id = ownerRaw && UUID_RE.test(ownerRaw) ? ownerRaw : null;

  const internal_notes = String(formData.get("internal_notes") ?? "").trim() || null;

  const lcRaw = String(formData.get("last_contacted_at") ?? "").trim();
  let last_contacted_at: string | null = null;
  if (lcRaw) {
    const t = new Date(lcRaw).getTime();
    if (!Number.isFinite(t)) return;
    last_contacted_at = new Date(lcRaw).toISOString();
  }

  const { error } = await gate.supabase
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    .from("marketing_contact_messages" as any)
    .update({
      status: statusRaw,
      owner_id,
      internal_notes,
      last_contacted_at,
    })
    .eq("id", id);

  if (error) {
    console.error("updateMarketingLeadAction:", error.message);
    return;
  }

  await writeAdminAudit(gate.supabase, {
    staffUserId: gate.staffId,
    action: "marketing_lead.update",
    entityType: "marketing_contact_message",
    entityId: id,
    metadata: {
      status: statusRaw,
      owner_id,
      has_notes: Boolean(internal_notes),
      last_contacted_at,
    },
  });

  revalidatePath("/admin/leads");
}
