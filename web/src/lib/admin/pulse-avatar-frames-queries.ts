import "server-only";

import { createAdminDataSupabaseClient } from "@/lib/supabase/admin-data";
import { isSupabaseConfigured } from "@/lib/supabase/server";

export type AdminPulseAvatarFrameRow = {
  id: string;
  slug: string;
  label: string;
  subtitle: string | null;
  prize_tier: string;
  month_start: string;
  ring_color: string;
  glow_color: string;
  ring_caption: string | null;
  sort_order: number;
  created_at: string;
};

/** Full catalog for admin (all borders ever added in migrations / seeds). */
export async function loadPulseAvatarFrameCatalog(): Promise<AdminPulseAvatarFrameRow[]> {
  if (!isSupabaseConfigured()) return [];
  try {
    const supabase = await createAdminDataSupabaseClient();
    const { data, error } = await supabase
      .from("pulse_avatar_frames")
      .select("id, slug, label, subtitle, prize_tier, month_start, ring_color, glow_color, ring_caption, sort_order, created_at")
      .order("month_start", { ascending: false })
      .order("sort_order", { ascending: true })
      .order("label", { ascending: true });
    if (error) {
      console.warn("loadPulseAvatarFrameCatalog:", error.message);
      return [];
    }
    return (data ?? []) as AdminPulseAvatarFrameRow[];
  } catch (e) {
    console.warn("loadPulseAvatarFrameCatalog:", e);
    return [];
  }
}
