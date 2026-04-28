import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";

import { updateSupabaseSession } from "@/lib/supabase/middleware";

export async function middleware(request: NextRequest) {
  const pathname = request.nextUrl.pathname;
  if (!pathname.startsWith("/admin")) {
    return NextResponse.next();
  }

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !anon) {
    if (pathname.startsWith("/admin/login")) {
      return NextResponse.next();
    }
    const u = request.nextUrl.clone();
    u.pathname = "/admin/login";
    u.searchParams.set("error", "config");
    return NextResponse.redirect(u);
  }

  return updateSupabaseSession(request);
}

export const config = {
  matcher: ["/admin", "/admin/:path*"],
};
