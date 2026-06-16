import "server-only";

import { headers } from "next/headers";
import { redirect } from "next/navigation";

import { resolveStaffAccess } from "@/lib/admin/resolve-staff-access";
import {
  permissionForAdminPath,
  resolveStaffContext,
  staffContextHasPermission,
} from "@/lib/admin/staff-permissions";
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

  const pathname = (await headers()).get("x-pathname") ?? "";
  if (pathname && !pathname.startsWith("/admin/login")) {
    const required = permissionForAdminPath(pathname);
    const ctx = await resolveStaffContext(supabase, user.id);
    if (ctx && required && !staffContextHasPermission(ctx, required)) {
      redirect("/admin/dashboard?error=forbidden");
    }
  }

  return { supabase, user };
}
