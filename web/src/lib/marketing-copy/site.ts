import { site } from "@/lib/design-tokens";
import type { Locale } from "@/lib/i18n";

const description: Record<Locale, string> = {
  en: site.description,
  es: "La red social para la comunidad sanitaria global.",
};

const tagline: Record<Locale, string> = {
  en: site.tagline,
  es: "Cultura en salud, todo en un solo lugar.",
};

/** Short footer / hero-adjacent copy (brand name stays {@link site.name}). */
export function getSiteMarketingDescription(locale: Locale): string {
  return description[locale];
}

export function getSiteMarketingTagline(locale: Locale): string {
  return tagline[locale];
}
