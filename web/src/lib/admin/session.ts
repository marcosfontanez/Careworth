import "server-only";

import { createSupabaseServerClient } from "@/lib/supabase/server";

export type AdminStaffHeader = { displayName: string; subtitle: string };

export async function getAdminStaffHeader(): Promise<AdminStaffHeader> {
  try {
    const supabase = await createSupabaseServerClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user?.email) {
      return { displayName: "Staff", subtitle: "Admin" };
    }
    const { data: profile } = await supabase
      .from("profiles")
      .select("display_name, role")
      .eq("id", user.id)
      .maybeSingle();
    return {
      displayName: (profile?.display_name as string) || user.email.split("@")[0] || "Staff",
      subtitle: profile?.role ? String(profile.role) : "Administrator",
    };
  } catch {
    return { displayName: "Staff", subtitle: "Admin" };
  }
}
