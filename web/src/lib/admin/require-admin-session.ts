import "server-only";

import { redirect } from "next/navigation";

import { resolveStaffAccess } from "@/lib/admin/resolve-staff-access";
import { createSupabaseServerClient } from "@/lib/supabase/server";

/** Gate admin console pages (Node runtime — service role available on Vercel). */
export async function requireAdminSession() {
  let supabase;
  try {
    supabase = await createSupabaseServerClient();
  } catch {
    redirect("/admin/login?error=config");
  }

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/admin/login");
  }

  const isStaff = await resolveStaffAccess(supabase, user.id);
  if (!isStaff) {
    await supabase.auth.signOut();
    redirect("/admin/login?error=forbidden");
  }

  return { supabase, user };
}
