import "server-only";

import { createSupabaseServerClient, isSupabaseConfigured } from "@/lib/supabase/server";

import { hydrateAuthors, loadHiddenCreators } from "./circles-data";
import { loadBlockedUserIds } from "./engagement-data";
import { toHttps } from "./format";

type AnyRow = Record<string, unknown>;
type Supa = Awaited<ReturnType<typeof createSupabaseServerClient>>;

/**
 * Mirrors the native discovery rule (`lib/live/activeLiveStreams.ts`): a stream
 * is only "live now" while the host has pinged within this window. Keeps stale /
 * crashed broadcasts out of the web Live page without needing a server cron.
 */
const LIVE_DISCOVERY_STALE_MS = 2 * 60 * 1000;
const LIVE_LIMIT = 24;
const UPCOMING_LIMIT = 12;

export type WebLiveHost = {
  id: string;
  displayName: string;
  username: string | null;
  avatarUrl: string | null;
};

export type WebLiveStream = {
  id: string;
  title: string;
  category: string | null;
  thumbnailUrl: string | null;
  viewerCount: number;
  startedAt: string | null;
  scheduledFor: string | null;
  host: WebLiveHost | null;
};

export type WebLiveResult =
  | { state: "error" }
  | { state: "ok"; liveNow: WebLiveStream[]; upcoming: WebLiveStream[] };

export type WebLiveStreamStatus = "live" | "scheduled" | "ended";

export type WebLiveDetailResult =
  | { state: "error" }
  | { state: "unavailable" }
  | {
      state: "ok";
      stream: WebLiveStream;
      status: WebLiveStreamStatus;
      /** Other streams live right now (excludes the current one). */
      others: WebLiveStream[];
    };

function str(v: unknown): string | null {
  return typeof v === "string" && v.trim() ? v : null;
}

function parseMs(v: unknown): number | null {
  if (typeof v !== "string" || !v.trim()) return null;
  const ms = Date.parse(v);
  return Number.isFinite(ms) ? ms : null;
}

/** Same heartbeat gate as native discovery. */
function isFreshLive(row: AnyRow): boolean {
  const heartbeat =
    parseMs(row.host_last_seen_at) ?? parseMs(row.broadcast_started_at) ?? parseMs(row.started_at);
  if (heartbeat == null) return false;
  return Date.now() - heartbeat <= LIVE_DISCOVERY_STALE_MS;
}

const STREAM_COLS =
  "id, host_id, title, category, thumbnail_url, status, viewer_count, started_at, scheduled_for, ended_at, broadcast_started_at, host_last_seen_at";

/** Map a raw `live_streams` row + hydrated host profiles to the web shape. */
function mapStream(r: AnyRow, profiles: Map<string, AnyRow>): WebLiveStream {
  const hostId = typeof r.host_id === "string" ? r.host_id : null;
  const prof = hostId ? profiles.get(hostId) : null;
  const category = str(r.category);
  return {
    id: String(r.id),
    title: str(r.title) || "Live",
    category: category && category.toLowerCase() !== "other" ? category : null,
    thumbnailUrl: toHttps(r.thumbnail_url),
    viewerCount: Number(r.viewer_count ?? 0) || 0,
    startedAt: str(r.started_at) ?? str(r.broadcast_started_at),
    scheduledFor: str(r.scheduled_for),
    host: hostId
      ? {
          id: hostId,
          displayName: str(prof?.display_name) || str(prof?.username) || "Host",
          username: str(prof?.username),
          avatarUrl: toHttps(prof?.avatar_url),
        }
      : null,
  };
}

/**
 * Read-only Live discovery for the native web Live page. Never exposes ended /
 * stale / blocked / hidden streams. RLS on `live_streams` is the source of
 * truth; we layer the native discovery + blocked/hidden filters on top. No web
 * playback — cards deep-link into the app.
 */
