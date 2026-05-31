import "server-only";

import { createSupabaseServerClient, isSupabaseConfigured } from "@/lib/supabase/server";

import type { WebAppRailCircle, WebAppRailCreator } from "@/components/web-app/web-app-chrome";
import { toHttps } from "./format";

type AnyRow = Record<string, unknown>;

export type WebRailData = {
  circles: WebAppRailCircle[];
  creators: WebAppRailCreator[];
};

const EMPTY: WebRailData = { circles: [], creators: [] };

/**
 * Lightweight, public-safe data for the right rail. Runs once per page in the
 * shell layout. Each source is best-effort: a failure yields an empty list and
 * the rail falls back to its static cards. Never exposes private/anonymous or
 * blocked content.
 */
export async function loadWebRail(viewerId: string): Promise<WebRailData> {
  if (!isSupabaseConfigured()) return EMPTY;
  let supabase: Awaited<ReturnType<typeof createSupabaseServerClient>>;
  try {
    supabase = await createSupabaseServerClient();
  } catch {
    return EMPTY;
  }

  const [circles, creators] = await Promise.all([
    loadTrendingCircles(supabase),
    loadSuggestedCreators(supabase, viewerId),
  ]);
  return { circles, creators };
}

async function loadTrendingCircles(
  supabase: Awaited<ReturnType<typeof createSupabaseServerClient>>,
): Promise<WebAppRailCircle[]> {
  try {
    const { data } = await supabase
      .from("communities")
      .select("slug, name, icon, featured_order, member_count")
      .order("featured_order", { ascending: true, nullsFirst: false })
      .order("member_count", { ascending: false })
      .limit(5);
    return ((data ?? []) as AnyRow[]).map((c) => ({
      slug: String(c.slug),
      name: typeof c.name === "string" && c.name.trim() ? c.name : String(c.slug),
      icon: typeof c.icon === "string" && c.icon.trim() ? c.icon : null,
    }));
  } catch {
    return [];
  }
}

async function loadSuggestedCreators(
  supabase: Awaited<ReturnType<typeof createSupabaseServerClient>>,
  viewerId: string,
): Promise<WebAppRailCreator[]> {
  try {
    // Blocked / hidden creators for this viewer (best-effort).
    const hidden = new Set<string>();
    try {
      const { data: ex } = await supabase.rpc("get_feed_exclusions", { viewer_uuid: viewerId });
      if (ex && typeof ex === "object") {
        const obj = ex as { hidden_creator_ids?: unknown };
        if (Array.isArray(obj.hidden_creator_ids)) {
          for (const c of obj.hidden_creator_ids) if (typeof c === "string") hidden.add(c);
        }
      }
    } catch {
      /* best-effort */
    }

    const { data } = await supabase
      .from("profiles")
      .select("id, display_name, username, avatar_url, follower_count, privacy_mode")
      .order("follower_count", { ascending: false })
      .limit(16);

    const out: WebAppRailCreator[] = [];
    for (const p of (data ?? []) as AnyRow[]) {
      const id = String(p.id);
      if (id === viewerId || hidden.has(id)) continue;
      // Never surface private accounts as suggestions.
      if (String(p.privacy_mode ?? "public").toLowerCase() === "private") continue;
      out.push({
        id,
        displayName:
          (typeof p.display_name === "string" && p.display_name.trim()) ||
          (typeof p.username === "string" && p.username.trim()) ||
          "PulseVerse member",
        username: typeof p.username === "string" && p.username.trim() ? p.username : null,
        avatarUrl: toHttps(p.avatar_url),
      });
      if (out.length >= 5) break;
    }
    return out;
  } catch {
    return [];
  }
}
