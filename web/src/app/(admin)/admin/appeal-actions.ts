"use server";

import { revalidatePath } from "next/cache";

import { createSupabaseServerClient } from "@/lib/supabase/server";

export async function setAppealStatus(
  appealId: string,
  nextStatus: "approved" | "rejected" | "reviewed",
): Promise<{ ok: boolean; error?: string }> {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "Not signed in" };

  const { error } = await supabase.from("content_appeals").update({ status: nextStatus }).eq("id", appealId);

  if (error) return { ok: false, error: error.message };
  revalidatePath("/admin", "layout");
  revalidatePath("/admin/appeals");
  revalidatePath("/admin/dashboard");
  return { ok: true };
}
