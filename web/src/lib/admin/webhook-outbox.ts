import "server-only";

import { createAdminDataSupabaseClient } from "@/lib/supabase/admin-data";
import { isSupabaseConfigured } from "@/lib/supabase/server";

import { writeAdminAudit } from "./audit-log";
import { extractWebhookTarget, redactWebhookPayload } from "./webhook-outbox-payload";

export { redactWebhookPayload } from "./webhook-outbox-payload";

/** Pending events older than this are flagged as stale in the action queue. */
export const WEBHOOK_STALE_PENDING_MS = 60 * 60 * 1000;

/** Staff retry requires explicit confirmation above this attempt count. */
export const WEBHOOK_RETRY_ATTEMPT_WARN = 5;

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export type WebhookOutboxStatusFilter = "all" | "pending" | "failed" | "delivered" | "retrying" | "ignored";

export type WebhookOutboxFilters = {
  status?: WebhookOutboxStatusFilter;
  eventType?: string;
  q?: string;
  staleOnly?: boolean;
  from?: string;
  to?: string;
  limit?: number;
  offset?: number;
};

export type WebhookOutboxEventRow = {
  id: string;
  eventType: string;
  status: string;
  attempts: number;
  createdAt: string;
  lastAttemptedAt: string | null;
  deliveredAt: string | null;
  lastError: string | null;
  payloadPreview: Record<string, unknown>;
  targetLabel: string;
  entityId: string | null;
  relatedHref: string | null;
  auditLogHref: string | null;
};

export type WebhookOutboxSummary = {
  pending: number;
  failed: number;
  delivered: number;
  retrying: number;
  ignored: number;
  stalePending: number;
  oldestPendingAgeMs: number | null;
  lastDeliveredAt: string | null;
  lastFailedAt: string | null;
  lastAttemptAt: string | null;
  workerDeliveryEnabled: boolean;
  workerNote: string;
  workerLastRunAt: string | null;
  workerStatus: string;
  activeDestinations: number;
};

type RawRow = {
  id: string;
  event_type: string;
  status: string;
  attempts: number | null;
  created_at: string;
  last_attempted_at?: string | null;
  delivered_at: string | null;
  last_error: string | null;
  payload: unknown;
};

function mapRow(r: RawRow): WebhookOutboxEventRow {
  const preview = redactWebhookPayload(r.payload);
  const target = extractWebhookTarget(preview);
  return {
    id: r.id,
    eventType: String(r.event_type),
    status: String(r.status),
    attempts: Number(r.attempts ?? 0),
    createdAt: r.created_at,
    lastAttemptedAt: r.last_attempted_at ? String(r.last_attempted_at) : null,
    deliveredAt: r.delivered_at ? String(r.delivered_at) : null,
    lastError: r.last_error ? String(r.last_error).slice(0, 500) : null,
    payloadPreview: preview,
    ...target,
  };
}

