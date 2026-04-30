import { cookies } from "next/headers";

import { DEFAULT_LOCALE, isLocale, type Locale } from "@/lib/i18n";
import { PV_LOCALE_COOKIE } from "@/lib/locale-preference";
import { createSupabaseServerClient, isSupabaseConfigured } from "@/lib/supabase/server";

/**
 * Resolved locale: `pv_locale` cookie (switcher / proxy / staff sync), else signed-in
 * `profiles.preferred_locale`, else default English.
 */
export async function getMarketingLocale(): Promise<Locale> {
  const jar = await cookies();
  const raw = jar.get(PV_LOCALE_COOKIE)?.value;
  if (raw && isLocale(raw)) return raw;

  if (isSupabaseConfigured()) {
    try {
      const supabase = await createSupabaseServerClient();
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (user) {
        const { data } = await supabase
          .from("profiles")
          .select("preferred_locale")
          .eq("id", user.id)
          .maybeSingle();
        const pl = data?.preferred_locale;
        if (pl && isLocale(pl)) return pl;
      }
    } catch {
      /* ignore: missing cookies store in uncommon runtimes */
    }
  }

  return DEFAULT_LOCALE;
}
