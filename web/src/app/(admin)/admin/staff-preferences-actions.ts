"use server";

import { revalidatePath } from "next/cache";
import { cookies } from "next/headers";

import { isLocale } from "@/lib/i18n";
import { localeCookieOptions, PV_LOCALE_COOKIE } from "@/lib/locale-preference";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export type StaffPreferencesState = { ok?: boolean; error?: string };

export async function updateStaffPreferences(
  _prev: StaffPreferencesState | undefined,
  formData: FormData,
): Promise<StaffPreferencesState> {
  const localeRaw = String(formData.get("preferred_locale") ?? "").trim();
  const digestOn = formData.get("product_digest_email") === "on";

  if (!isLocale(localeRaw)) {
    return { error: "Unsupported language selection." };
  }

  let supabase;
  try {
    supabase = await createSupabaseServerClient();
  } catch {
    return { error: "Supabase is not configured." };
  }

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return { error: "Not signed in." };
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("role_admin")
    .eq("id", user.id)
    .maybeSingle();

  if (!profile?.role_admin) {
    return { error: "Forbidden." };
  }

  const { error } = await supabase
    .from("profiles")
    .update({
      preferred_locale: localeRaw,
      product_digest_email: digestOn,
    })
    .eq("id", user.id);

  if (error) {
    return { error: error.message };
  }

  const jar = await cookies();
  jar.set(PV_LOCALE_COOKIE, localeRaw, localeCookieOptions());

  revalidatePath("/admin/settings");
  return { ok: true };
}