export async function loadWebhookOutboxSummary(): Promise<WebhookOutboxSummary> {
  const empty: WebhookOutboxSummary = {
    pending: 0,
    failed: 0,
    delivered: 0,
    retrying: 0,
    ignored: 0,
    stalePending: 0,
    oldestPendingAgeMs: null,
    lastDeliveredAt: null,
    lastFailedAt: null,
    lastAttemptAt: null,
    workerDeliveryEnabled: false,
    workerNote: "Delivery is handled by the webhook worker (outside this Next.js app).",
    workerLastRunAt: null,
    workerStatus: "unknown",
    activeDestinations: 0,
  };
  if (!isSupabaseConfigured()) return empty;

  try {
    const supabase = await createAdminDataSupabaseClient();
    const staleBefore = new Date(Date.now() - WEBHOOK_STALE_PENDING_MS).toISOString();

    const [pending, failed, delivered, retrying, ignored, stale, flags, oldestPending, lastDelivered, lastFailed, lastAttempt, workerState, destinations] =
      await Promise.all([
        supabase.from("webhook_outbox").select("id", { count: "exact", head: true }).eq("status", "pending"),
        supabase.from("webhook_outbox").select("id", { count: "exact", head: true }).eq("status", "failed"),
        supabase.from("webhook_outbox").select("id", { count: "exact", head: true }).eq("status", "delivered"),
        supabase.from("webhook_outbox").select("id", { count: "exact", head: true }).eq("status", "retrying"),
        supabase.from("webhook_outbox").select("id", { count: "exact", head: true }).eq("status", "ignored"),
        supabase
          .from("webhook_outbox")
          .select("id", { count: "exact", head: true })
          .eq("status", "pending")
          .lt("created_at", staleBefore),
        supabase.from("feature_flags").select("enabled").eq("key", "webhook_delivery").maybeSingle(),
        supabase
          .from("webhook_outbox")
          .select("created_at")
          .eq("status", "pending")
          .order("created_at", { ascending: true })
          .limit(1)
          .maybeSingle(),
        supabase
          .from("webhook_outbox")
          .select("delivered_at")
          .not("delivered_at", "is", null)
          .order("delivered_at", { ascending: false })
          .limit(1)
          .maybeSingle(),
        supabase
          .from("webhook_outbox")
          .select("last_attempted_at, created_at")
          .eq("status", "failed")
          .order("last_attempted_at", { ascending: false, nullsFirst: false })
          .limit(1)
          .maybeSingle(),
        supabase
          .from("webhook_outbox")
          .select("last_attempted_at")
          .not("last_attempted_at", "is", null)
          .order("last_attempted_at", { ascending: false })
          .limit(1)
          .maybeSingle(),
        supabase
          .from("webhook_worker_state")
          .select("last_run_at, last_status, last_summary")
          .eq("singleton_key", "default")
          .maybeSingle(),
        supabase
          .from("webhook_destinations")
          .select("id", { count: "exact", head: true })
          .eq("is_active", true),
      ]);

    const workerDeliveryEnabled = Boolean(flags.data?.enabled);
    const workerLastRunAt = (workerState.data?.last_run_at as string) ?? null;
    const workerStatus = String(workerState.data?.last_status ?? "unknown");
    const activeDestinations = destinations.count ?? 0;
    const oldestCreated = oldestPending.data?.created_at as string | undefined;
    const oldestPendingAgeMs = oldestCreated
      ? Math.max(0, Date.now() - new Date(oldestCreated).getTime())
      : null;

    let workerNote =
      "Delivery is handled by the webhook worker (outside this Next.js app). Staff retries re-queue events as pending.";
    if (!workerDeliveryEnabled) {
      workerNote +=
        " The webhook_delivery feature flag is off — enable it on Platform when destinations are configured.";
    } else if (activeDestinations === 0) {
      workerNote += " No active webhook destinations are configured — delivery will not run.";
    } else if (!workerLastRunAt) {
      workerNote += " Worker has not recorded a run yet — deploy deliver-webhook-outbox and confirm cron.";
    } else if (Date.now() - new Date(workerLastRunAt).getTime() > 15 * 60_000) {
      workerNote += " Worker heartbeat is stale — verify the deliver-webhook-outbox cron is running.";
    }

    if (workerDeliveryEnabled && activeDestinations > 0 && (stale.count ?? 0) > 0) {
      workerNote +=
        " Pending events are aging — verify the worker is running and can reach webhook destinations.";
    } else if ((failed.count ?? 0) > 0) {
      workerNote += " Review failed events below; retry after fixing destination or payload issues.";
    }

    return {
      pending: pending.count ?? 0,
      failed: failed.count ?? 0,
      delivered: delivered.count ?? 0,
      retrying: retrying.count ?? 0,
      ignored: ignored.count ?? 0,
      stalePending: stale.count ?? 0,
      oldestPendingAgeMs,
      lastDeliveredAt: (lastDelivered.data?.delivered_at as string) ?? null,
      lastFailedAt:
        (lastFailed.data?.last_attempted_at as string) ??
        (lastFailed.data?.created_at as string) ??
        null,
      lastAttemptAt: (lastAttempt.data?.last_attempted_at as string) ?? null,
      workerDeliveryEnabled,
      workerNote,
      workerLastRunAt,
      workerStatus,
      activeDestinations,
    };
  } catch (e) {
    console.error("loadWebhookOutboxSummary:", e);
    return empty;
  }
}

