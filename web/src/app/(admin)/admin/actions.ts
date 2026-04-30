"use server";

import { redirect } from "next/navigation";

import { createSupabaseServerClient } from "@/lib/supabase/server";

export async function signInAdmin(formData: FormData) {
  const email = String(formData.get("email") ?? "").trim();
  const password = String(formData.get("password") ?? "");
  const next = String(formData.get("next") ?? "").trim();

  if (!email || !password) {
    redirect("/admin/login?error=1");
  }

  let supabase;
  try {
    supabase = await createSupabaseServerClient();
  } catch {
    redirect("/admin/login?error=config");
  }

  const { error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) {
    redirect("/admin/login?error=auth");
  }

  // Ensure auth cookies are written before redirect (important for subsequent server actions).
  await supabase.auth.getSession();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    redirect("/admin/login?error=auth");
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("role_admin")
    .eq("id", user.id)
    .maybeSingle();

  if (!profile?.role_admin) {
    await supabase.auth.signOut();
    redirect("/admin/login?error=forbidden");
  }

  if (next.startsWith("/admin") && next !== "/admin/login") {
    redirect(next);
  }
  redirect("/admin/dashboard");
}

export async function signOutAdmin() {
  let supabase;
  try {
    supabase = await createSupabaseServerClient();
  } catch {
    redirect("/admin/login");
  }
  await supabase.auth.signOut();
  redirect("/admin/login");
}
