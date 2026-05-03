import { createServerClient } from "@supabase/ssr";
import { type NextRequest, NextResponse } from "next/server";

import { getSupabaseUrlAndAnon } from "@/lib/supabase/public-env";
import { supabaseSsrCookieOptions } from "@/lib/supabase/ssr-cookie-options";

export const dynamic = "force-dynamic";

/**
 * Server-side password sign-in so session cookies are set on the HTTP response
 * (avoids client-only cookie issues with SSR / hosting).
 */
export async function POST(request: NextRequest) {
  const creds = getSupabaseUrlAndAnon();
  if (!creds) {
    return NextResponse.json({ error: "Supabase is not configured on this deployment." }, { status: 503 });
  }
  const { url, anon } = creds;

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid request body." }, { status: 400 });
  }

  const email =
    typeof body === "object" && body !== null && "email" in body
      ? String((body as { email: unknown }).email).trim()
      : "";
  const password =
    typeof body === "object" && body !== null && "password" in body
      ? String((body as { password: unknown }).password)
      : "";

  if (!email || !password) {
    return NextResponse.json({ error: "Enter both email and password." }, { status: 400 });
  }

  const jsonResponse = NextResponse.json({ ok: true as const }, { status: 200 });
  jsonResponse.headers.set("Cache-Control", "private, no-store, max-age=0");

  const cookieOptions = supabaseSsrCookieOptions();
  const supabase = createServerClient(url, anon, {
    ...(cookieOptions ? { cookieOptions } : {}),
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet: { name: string; value: string; options?: Record<string, unknown> }[]) {
        cookiesToSet.forEach(({ name, value, options }) => {
          jsonResponse.cookies.set(name, value, options);
        });
      },
    },
  });

  const { error } = await supabase.auth.signInWithPassword({ email, password });

  if (error) {
    console.warn("[api/auth/sign-in] auth failed", {
      code: error.code,
      status: error.status,
      message: error.message,
    });
    return NextResponse.json(
      { error: error.message, code: error.code ?? null },
      { status: 401 },
    );
  }

  return jsonResponse;
}
