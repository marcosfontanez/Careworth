import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";

import { writeAdminAudit } from "@/lib/admin/audit-log";
import { sanitizeSoundPreviewUrl } from "@/lib/admin/sound-catalog-payload";
import { createAdminDataSupabaseClient } from "@/lib/supabase/admin-data";
import { createSupabaseServerClient, isSupabaseConfigured } from "@/lib/supabase/server";

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export type SoundCatalogStatusFilter = "all" | "active" | "hidden";
export type SoundCatalogSort = "newest" | "most_used" | "title" | "boost";

export type SoundCatalogFilters = {
  q: string;
  status: SoundCatalogStatusFilter;
  source: string;
  sort: SoundCatalogSort;
};

export type SoundCatalogRow = {
  id: string;
  postId: string;
  title: string;
  artist: string | null;
  keywords: string | null;
  sortBoost: number;
  status: "active" | "hidden";
  isActive: boolean;
  remixCount: number;
  catalogCreatedAt: string;
  postCreatedAt: string | null;
  creatorId: string | null;
  creatorUsername: string | null;
  creatorDisplayName: string | null;
  previewUrl: string | null;
  thumbnailUrl: string | null;
};

export type SoundCatalogSummary = {
  total: number;
  active: number;
  hidden: number;
};

export type SoundCatalogAuditRow = {
  id: string;
  createdAt: string;
  action: string;
  staffDisplayName: string;
  metadata: Record<string, unknown>;
};

type CatalogDbRow = {
  id: string;
  post_id: string;
  artist: string | null;
  keywords: string | null;
  sort_boost: number;
  is_active: boolean;
  created_at: string;
};

type PostDbRow = {
  id: string;
  sound_title: string | null;
  caption: string | null;
  media_url: string | null;
  thumbnail_url: string | null;
  creator_id: string | null;
  created_at: string;
};

function resolveTitle(post: PostDbRow | undefined): string {
  if (!post) return "Original sound";
  const fromTitle = post.sound_title?.trim();
  if (fromTitle) return fromTitle;
  const fromCaption = post.caption?.trim().slice(0, 120);
  if (fromCaption) return fromCaption;
  return "Original sound";
}

function mapRpcError(message: string): string {
  const m = message.toLowerCase();
  if (m.includes("forbidden") || m.includes("42501")) return "Staff access required.";
  if (m.includes("invalid_post_for_catalog")) {
    return "Post must be a non-anonymous original video with media (not a remix).";
  }
  return message;
}

export function parseSoundCatalogFilters(
  input: Record<string, string | string[] | undefined>,
): SoundCatalogFilters {
  const pick = (key: string) => {
    const v = input[key];
    return typeof v === "string" ? v.trim() : "";
  };

  const statusRaw = pick("status");
  const status: SoundCatalogStatusFilter =
    statusRaw === "active" || statusRaw === "hidden" ? statusRaw : "all";

  const sortRaw = pick("sort");
  const sort: SoundCatalogSort =
    sortRaw === "most_used" || sortRaw === "title" || sortRaw === "boost" ? sortRaw : "newest";

  return {
    q: pick("q"),
    status,
    source: pick("source"),
    sort,
  };
}

