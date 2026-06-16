import { NextRequest, NextResponse } from "next/server";

import {
  createAdminCampaign,
  duplicateAdminCampaign,
  isCampaignEditorEnabled,
  linkCampaignLead,
  loadAdminCampaignById,
  loadAdminCampaigns,
  loadCampaignAudit,
  loadCampaignOwnerOptions,
  loadKnownPlacements,
  loadLeadPrefill,
  parseCampaignEditorFilters,
  setAdminCampaignStatus,
  updateAdminCampaign,
  type CampaignInput,
  type CampaignStatus,
} from "@/lib/admin/campaign-editor";
import { requireAdminApiSession } from "@/lib/admin/require-admin-api-session";
import { getClientIpFromHeaders } from "@/lib/server/rate-limit";
import { checkRateLimitDistributed } from "@/lib/server/rate-limit-distributed";

type MutationBody = {
  action?: string;
  id?: string;
  staffNote?: string;
  leadId?: string | null;
  campaign?: Partial<CampaignInput>;
  status?: CampaignStatus;
};

function editorDisabledResponse() {
  return NextResponse.json(
    { ok: false, error: "Campaign editor is disabled. Enable admin_campaign_editor_enabled on Platform." },
    { status: 403 },
  );
}

export async function GET(req: NextRequest) {
  const auth = await requireAdminApiSession({ permission: "campaigns.write" });
  if (!auth.ok) return auth.response;

  const sp = req.nextUrl.searchParams;
  const id = sp.get("id")?.trim();
  const leadId = sp.get("leadId")?.trim();

  if (leadId) {
    const prefill = await loadLeadPrefill(leadId);
    return NextResponse.json({ ok: true, prefill });
  }

  if (id) {
    const [campaign, audit] = await Promise.all([loadAdminCampaignById(id), loadCampaignAudit(id)]);
    if (!campaign) {
      return NextResponse.json({ ok: false, error: "Not found" }, { status: 404 });
    }
    return NextResponse.json({ ok: true, campaign, audit });
  }

  const filters = parseCampaignEditorFilters({
    q: sp.get("q") ?? undefined,
    status: sp.get("status") ?? undefined,
    placement: sp.get("placement") ?? undefined,
    ownerId: sp.get("ownerId") ?? undefined,
    from: sp.get("from") ?? undefined,
    to: sp.get("to") ?? undefined,
    sort: sp.get("sort") ?? undefined,
  });

  const [list, owners, placements, editorEnabled] = await Promise.all([
    loadAdminCampaigns(filters),
    loadCampaignOwnerOptions(),
    loadKnownPlacements(),
    isCampaignEditorEnabled(),
  ]);

  return NextResponse.json({
    ok: true,
    campaigns: list.campaigns,
    total: list.total,
    filters,
    owners,
    placements,
    editorEnabled,
  });
}

export async function POST(req: NextRequest) {
  const ip = getClientIpFromHeaders((n) => req.headers.get(n));
  const rl = await checkRateLimitDistributed(`api:admin-campaigns:${ip}`, 40, 60_000);
  if (!rl.ok) {
    return NextResponse.json({ ok: false, error: "Too many requests. Try again shortly." }, { status: 429 });
  }

  const auth = await requireAdminApiSession({ permission: "campaigns.write" });
  if (!auth.ok) return auth.response;

  const editorEnabled = await isCampaignEditorEnabled();
  if (!editorEnabled) return editorDisabledResponse();

  let body: MutationBody;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ ok: false, error: "Invalid JSON body" }, { status: 400 });
  }

  const action = typeof body.action === "string" ? body.action.trim() : "";
  const staffNote = typeof body.staffNote === "string" ? body.staffNote : undefined;

  if (action === "create") {
    const c = body.campaign;
    if (!c || typeof c !== "object") {
      return NextResponse.json({ ok: false, error: "campaign payload required" }, { status: 400 });
    }
    const result = await createAdminCampaign(auth.session.supabase, auth.session.adminUserId, c as CampaignInput);
    return NextResponse.json(result, { status: result.ok ? 200 : 422 });
  }

  const id = typeof body.id === "string" ? body.id.trim() : "";
  if (!id) {
    return NextResponse.json({ ok: false, error: "id is required" }, { status: 400 });
  }

  if (action === "update") {
    const c = body.campaign;
    if (!c || typeof c !== "object") {
      return NextResponse.json({ ok: false, error: "campaign payload required" }, { status: 400 });
    }
    const result = await updateAdminCampaign(
      auth.session.supabase,
      auth.session.adminUserId,
      id,
      c as CampaignInput,
    );
    return NextResponse.json(result, { status: result.ok ? 200 : 422 });
  }

  if (action === "pause") {
    const result = await setAdminCampaignStatus(auth.session.supabase, auth.session.adminUserId, id, "paused", staffNote);
    return NextResponse.json(result, { status: result.ok ? 200 : 422 });
  }

  if (action === "resume") {
    const result = await setAdminCampaignStatus(auth.session.supabase, auth.session.adminUserId, id, "active", staffNote);
    return NextResponse.json(result, { status: result.ok ? 200 : 422 });
  }

  if (action === "complete") {
    const result = await setAdminCampaignStatus(
      auth.session.supabase,
      auth.session.adminUserId,
      id,
      "completed",
      staffNote,
    );
    return NextResponse.json(result, { status: result.ok ? 200 : 422 });
  }

  if (action === "cancel") {
    const result = await setAdminCampaignStatus(
      auth.session.supabase,
      auth.session.adminUserId,
      id,
      "cancelled",
      staffNote,
    );
    return NextResponse.json(result, { status: result.ok ? 200 : 422 });
  }

  if (action === "duplicate") {
    const result = await duplicateAdminCampaign(auth.session.supabase, auth.session.adminUserId, id);
    return NextResponse.json(result, { status: result.ok ? 200 : 422 });
  }

  if (action === "link_lead") {
    const leadId = body.leadId === null ? null : typeof body.leadId === "string" ? body.leadId.trim() : null;
    const result = await linkCampaignLead(auth.session.supabase, auth.session.adminUserId, id, leadId, staffNote);
    return NextResponse.json(result, { status: result.ok ? 200 : 422 });
  }

  if (action === "status" && body.status) {
    const result = await setAdminCampaignStatus(
      auth.session.supabase,
      auth.session.adminUserId,
      id,
      body.status,
      staffNote,
    );
    return NextResponse.json(result, { status: result.ok ? 200 : 422 });
  }

  return NextResponse.json({ ok: false, error: "Unknown or missing action" }, { status: 400 });
}