export async function loadWebLive(viewerId: string): Promise<WebLiveResult> {
  if (!isSupabaseConfigured()) return { state: "error" };
  let supabase: Supa;
  try {
    supabase = await createSupabaseServerClient();
  } catch {
    return { state: "error" };
  }

  try {
    const [hidden, blocked] = await Promise.all([
      loadHiddenCreators(supabase, viewerId),
      loadBlockedUserIds(supabase, viewerId),
    ]);
    const excluded = (hostId: string | null): boolean =>
      !hostId || hidden.has(hostId) || blocked.has(hostId);

    const nowIso = new Date().toISOString();

    const [{ data: liveRows }, { data: upcomingRows }] = await Promise.all([
      supabase
        .from("live_streams")
        .select(STREAM_COLS)
        .eq("status", "live")
        .is("ended_at", null)
        .not("broadcast_started_at", "is", null)
        .order("viewer_count", { ascending: false })
        .limit(LIVE_LIMIT * 2),
      supabase
        .from("live_streams")
        .select(STREAM_COLS)
        .eq("status", "scheduled")
        .is("ended_at", null)
        .gt("scheduled_for", nowIso)
        .order("scheduled_for", { ascending: true })
        .limit(UPCOMING_LIMIT * 2),
    ]);

    const liveFiltered = ((liveRows ?? []) as AnyRow[])
      .filter((r) => !excluded(typeof r.host_id === "string" ? r.host_id : null))
      .filter(isFreshLive)
      .slice(0, LIVE_LIMIT);

    const upcomingFiltered = ((upcomingRows ?? []) as AnyRow[])
      .filter((r) => !excluded(typeof r.host_id === "string" ? r.host_id : null))
      .slice(0, UPCOMING_LIMIT);

    const hostIds = [
      ...liveFiltered.map((r) => (typeof r.host_id === "string" ? r.host_id : "")),
      ...upcomingFiltered.map((r) => (typeof r.host_id === "string" ? r.host_id : "")),
    ].filter(Boolean);
    const profiles = await hydrateAuthors(supabase, hostIds);

    return {
      state: "ok",
      liveNow: liveFiltered.map((r) => mapStream(r, profiles)),
      upcoming: upcomingFiltered.map((r) => mapStream(r, profiles)),
    };
  } catch {
    return { state: "error" };
  }
}

const OTHERS_LIMIT = 6;

/**
 * Single live stream for the native web Live detail page. Applies the same
 * blocked/hidden/freshness rules as discovery and resolves a status the UI can
 * branch on (live / scheduled / ended). Also returns a few other currently-live
 * streams for the "more live now" rail. No web playback — the detail page links
 * out to the app to watch.
 */
export async function loadWebLiveStream(
  streamId: string,
  viewerId: string,
): Promise<WebLiveDetailResult> {
  if (!isSupabaseConfigured() || !streamId) return { state: "error" };
  let supabase: Supa;
  try {
    supabase = await createSupabaseServerClient();
  } catch {
    return { state: "error" };
  }

  try {
    const [hidden, blocked] = await Promise.all([
      loadHiddenCreators(supabase, viewerId),
      loadBlockedUserIds(supabase, viewerId),
    ]);
    const excluded = (hostId: string | null): boolean =>
      !hostId || hidden.has(hostId) || blocked.has(hostId);

    const { data: row, error } = await supabase
      .from("live_streams")
      .select(STREAM_COLS)
      .eq("id", streamId)
      .maybeSingle();
    if (error) return { state: "error" };
    if (!row) return { state: "unavailable" };

    const r = row as AnyRow;
    const hostId = typeof r.host_id === "string" ? r.host_id : null;
    // Blocked / hidden hosts must never be surfaced, even via a direct link.
    if (excluded(hostId)) return { state: "unavailable" };

    const rawStatus = String(r.status ?? "").toLowerCase();
    const ended = r.ended_at != null || rawStatus === "ended";
    let status: WebLiveStreamStatus;
    if (ended) {
      status = "ended";
    } else if (rawStatus === "scheduled") {
      status = "scheduled";
    } else if (rawStatus === "live" && r.broadcast_started_at != null && isFreshLive(r)) {
      status = "live";
    } else {
      // Live row that hasn't actually started or whose heartbeat is stale.
      status = rawStatus === "scheduled" ? "scheduled" : "ended";
    }

    // Other live-now streams for the side rail (best-effort).
    const { data: liveRows } = await supabase
      .from("live_streams")
      .select(STREAM_COLS)
      .eq("status", "live")
      .is("ended_at", null)
      .not("broadcast_started_at", "is", null)
      .order("viewer_count", { ascending: false })
      .limit((OTHERS_LIMIT + 2) * 2);

    const others = ((liveRows ?? []) as AnyRow[])
      .filter((o) => String(o.id) !== String(r.id))
      .filter((o) => !excluded(typeof o.host_id === "string" ? o.host_id : null))
      .filter(isFreshLive)
      .slice(0, OTHERS_LIMIT);

    const hostIds = [
      hostId ?? "",
      ...others.map((o) => (typeof o.host_id === "string" ? o.host_id : "")),
    ].filter(Boolean);
    const profiles = await hydrateAuthors(supabase, hostIds);

    return {
      state: "ok",
      stream: mapStream(r, profiles),
      status,
      others: others.map((o) => mapStream(o, profiles)),
    };
  } catch {
    return { state: "error" };
  }
}
