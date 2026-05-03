"use server";

import { revalidatePath } from "next/cache";
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
    console.error("[signInAdmin] Supabase:", error.message);
    const em = error.message.toLowerCase();
    if (em.includes("email not confirmed") || em.includes("confirm your email")) {
      redirect("/admin/login?error=confirm");
    }
    redirect("/admin/login?error=auth");
  }

  // Ensure auth cookies are written before redirect (important for subsequent server actions).
  await supabase.auth.getSession();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    console.error("[signInAdmin] No session after signInWithPassword — check cookie errors in Vercel logs.");
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

  revalidatePath("/", "layout");
  revalidatePath("/admin", "layout");

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
