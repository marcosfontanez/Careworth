"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";

import { isLocale } from "@/lib/i18n";
import { localeCookieOptions, PV_LOCALE_COOKIE } from "@/lib/locale-preference";

function safeInternalPath(raw: string): string {
  const trimmed = raw.trim();
  if (!trimmed.startsWith("/") || trimmed.startsWith("//")) return "/";
  const q = trimmed.indexOf("?");
  if (q === -1) return trimmed;
  const path = trimmed.slice(0, q);
  const query = trimmed.slice(q);
  if (!path.startsWith("/")) return "/";
  return `${path}${query}`;
}

export async function setMarketingLocale(formData: FormData) {
  const locale = String(formData.get("locale") ?? "").trim();
  const next = safeInternalPath(String(formData.get("next") ?? "/"));

  if (!isLocale(locale)) redirect(next);

  const jar = await cookies();
  jar.set(PV_LOCALE_COOKIE, locale, localeCookieOptions());
  redirect(next);
}
