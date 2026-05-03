import "server-only";

import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

import { getSupabaseUrlAndAnon } from "@/lib/supabase/public-env";
import { supabaseSsrCookieOptions } from "@/lib/supabase/ssr-cookie-options";

export function isSupabaseConfigured(): boolean {
  return getSupabaseUrlAndAnon() !== null;
}

export async function createSupabaseServerClient() {
  const creds = getSupabaseUrlAndAnon();
  if (!creds) {
    throw new Error("Missing NEXT_PUBLIC_SUPABASE_URL or NEXT_PUBLIC_SUPABASE_ANON_KEY");
  }
  const { url, anon } = creds;
  const cookieStore = await cookies();
  const cookieOptions = supabaseSsrCookieOptions();
  return createServerClient(url, anon, {
    ...(cookieOptions ? { cookieOptions } : {}),
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll(cookiesToSet: { name: string; value: string; options?: object }[]) {
        try {
          cookiesToSet.forEach(({ name, value, options }) => {
            cookieStore.set(name, value, options);
          });
        } catch (e) {
          /* Server Components can't set cookies; Server Actions / Route Handlers should. */
          console.error("[supabase] cookie setAll failed — session may not persist:", e);
        }
      },
    },
  });
}
