import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";

import { isLocale } from "@/lib/i18n";
import { localeCookieOptions, localeFromAcceptLanguage, PV_LOCALE_COOKIE } from "@/lib/locale-preference";
import { updateSupabaseSession } from "@/lib/supabase/middleware";

function withLocaleCookieIfNeeded(request: NextRequest, response: NextResponse): NextResponse {
  const existing = request.cookies.get(PV_LOCALE_COOKIE)?.value;
  if (existing && isLocale(existing)) {
    return response;
  }
  const locale = localeFromAcceptLanguage(request.headers.get("accept-language"));
  response.cookies.set(PV_LOCALE_COOKIE, locale, localeCookieOptions());
  return response;
}

function localeOnlyResponse(request: NextRequest): NextResponse {
  return withLocaleCookieIfNeeded(request, NextResponse.next());
}

/**
 * Next.js 16+ network boundary (replaces deprecated `middleware`).
 * Refreshes Supabase session for admin UI + `/api/admin/*`.
 * Sets `pv_locale` for other paths from `Accept-Language` when the cookie is absent.
 */
export async function proxy(request: NextRequest) {
  const pathname = request.nextUrl.pathname;

  const isAdminUi = pathname === "/admin" || pathname.startsWith("/admin/");
  const isAdminApi = pathname === "/api/admin" || pathname.startsWith("/api/admin/");

  if (!isAdminUi && !isAdminApi) {
    return localeOnlyResponse(request);
  }

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !anon) {
    if (pathname.startsWith("/admin/login")) {
      return NextResponse.next();
    }
    if (isAdminApi) {
      return NextResponse.next();
    }
    const u = request.nextUrl.clone();
    u.pathname = "/admin/login";
    u.searchParams.set("error", "config");
    return NextResponse.redirect(u);
  }

  return withLocaleCookieIfNeeded(request, await updateSupabaseSession(request));
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico)$).*)",
  ],
};
