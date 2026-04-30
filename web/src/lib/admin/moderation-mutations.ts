import "server-only";

import { revalidatePath } from "next/cache";

import type { SupabaseClient } from "@supabase/supabase-js";

import { requireAdminSupabaseForModeration } from "@/lib/admin/moderation-auth";
import { enqueueWebhookOutbox, writeAdminAudit } from "@/lib/admin/audit-log";

function revalidateReportSurfaces() {
  revalidatePath("/admin", "layout");
  revalidatePath("/admin/moderation");
  revalidatePath("/admin/reports");
  revalidatePath("/admin/dashboard");
  revalidatePath("/admin/insights");
}

type DbReportStatus = "pending" | "reviewed" | "action_taken" | "dismissed";

function mergeStaffNote(existing: string | null | undefined, addition: string): string {
  const line = `[${new Date().toISOString()}] ${addition.trim()}`;
  const prev = (existing ?? "").trim();
  return prev ? `${prev}\n${line}` : line;
}

async function fetchStaffNotes(supabase: SupabaseClient, reportId: string): Promise<string | null> {
  const { data, error } = await supabase.from("reports").select("staff_notes").eq("id", reportId).maybeSingle();
  if (error) {
    console.warn("fetchStaffNotes:", error.message);
    return null;
  }
  return (data?.staff_notes as string | null) ?? null;
}

async function updateReport(
  supabase: SupabaseClient,
  reportId: string,
  adminUserId: string,
  status: DbReportStatus,
  internalNote?: string,
): Promise<{ ok: boolean; error?: string }> {
  let staff_notes: string | undefined;
  if (internalNote?.trim()) {
    const prev = await fetchStaffNotes(supabase, reportId);
    staff_notes = mergeStaffNote(prev, internalNote.trim());
  }

  const payload: Record<string, unknown> = {
    status,
    reviewed_by: adminUserId,
    reviewed_at: new Date().toISOString(),
  };
  if (staff_notes !== undefined) payload.staff_notes = staff_notes;

  const { error } = await supabase.from("reports").update(payload).eq("id", reportId);

  if (error) {
    const msg = error.message;
    if (/staff_notes|schema cache/i.test(msg)) {
      return {
        ok: false,
        error: `${msg} Apply migration 066_moderation_staff_notes_and_admin_delete.sql (adds staff_notes) or remove internal notes for this action.`,
      };
    }
    return { ok: false, error: msg };
  }
  revalidateReportSurfaces();
  return { ok: true };
}

async function gate() {
  return requireAdminSupabaseForModeration();
}

async function logReportModeration(
  supabase: SupabaseClient,
  staffId: string,
  verb: string,
  reportId: string,
  meta?: Record<string, unknown>,
) {
  await writeAdminAudit(supabase, {
    staffUserId: staffId,
    action: `moderation.${verb}`,
    entityType: "report",
    entityId: reportId,
    metadata: meta ?? {},
  });
  await enqueueWebhookOutbox(supabase, `moderation.${verb}`, { reportId, ...(meta ?? {}) });
}

/** No violation — close report (maps to DB `dismissed`). */
export async function approveReportDismiss(
  reportId: string,
  internalNote?: string,
): Promise<{ ok: boolean; error?: string }> {
  const g = await gate();
  if (!g.ok) return { ok: false, error: g.error };
  const r = await updateReport(g.supabase, reportId, g.adminUserId, "dismissed", internalNote);
  if (r.ok) {
    await logReportModeration(g.supabase, g.adminUserId, "dismiss", reportId, {
      note: internalNote ?? null,
    });
  }
  return r;
}

export async function markReportInReview(
  reportId: string,
  internalNote?: string,
): Promise<{ ok: boolean; error?: string }> {
  const g = await gate();
  if (!g.ok) return { ok: false, error: g.error };
  const r = await updateReport(g.supabase, reportId, g.adminUserId, "reviewed", internalNote);
  if (r.ok) {
    await logReportModeration(g.supabase, g.adminUserId, "review", reportId, { note: internalNote ?? null });
  }
  return r;
}

export async function markReportActionTaken(
  reportId: string,
  internalNote?: string,
): Promise<{ ok: boolean; error?: string }> {
  const g = await gate();
  if (!g.ok) return { ok: false, error: g.error };
  const r = await updateReport(g.supabase, reportId, g.adminUserId, "action_taken", internalNote);
  if (r.ok) {
    await logReportModeration(g.supabase, g.adminUserId, "uphold", reportId, { note: internalNote ?? null });
  }
  return r;
}

export async function warnOnReport(
  reportId: string,
  internalNote?: string,
): Promise<{ ok: boolean; error?: string }> {
  const g = await gate();
  if (!g.ok) return { ok: false, error: g.error };
  const note = internalNote?.trim() || "Moderation warning recorded by staff.";
  const r = await updateReport(g.supabase, reportId, g.adminUserId, "reviewed", `WARN: ${note}`);
  if (r.ok) {
    await logReportModeration(g.supabase, g.adminUserId, "warn", reportId, { note });
  }
  return r;
}

