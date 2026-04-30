import "server-only";

import { createAdminDataSupabaseClient } from "@/lib/supabase/admin-data";
import { isSupabaseConfigured } from "@/lib/supabase/server";

export type AdminAuditLogRow = {
  id: string;
  createdAt: string;
  action: string;
  entityType: string;
  entityId: string | null;
  staffDisplayName: string;
  metadata: Record<string, unknown>;
};

export async function loadAdminAuditLog(limit = 100): Promise<AdminAuditLogRow[]> {
  if (!isSupabaseConfigured()) return [];
  try {
    const supabase = await createAdminDataSupabaseClient();
    const { data: rows, error } = await supabase
      .from("admin_audit_log")
      .select("id, created_at, action, entity_type, entity_id, metadata, staff_user_id")
      .order("created_at", { ascending: false })
      .limit(limit);
    if (error || !rows?.length) {
      if (error?.message && !/admin_audit_log|schema/i.test(error.message)) {
        console.error("loadAdminAuditLog:", error.message);
      }
      return [];
    }
    const ids = [...new Set(rows.map((r) => r.staff_user_id as string))];
    const { data: profs } = await supabase.from("profiles").select("id, display_name").in("id", ids);
    const nameById = new Map((profs ?? []).map((p) => [p.id as string, String(p.display_name ?? "")]));
    return rows.map((r) => ({
      id: r.id as string,
      createdAt: r.created_at as string,
      action: String(r.action),
      entityType: String(r.entity_type),
      entityId: (r.entity_id as string) ?? null,
      staffDisplayName: nameById.get(r.staff_user_id as string) ?? (r.staff_user_id as string).slice(0, 8),
      metadata: (r.metadata as Record<string, unknown>) ?? {},
    }));
  } catch (e) {
    console.error("loadAdminAuditLog:", e);
    return [];
  }
}

export type FeatureFlagRow = { key: string; enabled: boolean; description: string | null };

export async function loadFeatureFlags(): Promise<FeatureFlagRow[]> {
  if (!isSupabaseConfigured()) return [];
  try {
    const supabase = await createAdminDataSupabaseClient();
    const { data, error } = await supabase
      .from("feature_flags")
      .select("key, enabled, description")
      .order("key");
    if (error) return [];
    return (data ?? []).map((r) => ({
      key: String(r.key),
      enabled: Boolean(r.enabled),
      description: r.description != null ? String(r.description) : null,
    }));
  } catch {
    return [];
  }
}

export type PartnerApiKeyRow = {
  id: string;
  label: string;
  keyPrefix: string;
  scopes: string[];
  createdAt: string;
  revokedAt: string | null;
};

export async function loadPartnerApiKeys(): Promise<PartnerApiKeyRow[]> {
  if (!isSupabaseConfigured()) return [];
  try {
    const supabase = await createAdminDataSupabaseClient();
    const { data, error } = await supabase
      .from("partner_api_keys")
      .select("id, label, key_prefix, scopes, created_at, revoked_at")
      .order("created_at", { ascending: false });
    if (error) return [];
    return (data ?? []).map((r) => ({
      id: r.id as string,
      label: String(r.label),
      keyPrefix: String(r.key_prefix),
      scopes: (r.scopes as string[]) ?? [],
      createdAt: r.created_at as string,
      revokedAt: r.revoked_at ? String(r.revoked_at) : null,
    }));
  } catch {
    return [];
  }
}

export async function isPartnerApiFeatureEnabled(): Promise<boolean> {
  const flags = await loadFeatureFlags();
  return flags.find((f) => f.key === "partner_api")?.enabled ?? false;
}

export type WebhookOutboxRow = {
  id: string;
  eventType: string;
  status: string;
  attempts: number;
  createdAt: string;
  deliveredAt: string | null;
};

export async function loadWebhookOutboxRecent(limit = 25): Promise<WebhookOutboxRow[]> {
  if (!isSupabaseConfigured()) return [];
  try {
    const supabase = await createAdminDataSupabaseClient();
    const { data, error } = await supabase
      .from("webhook_outbox")
      .select("id, event_type, status, attempts, created_at, delivered_at")
      .order("created_at", { ascending: false })
      .limit(limit);
    if (error) return [];
    return (data ?? []).map((r) => ({
      id: r.id as string,
      eventType: String(r.event_type),
      status: String(r.status),
      attempts: Number(r.attempts ?? 0),
      createdAt: r.created_at as string,
      deliveredAt: r.delivered_at ? String(r.delivered_at) : null,
    }));
  } catch {
    return [];
  }
}

export type ComplianceTaskRow = {
  id: string;
  slug: string;
  title: string;
  category: string;
  completedAt: string | null;
};

export async function loadComplianceTasks(): Promise<ComplianceTaskRow[]> {
  if (!isSupabaseConfigured()) return [];
  try {
    const supabase = await createAdminDataSupabaseClient();
    const { data, error } = await supabase
      .from("compliance_tasks")
      .select("id, slug, title, category, completed_at")
      .order("sort_order", { ascending: true });
    if (error) return [];
    return (data ?? []).map((r) => ({
      id: r.id as string,
      slug: String(r.slug),
      title: String(r.title),
      category: String(r.category),
      completedAt: r.completed_at ? String(r.completed_at) : null,
    }));
  } catch {
    return [];
  }
}

export async function loadPlatformCounts(): Promise<{
  experiments: number;
  deals: number;
  fraudOpen: number;
  trustScores: number;
  warehouseRuns: number;
  pendingWebhooks: number;
}> {
  const empty = { experiments: 0, deals: 0, fraudOpen: 0, trustScores: 0, warehouseRuns: 0, pendingWebhooks: 0 };
  if (!isSupabaseConfigured()) return empty;
  try {
    const supabase = await createAdminDataSupabaseClient();
    const [
      exp,
      deals,
      fraud,
      trust,
      whRuns,
      pendingWh,
    ] = await Promise.all([
      supabase.from("experiments").select("id", { count: "exact", head: true }),
      supabase.from("sponsor_deals").select("id", { count: "exact", head: true }),
      supabase.from("fraud_review_queue").select("id", { count: "exact", head: true }).eq("status", "open"),
      supabase.from("placement_trust_scores").select("id", { count: "exact", head: true }),
      supabase.from("warehouse_export_runs").select("id", { count: "exact", head: true }),
      supabase.from("webhook_outbox").select("id", { count: "exact", head: true }).eq("status", "pending"),
    ]);
    return {
      experiments: exp.count ?? 0,
      deals: deals.count ?? 0,
      fraudOpen: fraud.count ?? 0,
      trustScores: trust.count ?? 0,
      warehouseRuns: whRuns.count ?? 0,
      pendingWebhooks: pendingWh.count ?? 0,
    };
  } catch {
    return empty;
  }
}