function applyFiltersAndSort(rows: SoundCatalogRow[], filters: SoundCatalogFilters): SoundCatalogRow[] {
  let out = rows;

  if (filters.status === "active") out = out.filter((r) => r.isActive);
  if (filters.status === "hidden") out = out.filter((r) => !r.isActive);

  if (filters.source) {
    const s = filters.source.toLowerCase();
    out = out.filter(
      (r) =>
        (r.artist ?? "").toLowerCase().includes(s) ||
        (r.creatorUsername ?? "").toLowerCase().includes(s) ||
        (r.creatorDisplayName ?? "").toLowerCase().includes(s),
    );
  }

  if (filters.q) {
    const q = filters.q.toLowerCase();
    out = out.filter(
      (r) =>
        r.title.toLowerCase().includes(q) ||
        r.postId.toLowerCase().includes(q) ||
        (r.artist ?? "").toLowerCase().includes(q) ||
        (r.keywords ?? "").toLowerCase().includes(q) ||
        (r.creatorUsername ?? "").toLowerCase().includes(q) ||
        (r.creatorDisplayName ?? "").toLowerCase().includes(q),
    );
  }

  out = [...out];
  switch (filters.sort) {
    case "most_used":
      out.sort((a, b) => b.remixCount - a.remixCount || b.sortBoost - a.sortBoost);
      break;
    case "title":
      out.sort((a, b) => a.title.localeCompare(b.title));
      break;
    case "boost":
      out.sort((a, b) => b.sortBoost - a.sortBoost || b.remixCount - a.remixCount);
      break;
    default:
      out.sort(
        (a, b) =>
          new Date(b.catalogCreatedAt).getTime() - new Date(a.catalogCreatedAt).getTime(),
      );
  }

  return out;
}

async function enrichCatalogRows(
  supabase: SupabaseClient,
  catalogRows: CatalogDbRow[],
): Promise<SoundCatalogRow[]> {
  if (!catalogRows.length) return [];

  const postIds = catalogRows.map((r) => r.post_id);
  const [{ data: posts }, { data: remixRows }] = await Promise.all([
    supabase
      .from("posts")
      .select("id, sound_title, caption, media_url, thumbnail_url, creator_id, created_at")
      .in("id", postIds),
    supabase.from("posts").select("sound_source_post_id").in("sound_source_post_id", postIds),
  ]);

  const postById = new Map((posts ?? []).map((p) => [p.id as string, p as PostDbRow]));
  const remixCounts = new Map<string, number>();
  for (const row of remixRows ?? []) {
    const id = row.sound_source_post_id as string;
    remixCounts.set(id, (remixCounts.get(id) ?? 0) + 1);
  }

  const creatorIds = [
    ...new Set(
      (posts ?? [])
        .map((p) => p.creator_id as string | null)
        .filter((id): id is string => Boolean(id)),
    ),
  ];
  const { data: profiles } = creatorIds.length
    ? await supabase.from("profiles").select("id, username, display_name").in("id", creatorIds)
    : { data: [] as { id: string; username: string | null; display_name: string | null }[] };

  const profileById = new Map(
    (profiles ?? []).map((p) => [
      p.id as string,
      { username: (p.username as string) ?? null, displayName: (p.display_name as string) ?? null },
    ]),
  );

  return catalogRows.map((row) => {
    const post = postById.get(row.post_id);
    const profile = post?.creator_id ? profileById.get(post.creator_id) : undefined;
    return {
      id: row.id,
      postId: row.post_id,
      title: resolveTitle(post),
      artist: row.artist,
      keywords: row.keywords,
      sortBoost: Number(row.sort_boost ?? 0),
      status: row.is_active ? "active" : "hidden",
      isActive: Boolean(row.is_active),
      remixCount: remixCounts.get(row.post_id) ?? 0,
      catalogCreatedAt: row.created_at,
      postCreatedAt: post?.created_at ?? null,
      creatorId: post?.creator_id ?? null,
      creatorUsername: profile?.username ?? null,
      creatorDisplayName: profile?.displayName ?? null,
      previewUrl: sanitizeSoundPreviewUrl(post?.media_url),
      thumbnailUrl: sanitizeSoundPreviewUrl(post?.thumbnail_url),
    };
  });
}

export async function loadSoundCatalogSummary(): Promise<SoundCatalogSummary> {
  const empty = { total: 0, active: 0, hidden: 0 };
  if (!isSupabaseConfigured()) return empty;

  try {
    const supabase = await createAdminDataSupabaseClient();
    const [total, active] = await Promise.all([
      supabase.from("sound_catalog").select("id", { count: "exact", head: true }),
      supabase.from("sound_catalog").select("id", { count: "exact", head: true }).eq("is_active", true),
    ]);
    const t = total.count ?? 0;
    const a = active.count ?? 0;
    return { total: t, active: a, hidden: Math.max(0, t - a) };
  } catch (e) {
    console.error("loadSoundCatalogSummary:", e);
    return empty;
  }
}

