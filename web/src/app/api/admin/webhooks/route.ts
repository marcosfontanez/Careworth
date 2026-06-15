import { NextRequest, NextResponse } from "next/server";

import { requireAdminApiSession } from "@/lib/admin/require-admin-api-session";
import {
  ignoreWebhookOutboxEvents,
  loadWebhookOutboxEventById,
  loadWebhookOutboxEvents,
  loadWebhookOutboxEventTypes,
  loadWebhookOutboxSummary,
  parseWebhookOutboxFilters,
  retryWebhookOutboxEvents,
} from "@/lib/admin/webhook-outbox";
import { getClientIpFromHeaders } from "@/lib/server/rate-limit";
import { checkRateLimitDistributed } from "@/lib/server/rate-limit-distributed";

type MutationBody = {
  action?: string;
  ids?: string[];
  confirmHighAttempts?: boolean;
  staffNote?: string;
};

export async function GET(req: NextRequest) {
  const auth = await requireAdminApiSession();
  if (!auth.ok) return auth.response;

  const sp = req.nextUrl.searchParams;
  const id = sp.get("id")?.trim();

  if (id) {
    const event = await loadWebhookOutboxEventById(id);
    if (!event) {
      return NextResponse.json({ ok: false, error: "Not found" }, { status: 404 });
    }
    return NextResponse.json({ ok: true, event });
  }

  const filters = parseWebhookOutboxFilters({
    status: sp.get("status") ?? undefined,
    eventType: sp.get("eventType") ?? undefined,
    q: sp.get("q") ?? undefined,
    stale: sp.get("stale") ?? undefined,
    from: sp.get("from") ?? undefined,
    to: sp.get("to") ?? undefined,
  });

  const [summary, list, eventTypes] = await Promise.all([
    loadWebhookOutboxSummary(),
    loadWebhookOutboxEvents(filters),
    loadWebhookOutboxEventTypes(),
  ]);

  return NextResponse.json({
    ok: true,
    summary,
    events: list.events,
    total: list.total,
    eventTypes,
    filters,
  });
}

export async function POST(req: NextRequest) {
  const ip = getClientIpFromHeaders((n) => req.headers.get(n));
  const rl = await checkRateLimitDistributed(`api:admin-webhooks:${ip}`, 40, 60_000);
  if (!rl.ok) {
    return NextResponse.json({ ok: false, error: "Too many requests. Try again shortly." }, { status: 429 });
  }

  const auth = await requireAdminApiSession();
  if (!auth.ok) return auth.response;

  let body: MutationBody;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ ok: false, error: "Invalid JSON body" }, { status: 400 });
  }

  const action = typeof body.action === "string" ? body.action.trim() : "";
  const ids = Array.isArray(body.ids)
    ? body.ids.filter((id): id is string => typeof id === "string")
    : [];

  if (!ids.length) {
    return NextResponse.json({ ok: false, error: "ids is required" }, { status: 400 });
  }

  const staffNote = typeof body.staffNote === "string" ? body.staffNote : undefined;

  if (action === "retry") {
    const result = await retryWebhookOutboxEvents({
      supabase: auth.session.supabase,
      staffUserId: auth.session.adminUserId,
      ids,
      confirmHighAttempts: Boolean(body.confirmHighAttempts),
      staffNote,
    });
    const status = result.ok ? 200 : result.needsHighAttemptConfirm ? 409 : 422;
    return NextResponse.json(result, { status });
  }

  if (action === "ignore") {
    const result = await ignoreWebhookOutboxEvents({
      supabase: auth.session.supabase,
      staffUserId: auth.session.adminUserId,
      ids,
      staffNote,
    });
    return NextResponse.json(result, { status: result.ok ? 200 : 422 });
  }

  return NextResponse.json({ ok: false, error: "Unknown or missing action" }, { status: 400 });
}
