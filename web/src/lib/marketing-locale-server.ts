import { cookies } from "next/headers";

import { DEFAULT_LOCALE, isLocale, type Locale } from "@/lib/i18n";
import { PV_LOCALE_COOKIE } from "@/lib/locale-preference";

/**
 * Resolved locale from the `pv_locale` cookie (switcher / proxy / staff sync),
 * else default English.
 *
 * This is intentionally a **pure local cookie read with zero network/DB I/O** so
 * marketing pages render without any Supabase round-trip in the critical path
 * (a major TTFB win for the public homepage). `proxy.ts` always seeds
 * `pv_locale` from `Accept-Language` on the first request, so the cookie is
 * present by the time any page renders; signed-in users' `preferred_locale` is
 * synced into the same cookie at login / via the staff locale sync, so we no
 * longer need a per-render `profiles` lookup just to pick copy language.
 */
export async function getMarketingLocale(): Promise<Locale> {
  const jar = await cookies();
  const raw = jar.get(PV_LOCALE_COOKIE)?.value;
  if (raw && isLocale(raw)) return raw;
  return DEFAULT_LOCALE;
}