export async function loadSoundCatalog(
  filters: SoundCatalogFilters,
): Promise<{ sounds: SoundCatalogRow[]; total: number; summary: SoundCatalogSummary }> {
  const empty = { sounds: [] as SoundCatalogRow[], total: 0, summary: { total: 0, active: 0, hidden: 0 } };
  if (!isSupabaseConfigured()) return empty;

  try {
    const supabase = await createAdminDataSupabaseClient();
    const { data, error } = await supabase
      .from("sound_catalog")
      .select("id, post_id, artist, keywords, sort_boost, is_active, created_at")
      .order("created_at", { ascending: false });

    if (error) {
      console.error("loadSoundCatalog:", error.message);
      return empty;
    }

    const enriched = await enrichCatalogRows(supabase, (data ?? []) as CatalogDbRow[]);
    const filtered = applyFiltersAndSort(enriched, filters);
    const summary = {
      total: enriched.length,
      active: enriched.filter((r) => r.isActive).length,
      hidden: enriched.filter((r) => !r.isActive).length,
    };

    return { sounds: filtered, total: filtered.length, summary };
  } catch (e) {
    console.error("loadSoundCatalog:", e);
    return empty;
  }
}

export async function loadSoundCatalogByPostId(postId: string): Promise<SoundCatalogRow | null> {
  if (!UUID_RE.test(postId.trim()) || !isSupabaseConfigured()) return null;

  try {
    const supabase = await createAdminDataSupabaseClient();
    const { data, error } = await supabase
      .from("sound_catalog")
      .select("id, post_id, artist, keywords, sort_boost, is_active, created_at")
      .eq("post_id", postId.trim())
      .maybeSingle();

    if (error || !data) return null;
    const [row] = await enrichCatalogRows(supabase, [data as CatalogDbRow]);
    return row ?? null;
  } catch (e) {
    console.error("loadSoundCatalogByPostId:", e);
    return null;
  }
}

export async function loadSoundCatalogAudit(postId: string, limit = 12): Promise<SoundCatalogAuditRow[]> {
  if (!UUID_RE.test(postId.trim()) || !isSupabaseConfigured()) return [];

  try {
    const supabase = await createAdminDataSupabaseClient();
    const { data: rows, error } = await supabase
      .from("admin_audit_log")
      .select("id, created_at, action, metadata, staff_user_id")
      .eq("entity_type", "sound_catalog")
      .eq("entity_id", postId.trim())
      .order("created_at", { ascending: false })
      .limit(limit);

    if (error || !rows?.length) return [];

    const staffIds = [...new Set(rows.map((r) => r.staff_user_id as string))];
    const { data: profs } = await supabase
      .from("profiles")
      .select("id, display_name")
      .in("id", staffIds);

    const nameById = new Map(
      (profs ?? []).map((p) => [p.id as string, String(p.display_name ?? "")]),
    );

    return rows.map((r) => ({
      id: r.id as string,
      createdAt: r.created_at as string,
      action: String(r.action),
      staffDisplayName: nameById.get(r.staff_user_id as string) ?? (r.staff_user_id as string).slice(0, 8),
      metadata: (r.metadata as Record<string, unknown>) ?? {},
    }));
  } catch (e) {
    console.error("loadSoundCatalogAudit:", e);
    return [];
  }
}

async function writeSoundAudit(args: {
  staffUserId: string;
  action: string;
  postId: string;
  previous: Record<string, unknown>;
  next: Record<string, unknown>;
  staffNote?: string;
}): Promise<void> {
  const admin = await createAdminDataSupabaseClient();
  await writeAdminAudit(admin, {
    staffUserId: args.staffUserId,
    action: args.action,
    entityType: "sound_catalog",
    entityId: args.postId,
    metadata: {
      source_surface: "web",
      previous: args.previous,
      new: args.next,
      staff_note: args.staffNote?.trim() || null,
    },
  });
}

