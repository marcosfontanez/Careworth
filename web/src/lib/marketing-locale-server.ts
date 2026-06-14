import { cookies } from "next/headers";

import { DEFAULT_LOCALE, isLocale, type Locale } from "@/lib/i18n";
import { PV_LOCALE_COOKIE } from "@/lib/locale-preference";
import { getMarketingViewer } from "@/lib/marketing-viewer-server";

/**
 * Resolved locale: `pv_locale` cookie (switcher / proxy / staff sync), else signed-in
 * `profiles.preferred_locale`, else default English.
 *
 * The signed-in fallback reuses the request-cached {@link getMarketingViewer}, so
 * it does NOT make its own auth/DB round-trip — the cookie path (the common case)
 * stays a pure local read, and the viewer lookup is shared with the layout's
 * account chip instead of duplicated.
 */
export async function getMarketingLocale(): Promise<Locale> {
  const jar = await cookies();
  const raw = jar.get(PV_LOCALE_COOKIE)?.value;
  if (raw && isLocale(raw)) return raw;

  const viewer = await getMarketingViewer();
  if (viewer?.preferredLocale) return viewer.preferredLocale;

  return DEFAULT_LOCALE;
}