export async function loadWebhookOutboxEventTypes(): Promise<string[]> {
  if (!isSupabaseConfigured()) return [];
  try {
    const supabase = await createAdminDataSupabaseClient();
    const { data, error } = await supabase.from("webhook_outbox").select("event_type").limit(200);
    if (error || !data) return [];
    return [...new Set(data.map((r) => String(r.event_type)))].sort();
  } catch {
    return [];
  }
}

export async function loadWebhookOutboxEvents(
  filters: WebhookOutboxFilters = {},
): Promise<{ events: WebhookOutboxEventRow[]; total: number }> {
  if (!isSupabaseConfigured()) return { events: [], total: 0 };

  const limit = Math.min(Math.max(filters.limit ?? 50, 1), 100);
  const offset = Math.max(filters.offset ?? 0, 0);

  try {
    const supabase = await createAdminDataSupabaseClient();
    let query = supabase
      .from("webhook_outbox")
      .select(
        "id, event_type, status, attempts, created_at, last_attempted_at, delivered_at, last_error, payload",
        { count: "exact" },
      );

    const status = filters.status ?? "all";
    if (status !== "all") {
      query = query.eq("status", status);
    }

    if (filters.eventType) {
      query = query.eq("event_type", filters.eventType);
    }

    if (filters.from) {
      query = query.gte("created_at", filters.from);
    }

    if (filters.to) {
      query = query.lte("created_at", filters.to);
    }

    if (filters.staleOnly) {
      const staleBefore = new Date(Date.now() - WEBHOOK_STALE_PENDING_MS).toISOString();
      query = query.eq("status", "pending").lt("created_at", staleBefore);
    }

    const q = filters.q?.trim();
    if (q) {
      if (UUID_RE.test(q)) {
        query = query.or(
          `id.eq.${q},payload->>reportId.eq.${q},payload->>streamId.eq.${q}`,
        );
      } else {
        const safe = q.replace(/[%_,]/g, " ").slice(0, 80);
        query = query.or(`event_type.ilike.%${safe}%,last_error.ilike.%${safe}%`);
      }
    }

    const { data, error, count } = await query
      .order("created_at", { ascending: false })
      .range(offset, offset + limit - 1);

    if (error) {
      console.error("loadWebhookOutboxEvents:", error.message);
      return { events: [], total: 0 };
    }

    return {
      events: (data ?? []).map((r) => mapRow(r as RawRow)),
      total: count ?? 0,
    };
  } catch (e) {
    console.error("loadWebhookOutboxEvents:", e);
    return { events: [], total: 0 };
  }
}

export async function loadWebhookOutboxEventById(id: string): Promise<WebhookOutboxEventRow | null> {
  if (!isSupabaseConfigured() || !UUID_RE.test(id)) return null;
  try {
    const supabase = await createAdminDataSupabaseClient();
    const { data, error } = await supabase
      .from("webhook_outbox")
      .select(
        "id, event_type, status, attempts, created_at, last_attempted_at, delivered_at, last_error, payload",
      )
      .eq("id", id)
      .maybeSingle();
    if (error || !data) return null;
    return mapRow(data as RawRow);
  } catch {
    return null;
  }
}

export type WebhookOutboxMutationResult = {
  ok: boolean;
  error?: string;
  updated?: number;
  needsHighAttemptConfirm?: boolean;
};

