import "server-only";

import { createAdminDataSupabaseClient, getAdminDataAccessMode } from "@/lib/supabase/admin-data";
import { isSupabaseConfigured } from "@/lib/supabase/server";

export type AdminDataHealthSnapshot = {
  serviceRoleConfigured: boolean;
  accessMode: "service_role" | "session_rls";
  aggregatesHealth: "healthy" | "degraded";
  lastSuccessfulQueryAt: string | null;
  rlsFallbackWarning: string | null;
};

/** Staff-only operational health — never exposes secrets. */
export async function loadAdminDataHealth(): Promise<AdminDataHealthSnapshot> {
  const serviceRoleConfigured = Boolean(process.env.SUPABASE_SERVICE_ROLE_KEY?.trim());
  const accessMode = getAdminDataAccessMode();

  if (!isSupabaseConfigured()) {
    return {
      serviceRoleConfigured,
      accessMode,
      aggregatesHealth: "degraded",
      lastSuccessfulQueryAt: null,
      rlsFallbackWarning:
        "Supabase env vars missing — admin loaders cannot reach the database.",
    };
  }

  let lastSuccessfulQueryAt: string | null = null;
  let aggregatesHealth: "healthy" | "degraded" = serviceRoleConfigured ? "healthy" : "degraded";

  try {
    const supabase = await createAdminDataSupabaseClient();
    const { error } = await supabase.from("profiles").select("id", { count: "exact", head: true }).limit(1);
    if (!error) {
      lastSuccessfulQueryAt = new Date().toISOString();
    } else {
      aggregatesHealth = "degraded";
    }
  } catch {
    aggregatesHealth = "degraded";
  }

  const rlsFallbackWarning =
    accessMode === "session_rls"
      ? "SUPABASE_SERVICE_ROLE_KEY is not set on this deployment. Admin aggregates may be incomplete under RLS. Add the service role key in Vercel → Project → Settings → Environment Variables (server-only, never expose to the client)."
      : null;

  return {
    serviceRoleConfigured,
    accessMode,
    aggregatesHealth,
    lastSuccessfulQueryAt,
    rlsFallbackWarning,
  };
}
