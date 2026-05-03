"use server";

import { revalidatePath } from "next/cache";

import { writeAdminAudit } from "@/lib/admin/audit-log";
import { createAdminDataSupabaseClient } from "@/lib/supabase/admin-data";
import { createSupabaseServerClient } from "@/lib/supabase/server";

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

async function requireStaffId(): Promise<string | null> {
  try {
    const supabase = await createSupabaseServerClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user?.id) return null;
    const { data: profile } = await supabase.from("profiles").select("role_admin").eq("id", user.id).maybeSingle();
    if (!profile?.role_admin) return null;
    return user.id;
  } catch {
    return null;
  }
}

export async function grantPulseAvatarFrameAction(input: {
  targetUserId: string;
  frameId: string;
  alsoEquip?: boolean;
}): Promise<{ ok: true; note?: string } | { ok: false; error: string }> {
  const staffId = await requireStaffId();
  if (!staffId) return { ok: false, error: "Unauthorized." };

  const targetUserId = input.targetUserId.trim();
  const frameId = input.frameId.trim();
  if (!UUID_RE.test(targetUserId)) return { ok: false, error: "Enter a valid user UUID." };
  if (!UUID_RE.test(frameId)) return { ok: false, error: "Choose a border from the list." };

  const admin = await createAdminDataSupabaseClient();

  const { data: profile, error: profErr } = await admin.from("profiles").select("id").eq("id", targetUserId).maybeSingle();
  if (profErr) return { ok: false, error: profErr.message };
  if (!profile) return { ok: false, error: "No profile found for that user id." };

  const { data: frame, error: frameErr } = await admin
    .from("pulse_avatar_frames")
    .select("id, label, slug")
    .eq("id", frameId)
    .maybeSingle();
  if (frameErr) return { ok: false, error: frameErr.message };
  if (!frame) return { ok: false, error: "That border is not in the catalog." };

  const { data: existing } = await admin
    .from("user_pulse_avatar_frames")
    .select("user_id")
    .eq("user_id", targetUserId)
    .eq("frame_id", frameId)
    .maybeSingle();

  if (existing) {
    if (input.alsoEquip) {
      const { error: updErr } = await admin
        .from("profiles")
        .update({ selected_pulse_avatar_frame_id: frameId, updated_at: new Date().toISOString() })
        .eq("id", targetUserId);
      if (updErr) return { ok: false, error: updErr.message };
      await writeAdminAudit(admin, {
        staffUserId: staffId,
        action: "equip_pulse_avatar_frame",
        entityType: "user",
        entityId: targetUserId,
        metadata: { frame_id: frameId, slug: frame.slug, label: frame.label },
      });
      revalidatePath("/admin/avatar-borders");
      return { ok: true, note: "User already had this border; set it as equipped." };
    }
    return { ok: false, error: "User already has this border unlocked." };
  }

  const { error: insErr } = await admin.from("user_pulse_avatar_frames").insert({
    user_id: targetUserId,
    frame_id: frameId,
    leaderboard_rank: 0,
    grant_source: "admin",
  });

  if (insErr) return { ok: false, error: insErr.message };

  if (input.alsoEquip) {
    const { error: updErr } = await admin
      .from("profiles")
      .update({ selected_pulse_avatar_frame_id: frameId, updated_at: new Date().toISOString() })
      .eq("id", targetUserId);
    if (updErr) return { ok: false, error: `Unlocked, but could not equip: ${updErr.message}` };
  }

  await writeAdminAudit(admin, {
    staffUserId: staffId,
    action: "grant_pulse_avatar_frame",
    entityType: "user",
    entityId: targetUserId,
    metadata: {
      frame_id: frameId,
      slug: frame.slug,
      label: frame.label,
      also_equip: Boolean(input.alsoEquip),
    },
  });

  revalidatePath("/admin/avatar-borders");
  return { ok: true };
}