export async function upsertSoundCatalogEntry(args: {
  staffUserId: string;
  postId: string;
  artist?: string;
  keywords?: string;
  sortBoost?: number;
  isActive?: boolean;
  staffNote?: string;
}): Promise<{ ok: true; catalogId: string } | { ok: false; error: string }> {
  const postId = args.postId.trim();
  if (!UUID_RE.test(postId)) return { ok: false, error: "Invalid post id." };

  const previousRow = await loadSoundCatalogByPostId(postId);
  const sessionSb = await createSupabaseServerClient();

  const { data, error } = await sessionSb.rpc("admin_upsert_sound_catalog", {
    p_post_id: postId,
    p_artist: args.artist?.trim() || undefined,
    p_keywords: args.keywords?.trim() || undefined,
    p_sort_boost: args.sortBoost ?? previousRow?.sortBoost ?? 1000,
    p_is_active: args.isActive ?? previousRow?.isActive ?? true,
  });

  if (error) return { ok: false, error: mapRpcError(error.message) };

  const next = {
    post_id: postId,
    artist: args.artist?.trim() || null,
    keywords: args.keywords?.trim() || null,
    sort_boost: args.sortBoost ?? previousRow?.sortBoost ?? 1000,
    is_active: args.isActive ?? previousRow?.isActive ?? true,
  };

  await writeSoundAudit({
    staffUserId: args.staffUserId,
    action: "sound_catalog.upsert",
    postId,
    previous: previousRow
      ? {
          artist: previousRow.artist,
          keywords: previousRow.keywords,
          sort_boost: previousRow.sortBoost,
          is_active: previousRow.isActive,
        }
      : {},
    next,
    staffNote: args.staffNote,
  });

  return { ok: true, catalogId: String(data ?? "") };
}

export async function setSoundCatalogActive(args: {
  staffUserId: string;
  postId: string;
  isActive: boolean;
  staffNote?: string;
}): Promise<{ ok: true } | { ok: false; error: string }> {
  const postId = args.postId.trim();
  if (!UUID_RE.test(postId)) return { ok: false, error: "Invalid post id." };

  const previousRow = await loadSoundCatalogByPostId(postId);
  if (!previousRow) return { ok: false, error: "Catalog entry not found." };

  const sessionSb = await createSupabaseServerClient();
  const { error } = await sessionSb.rpc("admin_upsert_sound_catalog", {
    p_post_id: postId,
    p_artist: previousRow.artist ?? undefined,
    p_keywords: previousRow.keywords ?? undefined,
    p_sort_boost: previousRow.sortBoost,
    p_is_active: args.isActive,
  });

  if (error) return { ok: false, error: mapRpcError(error.message) };

  await writeSoundAudit({
    staffUserId: args.staffUserId,
    action: args.isActive ? "sound_catalog.activate" : "sound_catalog.hide",
    postId,
    previous: { is_active: previousRow.isActive },
    next: { is_active: args.isActive },
    staffNote: args.staffNote,
  });

  return { ok: true };
}

export async function deleteSoundCatalogEntry(args: {
  staffUserId: string;
  postId: string;
  staffNote?: string;
}): Promise<{ ok: true } | { ok: false; error: string }> {
  const postId = args.postId.trim();
  if (!UUID_RE.test(postId)) return { ok: false, error: "Invalid post id." };

  const previousRow = await loadSoundCatalogByPostId(postId);
  if (!previousRow) return { ok: false, error: "Catalog entry not found." };

  const sessionSb = await createSupabaseServerClient();
  const { error } = await sessionSb.rpc("admin_delete_sound_catalog", { p_post_id: postId });
  if (error) return { ok: false, error: mapRpcError(error.message) };

  await writeSoundAudit({
    staffUserId: args.staffUserId,
    action: "sound_catalog.delete",
    postId,
    previous: {
      artist: previousRow.artist,
      keywords: previousRow.keywords,
      sort_boost: previousRow.sortBoost,
      is_active: previousRow.isActive,
    },
    next: { removed: true },
    staffNote: args.staffNote,
  });

  return { ok: true };
}
