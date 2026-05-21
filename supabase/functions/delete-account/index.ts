// Deploy (JWT verified — caller must be the account owner):
//   npx supabase functions deploy delete-account
//
// Uses Supabase secret key (auto) to delete auth.users.
// profiles and most app rows cascade from auth.users / profiles FKs.
//
// Retention note: purchase_receipts / wallet_transactions may remain if FKs
// use ON DELETE SET NULL for audit — verify schema before marketing hard-delete.

import { createClient } from "npm:@supabase/supabase-js@2";

import { edgeCorsHeaders } from "../_shared/edgeCors.ts";
import {
  getSupabasePublishableKey,
  getSupabaseSecretKey,
  getSupabaseUrl,
  isProjectApiKey,
} from "../_shared/supabaseEnv.ts";

function corsHeaders(): Record<string, string> {
  return edgeCorsHeaders({
    "Access-Control-Allow-Headers":
      "authorization, x-client-info, apikey, content-type",
  });
}

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders(), "Content-Type": "application/json" },
  });
}

function hasProjectApiKey(req: Request): boolean {
  return isProjectApiKey(req);
}

async function getAuthedUserId(
  supabaseUrl: string,
  anonKey: string,
  authHeader: string | null,
): Promise<string | null> {
  if (!authHeader?.startsWith("Bearer ")) return null;
  const sb = createClient(supabaseUrl, anonKey, {
    global: { headers: { Authorization: authHeader } },
  });
  const { data, error } = await sb.auth.getUser();
  if (error || !data.user?.id) return null;
  return data.user.id;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders() });
  }

  if (req.method !== "POST") {
    return json({ ok: false, error: "Method not allowed", code: "METHOD_NOT_ALLOWED" }, 405);
  }

  const supabaseUrl = getSupabaseUrl();
  const publishableKey = getSupabasePublishableKey();
  const secretKey = getSupabaseSecretKey();

  if (!supabaseUrl || !publishableKey || !secretKey) {
    return json({ ok: false, error: "Server misconfigured.", code: "SERVER_MISCONFIGURED" }, 503);
  }

  if (!hasProjectApiKey(req)) {
    return json({ ok: false, error: "Forbidden", code: "FORBIDDEN" }, 403);
  }

  const userId = await getAuthedUserId(supabaseUrl, publishableKey, req.headers.get("Authorization"));
  if (!userId) {
    return json({ ok: false, error: "Unauthorized", code: "UNAUTHORIZED" }, 401);
  }

  const admin = createClient(supabaseUrl, secretKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  // Best-effort storage cleanup for common user-scoped prefixes.
  const buckets = ["post-media", "avatars", "collab-clips"] as const;
  for (const bucket of buckets) {
    try {
      const { data: listed } = await admin.storage.from(bucket).list(userId, { limit: 1000 });
      if (listed?.length) {
        const paths = listed
          .map((o) => o.name)
          .filter(Boolean)
          .map((name) => `${userId}/${name}`);
        if (paths.length) {
          await admin.storage.from(bucket).remove(paths);
        }
      }
    } catch {
      /* non-fatal — auth delete still proceeds */
    }
  }

  const { error: deleteError } = await admin.auth.admin.deleteUser(userId);
  if (deleteError) {
    return json(
      {
        ok: false,
        error: deleteError.message,
        code: "DELETE_FAILED",
      },
      500,
    );
  }

  return json({ ok: true });
});
