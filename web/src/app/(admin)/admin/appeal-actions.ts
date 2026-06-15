"use server";

import { revalidatePath } from "next/cache";

import { writeAdminAudit } from "@/lib/admin/audit-log";
import { requireAdminSupabaseForModeration } from "@/lib/admin/moderation-auth";

export type AppealDecisionMode = "reviewing" | "approve_restore" | "approve_manual" | "reject";

export async function decideAppeal(
  appealId: string,
  mode: AppealDecisionMode,
  opts?: { staffNote?: string; rejectionReason?: string },
): Promise<{ ok: boolean; error?: string; banner?: string }> {
  const g = await requireAdminSupabaseForModeration();
  if (!g.ok) return { ok: false, error: g.error };
  const { supabase, adminUserId } = g;

  const { data: appeal, error: readErr } = await supabase
    .from("content_appeals")
    .select("id, user_id, post_id, status, message")
    .eq("id", appealId)
    .maybeSingle();
  if (readErr || !appeal) return { ok: false, error: readErr?.message ?? "Appeal not found" };

  const prevStatus = appeal.status as string;
  let nextStatus: string;
  let banner: string | undefined;
  let restored = false;

  if (mode === "reviewing") {
    nextStatus = "reviewed";
    banner = "Appeal marked under review. Decide approve or reject when ready.";
  } else if (mode === "reject") {
    nextStatus = "rejected";
    banner = "Appeal rejected. User is not notified automatically — follow up if needed.";
  } else {
    nextStatus = "approved";
    if (appeal.post_id && mode === "approve_restore") {
      const { data: post } = await supabase
        .from("posts")
        .select("privacy_mode")
        .eq("id", appeal.post_id as string)
        .maybeSingle();
      const wasHidden = post?.privacy_mode === "private";
      if (wasHidden) {
        const { error: rpcErr } = await supabase.rpc("admin_post_set_privacy_mode", {
          p_post_id: appeal.post_id as string,
          p_privacy_mode: "public",
        });
        if (rpcErr) {
          return {
            ok: false,
            error: `Approved but restore failed: ${rpcErr.message}. Use manual restore.`,
          };
        }
        restored = true;
        await writeAdminAudit(supabase, {
          staffUserId: adminUserId,
          action: "appeal.content.restore",
          entityType: "post",
          entityId: appeal.post_id as string,
          metadata: {
            source_surface: "web",
            appeal_id: appealId,
            old_privacy_mode: "private",
            new_privacy_mode: "public",
          },
        });
        banner = "Appeal approved and post visibility restored to public.";
      } else {
        banner = "Appeal approved. Post was not hidden — no restore needed.";
      }
    } else if (mode === "approve_manual") {
      banner =
        "Appeal approved — manual restore required. Reinstate content or account access in Moderation / user tools.";
    } else {
      banner = "Appeal approved.";
    }
  }

  const { error } = await supabase.from("content_appeals").update({ status: nextStatus }).eq("id", appealId);
  if (error) return { ok: false, error: error.message };

  await writeAdminAudit(supabase, {
    staffUserId: adminUserId,
    action: `appeal.${mode}`,
    entityType: "content_appeal",
    entityId: appealId,
    metadata: {
      source_surface: "web",
      actor_user_id: adminUserId,
      target_user_id: appeal.user_id,
      post_id: appeal.post_id,
      old_status: prevStatus,
      new_status: nextStatus,
      restored,
      staff_note: opts?.staffNote?.trim() || null,
      rejection_reason: opts?.rejectionReason?.trim() || null,
    },
  });

  revalidatePath("/admin", "layout");
  revalidatePath("/admin/appeals");
  revalidatePath("/admin/dashboard");
  revalidatePath("/admin/audit");
  return { ok: true, banner };
}

/** @deprecated Use decideAppeal */
export async function setAppealStatus(
  appealId: string,
  nextStatus: "approved" | "rejected" | "reviewed",
): Promise<{ ok: boolean; error?: string }> {
  const mode =
    nextStatus === "approved"
      ? "approve_restore"
      : nextStatus === "rejected"
        ? "reject"
        : "reviewing";
  return decideAppeal(appealId, mode);
}
