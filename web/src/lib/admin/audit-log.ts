import type { SupabaseClient } from "@supabase/supabase-js";

export async function writeAdminAudit(
  supabase: SupabaseClient,
  args: {
    staffUserId: string;
    action: string;
    entityType: string;
    entityId?: string | null;
    metadata?: Record<string, unknown>;
  },
): Promise<void> {
  const { error } = await supabase.from("admin_audit_log").insert({
    staff_user_id: args.staffUserId,
    action: args.action,
    entity_type: args.entityType,
    entity_id: args.entityId ?? null,
    metadata: args.metadata ?? {},
  });
  if (error) {
    console.warn("writeAdminAudit:", error.message);
  }
}

/** Queues a delivery row (worker/cron not included in Next app yet). */
export async function enqueueWebhookOutbox(
  supabase: SupabaseClient,
  eventType: string,
  payload: Record<string, unknown>,
): Promise<void> {
  const { error } = await supabase.from("webhook_outbox").insert({
    event_type: eventType,
    payload,
    status: "pending",
  });
  if (error) {
    console.warn("enqueueWebhookOutbox:", error.message);
  }
}
