import type { SupabaseClient } from "npm:@supabase/supabase-js@2";

import { deliverOutboxEventToDestinations } from "./deliver.ts";
import type { WebhookDestination, WebhookOutboxRow, WorkerRunSummary } from "./types.ts";
import { WEBHOOK_MAX_ATTEMPTS } from "./types.ts";
import { shouldSkipOutboxRow } from "./retry.ts";

export async function runWebhookDeliveryWorker(
  supabase: SupabaseClient,
  opts: {
    resolveSigningSecret: (envKey: string | null) => string | null;
    batchLimit?: number;
  },
): Promise<WorkerRunSummary> {
  const { data: flagRow } = await supabase
    .from("feature_flags")
    .select("enabled")
    .eq("key", "webhook_delivery")
    .maybeSingle();

  if (!flagRow?.enabled) {
    const summary: WorkerRunSummary = { disabled: true, reason: "webhook_delivery flag is off" };
    await writeWorkerHeartbeat(supabase, "disabled", summary);
    return summary;
  }

  const { data: destinations, error: destErr } = await supabase
    .from("webhook_destinations")
    .select("id, name, url, is_active, event_types, metadata")
    .eq("is_active", true);

  if (destErr) {
    const summary: WorkerRunSummary = { reason: destErr.message };
    await writeWorkerHeartbeat(supabase, "error", summary);
    return summary;
  }

  const activeDestinations = (destinations ?? []) as WebhookDestination[];
  if (!activeDestinations.length) {
    const summary: WorkerRunSummary = {
      no_destinations: true,
      active_destinations: 0,
      claimed: 0,
      delivered: 0,
      failed: 0,
      skipped: 0,
    };
    await writeWorkerHeartbeat(supabase, "no_destinations", summary);
    return summary;
  }

  const { data: claimed, error: claimErr } = await supabase.rpc("webhook_outbox_claim_batch", {
    p_limit: opts.batchLimit ?? 20,
    p_max_attempts: WEBHOOK_MAX_ATTEMPTS,
  });

  if (claimErr) {
    const summary: WorkerRunSummary = { reason: claimErr.message };
    await writeWorkerHeartbeat(supabase, "error", summary);
    return summary;
  }

  const rows = (claimed ?? []) as WebhookOutboxRow[];
  let delivered = 0;
  let failed = 0;
  let skipped = 0;

  for (const row of rows) {
    if (shouldSkipOutboxRow(row.status)) {
      skipped += 1;
      continue;
    }

    const outcome = await deliverOutboxEventToDestinations({
      row,
      destinations: activeDestinations,
      resolveSigningSecret: opts.resolveSigningSecret,
    });

    if (outcome.delivered) {
      const { error } = await supabase
        .from("webhook_outbox")
        .update({
          status: "delivered",
          attempts: outcome.attemptsAfter,
          last_error: null,
          delivered_at: new Date().toISOString(),
          next_attempt_at: null,
          destination_id: outcome.destinationId,
        })
        .eq("id", row.id);

      if (error) {
        console.error("[webhook-worker] mark delivered failed:", error.message);
        failed += 1;
      } else {
        delivered += 1;
      }
    } else {
      const { error } = await supabase
        .from("webhook_outbox")
        .update({
          status: outcome.finalStatus,
          attempts: outcome.attemptsAfter,
          last_error: outcome.lastError,
          next_attempt_at: outcome.nextAttemptAt,
          last_attempted_at: new Date().toISOString(),
        })
        .eq("id", row.id);

      if (error) {
        console.error("[webhook-worker] mark failure failed:", error.message);
      }
      failed += 1;
    }
  }

  const summary: WorkerRunSummary = {
    claimed: rows.length,
    delivered,
    failed,
    skipped,
    active_destinations: activeDestinations.length,
  };

  await writeWorkerHeartbeat(supabase, "ok", summary);
  return summary;
}

async function writeWorkerHeartbeat(
  supabase: SupabaseClient,
  status: string,
  summary: WorkerRunSummary,
): Promise<void> {
  const now = new Date().toISOString();
  await supabase.from("webhook_worker_state").upsert({
    singleton_key: "default",
    last_run_at: now,
    last_status: status,
    last_summary: summary,
    updated_at: now,
  });
}