export async function removeReportedContent(
  reportId: string,
  internalNote?: string,
): Promise<{ ok: boolean; error?: string }> {
  const g = await gate();
  if (!g.ok) return { ok: false, error: g.error };
  const { supabase, adminUserId } = g;

  const { data: rep, error: repErr } = await supabase
    .from("reports")
    .select("target_type, target_id")
    .eq("id", reportId)
    .single();

  if (repErr || !rep) return { ok: false, error: repErr?.message ?? "Report not found" };

  const tt = String(rep.target_type);
  const tid = String(rep.target_id);

  if (tt === "post") {
    const { error } = await supabase.from("posts").delete().eq("id", tid);
    if (error) return { ok: false, error: error.message };
  } else if (tt === "comment") {
    const { error } = await supabase.from("comments").delete().eq("id", tid);
    if (error) return { ok: false, error: error.message };
  } else if (tt === "live") {
    const { error } = await supabase
      .from("live_streams")
      .update({
        status: "ended",
        ended_at: new Date().toISOString(),
      })
      .eq("id", tid);
    if (error) return { ok: false, error: error.message };
  } else if (tt === "profile") {
    return {
      ok: false,
      error:
        "Profile reports cannot remove a whole account from here — dismiss the report or use Suspend subject.",
    };
  } else {
    return { ok: false, error: `Unsupported target type for removal: ${tt}` };
  }

  const noteExtra = internalNote?.trim()
    ? internalNote.trim()
    : `Content removed (${tt} ${tid.slice(0, 8)}…)`;
  const closed = await updateReport(supabase, reportId, adminUserId, "action_taken", `REMOVE: ${noteExtra}`);
  if (closed.ok) {
    await logReportModeration(supabase, adminUserId, "remove_content", reportId, {
      targetType: tt,
      targetId: tid,
    });
  }
  return closed;
}

export async function suspendSubjectFromReport(
  reportId: string,
  banReason: string,
  internalNote?: string,
): Promise<{ ok: boolean; error?: string }> {
  const g = await gate();
  if (!g.ok) return { ok: false, error: g.error };
  const { supabase, adminUserId } = g;

  const { data: rep, error: repErr } = await supabase
    .from("reports")
    .select("target_type, target_id")
    .eq("id", reportId)
    .single();

  if (repErr || !rep) return { ok: false, error: repErr?.message ?? "Report not found" };

  let subjectUserId: string | null = null;
  const tt = String(rep.target_type);
  const tid = String(rep.target_id);

  if (tt === "profile") {
    subjectUserId = tid;
  } else if (tt === "post") {
    const { data: post } = await supabase.from("posts").select("creator_id").eq("id", tid).maybeSingle();
    subjectUserId = (post?.creator_id as string) ?? null;
  } else if (tt === "comment") {
    const { data: row } = await supabase.from("comments").select("author_id").eq("id", tid).maybeSingle();
    subjectUserId = (row?.author_id as string) ?? null;
  } else if (tt === "live") {
    const { data: row } = await supabase.from("live_streams").select("host_id").eq("id", tid).maybeSingle();
    subjectUserId = (row?.host_id as string) ?? null;
  }

  if (!subjectUserId) {
    return { ok: false, error: "Could not resolve a user for this report target type." };
  }

  const reason = banReason.trim().slice(0, 900) || "Suspended from admin console";

  const { error: banErr } = await supabase.from("user_bans").insert({
    user_id: subjectUserId,
    banned_by: adminUserId,
    reason,
  });

  if (banErr) return { ok: false, error: banErr.message };

  const note = internalNote?.trim() ? `SUSPEND: ${internalNote.trim()}` : `SUSPEND: ${reason.slice(0, 200)}`;
  const closed = await updateReport(supabase, reportId, adminUserId, "action_taken", note);
  if (!closed.ok) return closed;
  await logReportModeration(supabase, adminUserId, "suspend_subject", reportId, {
    subjectUserId,
    banReason: reason.slice(0, 200),
  });
  revalidatePath("/admin/users");
  return { ok: true };
}

export async function adminEndLiveStream(streamId: string): Promise<{ ok: boolean; error?: string }> {
  const g = await gate();
  if (!g.ok) return { ok: false, error: g.error };

  const { error } = await g.supabase
    .from("live_streams")
    .update({
      status: "ended",
      ended_at: new Date().toISOString(),
    })
    .eq("id", streamId);

  if (error) return { ok: false, error: error.message };
  await writeAdminAudit(g.supabase, {
    staffUserId: g.adminUserId,
    action: "live.admin_end",
    entityType: "live_stream",
    entityId: streamId,
    metadata: {},
  });
  await enqueueWebhookOutbox(g.supabase, "live.admin_ended", { streamId });
  revalidatePath("/admin", "layout");
  revalidatePath("/admin/live");
  revalidatePath("/admin/dashboard");
  return { ok: true };
}
