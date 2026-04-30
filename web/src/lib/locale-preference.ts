import { DEFAULT_LOCALE, isLocale, type Locale } from "@/lib/i18n";

/** Cookie storing the visitor's preferred marketing locale (set from Accept-Language or staff settings). */
export const PV_LOCALE_COOKIE = "pv_locale";

export function localeCookieOptions(maxAgeSec = 60 * 60 * 24 * 365) {
  return {
    path: "/" as const,
    maxAge: maxAgeSec,
    sameSite: "lax" as const,
    secure: process.env.NODE_ENV === "production",
  };
}

/**
 * Parses `Accept-Language` for the first supported locale. Used when adding marketing locale
 * detection or SSR `lang` hints — routing still defaults to {@link DEFAULT_LOCALE} until `[locale]`
 * segments exist.
 */
export function localeFromAcceptLanguage(header: string | null | undefined): Locale {
  if (!header?.trim()) return DEFAULT_LOCALE;
  for (const part of header.split(",")) {
    const tag = part.trim().split(";")[0]?.trim().toLowerCase();
    if (!tag) continue;
    if (isLocale(tag)) return tag;
    const short = tag.slice(0, 2);
    if (isLocale(short)) return short;
  }
  return DEFAULT_LOCALE;
}
