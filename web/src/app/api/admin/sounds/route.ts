import { NextRequest, NextResponse } from "next/server";

import { requireAdminApiSession } from "@/lib/admin/require-admin-api-session";
import {
  deleteSoundCatalogEntry,
  loadSoundCatalog,
  loadSoundCatalogAudit,
  loadSoundCatalogByPostId,
  loadSoundCatalogSummary,
  parseSoundCatalogFilters,
  setSoundCatalogActive,
  upsertSoundCatalogEntry,
} from "@/lib/admin/sound-catalog";
import { getClientIpFromHeaders } from "@/lib/server/rate-limit";
import { checkRateLimitDistributed } from "@/lib/server/rate-limit-distributed";

type MutationBody = {
  action?: string;
  postId?: string;
  postIds?: string[];
  artist?: string;
  keywords?: string;
  sortBoost?: number;
  isActive?: boolean;
  staffNote?: string;
};

function pickPostIds(body: MutationBody): string[] {
  const ids = new Set<string>();
  if (typeof body.postId === "string" && body.postId.trim()) ids.add(body.postId.trim());
  if (Array.isArray(body.postIds)) {
    for (const id of body.postIds) {
      if (typeof id === "string" && id.trim()) ids.add(id.trim());
    }
  }
  return [...ids];
}

export async function GET(req: NextRequest) {
  const auth = await requireAdminApiSession();
  if (!auth.ok) return auth.response;

  const sp = req.nextUrl.searchParams;
  const postId = sp.get("postId")?.trim();

  if (postId) {
    const [sound, audit] = await Promise.all([
      loadSoundCatalogByPostId(postId),
      loadSoundCatalogAudit(postId),
    ]);
    if (!sound) {
      return NextResponse.json({ ok: false, error: "Not found" }, { status: 404 });
    }
    return NextResponse.json({ ok: true, sound, audit });
  }

  const filters = parseSoundCatalogFilters({
    q: sp.get("q") ?? undefined,
    status: sp.get("status") ?? undefined,
    source: sp.get("source") ?? undefined,
    sort: sp.get("sort") ?? undefined,
  });

  const [summary, list] = await Promise.all([loadSoundCatalogSummary(), loadSoundCatalog(filters)]);

  return NextResponse.json({
    ok: true,
    summary,
    sounds: list.sounds,
    total: list.total,
    filters,
  });
}

export async function POST(req: NextRequest) {
  const ip = getClientIpFromHeaders((n) => req.headers.get(n));
  const rl = await checkRateLimitDistributed(`api:admin-sounds:${ip}`, 40, 60_000);
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
  const staffNote = typeof body.staffNote === "string" ? body.staffNote : undefined;
  const staffUserId = auth.session.adminUserId;

  if (action === "upsert") {
    if (!body.postId?.trim()) {
      return NextResponse.json({ ok: false, error: "postId is required" }, { status: 400 });
    }
    const result = await upsertSoundCatalogEntry({
      staffUserId,
      postId: body.postId,
      artist: body.artist,
      keywords: body.keywords,
      sortBoost: typeof body.sortBoost === "number" ? body.sortBoost : undefined,
      isActive: typeof body.isActive === "boolean" ? body.isActive : undefined,
      staffNote,
    });
    return NextResponse.json(result, { status: result.ok ? 200 : 422 });
  }

  const postIds = pickPostIds(body);
  if (!postIds.length) {
    return NextResponse.json({ ok: false, error: "postId or postIds is required" }, { status: 400 });
  }

  if (action === "activate" || action === "hide") {
    let updated = 0;
    let lastError = "";
    for (const postId of postIds) {
      const result = await setSoundCatalogActive({
        staffUserId,
        postId,
        isActive: action === "activate",
        staffNote,
      });
      if (result.ok) updated += 1;
      else lastError = result.error;
    }
    if (updated === 0) {
      return NextResponse.json({ ok: false, error: lastError || "No rows updated." }, { status: 422 });
    }
    return NextResponse.json({ ok: true, updated });
  }

  if (action === "delete") {
    if (postIds.length !== 1) {
      return NextResponse.json(
        { ok: false, error: "Remove one catalog entry at a time." },
        { status: 400 },
      );
    }
    const result = await deleteSoundCatalogEntry({
      staffUserId,
      postId: postIds[0]!,
      staffNote,
    });
    return NextResponse.json(result, { status: result.ok ? 200 : 422 });
  }

  return NextResponse.json({ ok: false, error: "Unknown or missing action" }, { status: 400 });
}
