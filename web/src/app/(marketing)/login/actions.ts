"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { createSupabaseServerClient, isSupabaseConfigured } from "@/lib/supabase/server";

/** Limit open redirects: same-site path only, never admin (staff uses /admin/login). */
function safeNextPath(raw: string): string | null {
  const path = raw.trim();
  if (!path.startsWith("/") || path.startsWith("//")) return null;
  if (path.startsWith("/admin")) return null;
  return path;
}

export async function signInUser(formData: FormData) {
  const email = String(formData.get("email") ?? "").trim();
  const password = String(formData.get("password") ?? "");
  const nextRaw = String(formData.get("next") ?? "").trim();
  const next = safeNextPath(nextRaw) ?? "/me";

  if (!email || !password) {
    redirect("/login?error=1");
  }

  if (!isSupabaseConfigured()) {
    redirect("/login?error=config");
  }

  let supabase;
  try {
    supabase = await createSupabaseServerClient();
  } catch {
    redirect("/login?error=config");
  }

  const { error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) {
    console.error("[signInUser] Supabase:", error.message);
    const em = error.message.toLowerCase();
    if (em.includes("email not confirmed") || em.includes("confirm your email")) {
      redirect("/login?error=confirm");
    }
    redirect("/login?error=auth");
  }

  await supabase.auth.getSession();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    console.error("[signInUser] No session after signInWithPassword — check cookie errors in Vercel logs.");
    redirect("/login?error=auth");
  }

  revalidatePath("/", "layout");
  redirect(next);
}

export async function signOutUser() {
  if (!isSupabaseConfigured()) {
    redirect("/");
  }
  try {
    const supabase = await createSupabaseServerClient();
    await supabase.auth.signOut();
  } catch {
    /* noop */
  }
  redirect("/");
}
