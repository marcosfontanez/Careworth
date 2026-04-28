"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";

const ADMIN_COOKIE = "pv_admin_session";

export async function signInAdmin(formData: FormData) {
  const email = String(formData.get("email") ?? "").trim();
  const password = String(formData.get("password") ?? "");
  if (!email || !password) {
    redirect("/admin/login?error=1");
  }
  (await cookies()).set(ADMIN_COOKIE, "mock", {
    path: "/",
    httpOnly: true,
    sameSite: "lax",
    maxAge: 60 * 60 * 24 * 7,
  });
  redirect("/admin/dashboard");
}

export async function signOutAdmin() {
  (await cookies()).delete(ADMIN_COOKIE);
  redirect("/admin/login");
}
