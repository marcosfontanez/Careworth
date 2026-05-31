import "server-only";

import { createSupabaseServerClient, isSupabaseConfigured } from "@/lib/supabase/server";

import { toHttps } from "./format";

type AnyRow = Record<string, unknown>;
type Supa = Awaited<ReturnType<typeof createSupabaseServerClient>>;

const FRAME_FIELDS =
  "id, slug, label, subtitle, prize_tier, rarity_tier, acquisition_tag, ring_color, glow_color, ring_caption";

export type WebShopBorder = {
  id: string;
  slug: string | null;
  label: string;
  subtitle: string | null;
  rarityTier: string | null;
  prizeTier: string | null;
  ringColor: string | null;
  glowColor: string | null;
  ringCaption: string | null;
  grantedAt: string | null;
  equipped: boolean;
};

export type WebShopResult =
  | { state: "error" }
  | {
      state: "ok";
      avatarUrl: string | null;
      displayName: string;
      equippedId: string | null;
      borders: WebShopBorder[];
    };

function str(v: unknown): string | null {
  return typeof v === "string" && v.trim() ? v : null;
}

/**
 * Load the signed-in viewer's owned cosmetic borders + equipped state. Reads are
 * scoped to the viewer's own rows only (`user_pulse_avatar_frames.user_id` and
 * their own `profiles` row), so no other user's inventory or any financial data
 * is ever exposed. Earnings/diamonds are intentionally not queried here.
 */
export async function loadWebShop(viewerId: string): Promise<WebShopResult> {
  if (!isSupabaseConfigured() || !viewerId) return { state: "error" };
  let supabase: Supa;
  try {
    supabase = await createSupabaseServerClient();
  } catch {
    return { state: "error" };
  }

  try {
    const [profileRes, unlocksRes] = await Promise.all([
      supabase
        .from("profiles")
        .select("display_name, username, avatar_url, selected_pulse_avatar_frame_id")
        .eq("id", viewerId)
        .maybeSingle(),
      supabase
        .from("user_pulse_avatar_frames")
        .select("frame_id, granted_at")
        .eq("user_id", viewerId)
        .order("granted_at", { ascending: false }),
    ]);

    if (profileRes.error) return { state: "error" };
    const profile = (profileRes.data as AnyRow | null) ?? {};
    const equippedId = str(profile.selected_pulse_avatar_frame_id);
    const avatarUrl = toHttps(profile.avatar_url);
    const displayName = str(profile.display_name) || str(profile.username) || "PulseVerse member";

    const unlocks = (unlocksRes.data ?? []) as AnyRow[];
    const grantedById = new Map<string, string | null>();
    for (const u of unlocks) {
      const fid = str(u.frame_id);
      if (fid && !grantedById.has(fid)) grantedById.set(fid, str(u.granted_at));
    }

    const frameIds = [...grantedById.keys()];
    let borders: WebShopBorder[] = [];
    if (frameIds.length > 0) {
      const { data: catalog } = await supabase.from("pulse_avatar_frames").select(FRAME_FIELDS).in("id", frameIds);
      borders = ((catalog ?? []) as AnyRow[]).map((r) => {
        const id = String(r.id);
        return {
          id,
          slug: str(r.slug),
          label: str(r.label) || "Border",
          subtitle: str(r.subtitle),
          rarityTier: str(r.rarity_tier),
          prizeTier: str(r.prize_tier),
          ringColor: str(r.ring_color),
          glowColor: str(r.glow_color),
          ringCaption: str(r.ring_caption),
          grantedAt: grantedById.get(id) ?? null,
          equipped: !!equippedId && id === equippedId,
        };
      });
      // Equipped first, then most recently granted.
      borders.sort((a, b) => {
        if (a.equipped !== b.equipped) return a.equipped ? -1 : 1;
        return (b.grantedAt ?? "").localeCompare(a.grantedAt ?? "");
      });
    }

    return { state: "ok", avatarUrl, displayName, equippedId, borders };
  } catch {
    return { state: "error" };
  }
}
