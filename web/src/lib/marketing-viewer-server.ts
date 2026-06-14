import "server-only";

import { cache } from "react";

import { isLocale, type Locale } from "@/lib/i18n";
import { createSupabaseServerClient, isSupabaseConfigured } from "@/lib/supabase/server";

export type MarketingViewer = {
  userId: string;
  displayName: string | null;
  username: string | null;
  preferredLocale: Locale | null;
} | null;

/**
 * Single source of truth for the signed-in marketing visitor.
 *
 * Wrapped in React `cache()` so the underlying `auth.getUser()` (a network call
 * to the Supabase Auth server) and the `profiles` lookup run AT MOST ONCE per
 * server render — even though the marketing layout (account chip) AND every
 * marketing page (`getMarketingLocale`) need viewer data. Previously each caller
 * made its own auth + DB round-trip, so a logged-in page could fire 3–4
 * sequential Supabase calls before the HTML streamed (a major TTFB cost). For
 * anonymous visitors `getUser()` resolves locally (no session cookie → no
 * network), so this stays cheap.
 */
export const getMarketingViewer = cache(async (): Promise<MarketingViewer> => {
  if (!isSupabaseConfigured()) return null;
  try {
    const supabase = await createSupabaseServerClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return null;

    const { data: profile } = await supabase
      .from("profiles")
      .select("display_name, username, preferred_locale")
      .eq("id", user.id)
      .maybeSingle();

    const pl = profile?.preferred_locale;
    return {
      userId: user.id,
      displayName: profile?.display_name ?? null,
      username: profile?.username ?? null,
      preferredLocale: pl && isLocale(pl) ? pl : null,
    };
  } catch {
    return null;
  }
});