export async function retryWebhookOutboxEvents(args: {
  supabase: Awaited<ReturnType<typeof createAdminDataSupabaseClient>>;
  staffUserId: string;
  ids: string[];
  confirmHighAttempts?: boolean;
  staffNote?: string;
}): Promise<WebhookOutboxMutationResult> {
  const ids = [...new Set(args.ids.filter((id) => UUID_RE.test(id)))];
  if (!ids.length) return { ok: false, error: "No valid event ids." };

  const { data: rows, error: loadErr } = await args.supabase
    .from("webhook_outbox")
    .select("id, status, attempts")
    .in("id", ids);

  if (loadErr) return { ok: false, error: loadErr.message };
  if (!rows?.length) return { ok: false, error: "Events not found." };

  for (const row of rows) {
    const status = String(row.status);
    if (status === "delivered") {
      return { ok: false, error: "Delivered events cannot be retried." };
    }
    if (status === "ignored") {
      return { ok: false, error: "Ignored events must be reopened before retry." };
    }
    const attempts = Number(row.attempts ?? 0);
    if (attempts >= WEBHOOK_RETRY_ATTEMPT_WARN && !args.confirmHighAttempts) {
      return {
        ok: false,
        needsHighAttemptConfirm: true,
        error: `One or more events have ${attempts}+ attempts. Confirm to retry anyway.`,
      };
    }
  }

  let updated = 0;
  for (const row of rows) {
    const previousStatus = String(row.status);
    const { error } = await args.supabase
      .from("webhook_outbox")
      .update({
        status: "pending",
        last_error: null,
      })
      .eq("id", row.id as string);

    if (error) return { ok: false, error: error.message };

    await writeAdminAudit(args.supabase, {
      staffUserId: args.staffUserId,
      action: "webhook_outbox.retry",
      entityType: "webhook_outbox",
      entityId: row.id as string,
      metadata: {
        source_surface: "web",
        previous_status: previousStatus,
        new_status: "pending",
        retry_count: Number(row.attempts ?? 0),
        staff_note: args.staffNote?.trim() || null,
      },
    });
    updated += 1;
  }

  return { ok: true, updated };
}

export async function ignoreWebhookOutboxEvents(args: {
  supabase: Awaited<ReturnType<typeof createAdminDataSupabaseClient>>;
  staffUserId: string;
  ids: string[];
  staffNote?: string;
}): Promise<WebhookOutboxMutationResult> {
  const ids = [...new Set(args.ids.filter((id) => UUID_RE.test(id)))];
  if (!ids.length) return { ok: false, error: "No valid event ids." };

  const { data: rows, error: loadErr } = await args.supabase
    .from("webhook_outbox")
    .select("id, status, attempts")
    .in("id", ids);

  if (loadErr) return { ok: false, error: loadErr.message };
  if (!rows?.length) return { ok: false, error: "Events not found." };

  for (const row of rows) {
    const status = String(row.status);
    if (status === "delivered") {
      return { ok: false, error: "Delivered events cannot be marked ignored." };
    }
  }

  let updated = 0;
  for (const row of rows) {
    const previousStatus = String(row.status);
    const { error } = await args.supabase
      .from("webhook_outbox")
      .update({ status: "ignored", last_error: null })
      .eq("id", row.id as string);

    if (error) return { ok: false, error: error.message };

    await writeAdminAudit(args.supabase, {
      staffUserId: args.staffUserId,
      action: "webhook_outbox.ignore",
      entityType: "webhook_outbox",
      entityId: row.id as string,
      metadata: {
        source_surface: "web",
        previous_status: previousStatus,
        new_status: "ignored",
        retry_count: Number(row.attempts ?? 0),
        staff_note: args.staffNote?.trim() || null,
      },
    });
    updated += 1;
  }

  return { ok: true, updated };
}

export function parseWebhookOutboxFilters(
  input: Record<string, string | string[] | undefined>,
): WebhookOutboxFilters {
  const pick = (key: string) => {
    const v = input[key];
    return typeof v === "string" ? v : undefined;
  };

  const statusRaw = pick("status");
  const status =
    statusRaw === "pending" ||
    statusRaw === "failed" ||
    statusRaw === "delivered" ||
    statusRaw === "retrying" ||
    statusRaw === "ignored"
      ? statusRaw
      : "all";

  return {
    status,
    eventType: pick("eventType") || undefined,
    q: pick("q") || undefined,
    staleOnly: pick("stale") === "1",
    from: pick("from") || undefined,
    to: pick("to") || undefined,
    limit: 50,
    offset: 0,
  };
}
