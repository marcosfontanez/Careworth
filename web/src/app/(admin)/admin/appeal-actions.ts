"use server";

import { revalidatePath } from "next/cache";

import { writeAdminAudit } from "@/lib/admin/audit-log";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export async function setAppealStatus(
  appealId: string,
  nextStatus: "approved" | "rejected" | "reviewed",
): Promise<{ ok: boolean; error?: string }> {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user?.id) return { ok: false, error: "Not signed in" };

  const { data: profile } = await supabase.from("profiles").select("role_admin").eq("id", user.id).maybeSingle();
  if (!profile?.role_admin) return { ok: false, error: "Forbidden" };

  const { error } = await supabase.from("content_appeals").update({ status: nextStatus }).eq("id", appealId);

  if (error) return { ok: false, error: error.message };

  await writeAdminAudit(supabase, {
    staffUserId: user.id,
    action: `appeal.status.${nextStatus}`,
    entityType: "content_appeal",
    entityId: appealId,
    metadata: { nextStatus },
  });

  revalidatePath("/admin", "layout");
  revalidatePath("/admin/appeals");
  revalidatePath("/admin/dashboard");
  return { ok: true };
}
