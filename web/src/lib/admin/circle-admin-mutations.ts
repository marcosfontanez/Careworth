import "server-only";

import { revalidatePath } from "next/cache";

import { writeAdminAudit } from "@/lib/admin/audit-log";
import { requireAdminSupabaseForModeration } from "@/lib/admin/moderation-auth";

function auditMeta(extra?: Record<string, unknown>) {
  return { source_surface: "web", timestamp: new Date().toISOString(), ...(extra ?? {}) };
}

async function gate() {
  return requireAdminSupabaseForModeration();
}

function normalizeSlug(raw: string): string {
  return raw
    .trim()
    .toLowerCase()
    .replace(/\s+/g, "-")
    .replace(/[^a-z0-9-]/g, "")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");
}

export async function adminCreateCircle(input: {
  slug: string;
  name: string;
  description?: string;
  icon?: string;
  accentColor?: string;
  categories?: string[];
}): Promise<{ ok: boolean; error?: string; id?: string; slug?: string }> {
  const g = await gate();
  if (!g.ok) return { ok: false, error: g.error };
  const { supabase, adminUserId } = g;

  const slug = normalizeSlug(input.slug);
  if (!slug) return { ok: false, error: "Invalid slug." };
  const name = input.name.trim();
  if (!name) return { ok: false, error: "Name is required." };

  const { data, error } = await supabase
    .from("communities")
    .insert({
      slug,
      name,
      description: (input.description ?? "").trim(),
      icon: input.icon?.trim() || "🏥",
      accent_color: input.accentColor?.trim() || "#1E4ED8",
      categories: input.categories ?? [],
    })
    .select("id, slug")
    .single();

  if (error) return { ok: false, error: error.message };

  await writeAdminAudit(supabase, {
    staffUserId: adminUserId,
    action: "circle.create",
    entityType: "community",
    entityId: data.id,
    metadata: auditMeta({ circle_id: data.id, slug: data.slug, name }),
  });

  revalidatePath("/admin/circles");
  revalidatePath("/admin/audit");
  return { ok: true, id: data.id, slug: data.slug };
}

export async function adminUpdateCircle(
  communityId: string,
  patch: {
    name?: string;
    description?: string;
    icon?: string;
    accentColor?: string;
    categories?: string[];
    trendingTopics?: string[];
  },
): Promise<{ ok: boolean; error?: string }> {
  const g = await gate();
  if (!g.ok) return { ok: false, error: g.error };
  const { supabase, adminUserId } = g;

  const { data: prev, error: readErr } = await supabase
    .from("communities")
    .select("name, description, icon, accent_color, categories, trending_topics")
    .eq("id", communityId)
    .maybeSingle();
  if (readErr || !prev) return { ok: false, error: readErr?.message ?? "Circle not found" };

  const payload: Record<string, unknown> = {};
  if (patch.name !== undefined) payload.name = patch.name.trim();
  if (patch.description !== undefined) payload.description = patch.description.trim();
  if (patch.icon !== undefined) payload.icon = patch.icon.trim();
  if (patch.accentColor !== undefined) payload.accent_color = patch.accentColor.trim();
  if (patch.categories !== undefined) payload.categories = patch.categories;
  if (patch.trendingTopics !== undefined) payload.trending_topics = patch.trendingTopics;

  const { error } = await supabase.from("communities").update(payload).eq("id", communityId);
  if (error) return { ok: false, error: error.message };

  await writeAdminAudit(supabase, {
    staffUserId: adminUserId,
    action: "circle.update",
    entityType: "community",
    entityId: communityId,
    metadata: auditMeta({
      circle_id: communityId,
      old_values: prev,
      new_values: payload,
    }),
  });

  revalidatePath("/admin/circles");
  revalidatePath("/admin/audit");
  return { ok: true };
}

export async function adminSetFeaturedOrder(
  communityId: string,
  featuredOrder: number | null,
): Promise<{ ok: boolean; error?: string }> {
  const g = await gate();
  if (!g.ok) return { ok: false, error: g.error };
  const { supabase, adminUserId } = g;

  const { data: prev } = await supabase.from("communities").select("featured_order").eq("id", communityId).maybeSingle();

  const { error } = await supabase
    .from("communities")
    .update({ featured_order: featuredOrder })
    .eq("id", communityId);
  if (error) return { ok: false, error: error.message };

  await writeAdminAudit(supabase, {
    staffUserId: adminUserId,
    action: featuredOrder == null ? "circle.unfeature" : "circle.feature",
    entityType: "community",
    entityId: communityId,
    metadata: auditMeta({
      circle_id: communityId,
      old_value: prev?.featured_order ?? null,
      new_value: featuredOrder,
    }),
  });

  revalidatePath("/admin/circles");
  revalidatePath("/admin/audit");
  return { ok: true };
}

export async function adminArchiveCircle(
  communityId: string,
  archived: boolean,
): Promise<{ ok: boolean; error?: string }> {
  const g = await gate();
  if (!g.ok) return { ok: false, error: g.error };
  const { supabase, adminUserId } = g;

  const { data: row, error: readErr } = await supabase
    .from("communities")
    .select("metadata, featured_order")
    .eq("id", communityId)
    .maybeSingle();
  if (readErr || !row) return { ok: false, error: readErr?.message ?? "Circle not found" };

  const base =
    row.metadata && typeof row.metadata === "object" ? { ...(row.metadata as Record<string, unknown>) } : {};
  if (archived) {
    base.admin_archived = true;
    base.admin_archived_at = new Date().toISOString();
  } else {
    delete base.admin_archived;
    delete base.admin_archived_at;
  }

  const { error } = await supabase
    .from("communities")
    .update({
      metadata: base,
      featured_order: archived ? null : row.featured_order,
    })
    .eq("id", communityId);
  if (error) return { ok: false, error: error.message };

  await writeAdminAudit(supabase, {
    staffUserId: adminUserId,
    action: archived ? "circle.archive" : "circle.unarchive",
    entityType: "community",
    entityId: communityId,
    metadata: auditMeta({ circle_id: communityId, archived }),
  });

  revalidatePath("/admin/circles");
  revalidatePath("/admin/audit");
  return { ok: true };
}

export async function adminAddPostPin(communityId: string, postId: string): Promise<{ ok: boolean; error?: string }> {
  const g = await gate();
  if (!g.ok) return { ok: false, error: g.error };
  const { supabase, adminUserId } = g;

  const { data: maxRow } = await supabase
    .from("community_post_pins")
    .select("sort_order")
    .eq("community_id", communityId)
    .order("sort_order", { ascending: false })
    .limit(1)
    .maybeSingle();

  const nextOrder = (maxRow?.sort_order ?? -1) + 1;
  const { error } = await supabase.from("community_post_pins").insert({
    community_id: communityId,
    post_id: postId.trim(),
    sort_order: nextOrder,
  });
  if (error) return { ok: false, error: error.message };

  await writeAdminAudit(supabase, {
    staffUserId: adminUserId,
    action: "circle.pin_post",
    entityType: "community",
    entityId: communityId,
    metadata: auditMeta({ circle_id: communityId, post_id: postId.trim() }),
  });

  revalidatePath("/admin/circles");
  return { ok: true };
}

export async function adminRemovePostPin(communityId: string, postId: string): Promise<{ ok: boolean; error?: string }> {
  const g = await gate();
  if (!g.ok) return { ok: false, error: g.error };
  const { supabase, adminUserId } = g;

  const { error } = await supabase
    .from("community_post_pins")
    .delete()
    .eq("community_id", communityId)
    .eq("post_id", postId.trim());
  if (error) return { ok: false, error: error.message };

  await writeAdminAudit(supabase, {
    staffUserId: adminUserId,
    action: "circle.unpin_post",
    entityType: "community",
    entityId: communityId,
    metadata: auditMeta({ circle_id: communityId, post_id: postId.trim() }),
  });

  revalidatePath("/admin/circles");
  return { ok: true };
}

export async function adminAddCircleModerator(
  communityId: string,
  userId: string,
): Promise<{ ok: boolean; error?: string }> {
  const g = await gate();
  if (!g.ok) return { ok: false, error: g.error };
  const { supabase, adminUserId } = g;

  const { error } = await supabase.from("circle_moderators").insert({
    community_id: communityId,
    user_id: userId.trim(),
    role: "moderator",
    created_by: adminUserId,
  });
  if (error) return { ok: false, error: error.message };

  await writeAdminAudit(supabase, {
    staffUserId: adminUserId,
    action: "circle.moderator.add",
    entityType: "community",
    entityId: communityId,
    metadata: auditMeta({ circle_id: communityId, user_id: userId.trim() }),
  });

  revalidatePath("/admin/circles");
  return { ok: true };
}

export async function adminRemoveCircleModerator(
  communityId: string,
  userId: string,
): Promise<{ ok: boolean; error?: string }> {
  const g = await gate();
  if (!g.ok) return { ok: false, error: g.error };
  const { supabase, adminUserId } = g;

  const { error } = await supabase
    .from("circle_moderators")
    .delete()
    .eq("community_id", communityId)
    .eq("user_id", userId.trim());
  if (error) return { ok: false, error: error.message };

  await writeAdminAudit(supabase, {
    staffUserId: adminUserId,
    action: "circle.moderator.remove",
    entityType: "community",
    entityId: communityId,
    metadata: auditMeta({ circle_id: communityId, user_id: userId.trim() }),
  });

  revalidatePath("/admin/circles");
  return { ok: true };
}

export async function adminUpdateCircleIdentity(
  communityId: string,
  identity: {
    welcomeCopy?: string;
    welcomeThreadId?: string;
    rules?: string[];
  },
): Promise<{ ok: boolean; error?: string }> {
  const g = await gate();
  if (!g.ok) return { ok: false, error: g.error };
  const { supabase, adminUserId } = g;

  const { data: existing, error: readErr } = await supabase
    .from("communities")
    .select("metadata")
    .eq("id", communityId)
    .maybeSingle();
  if (readErr || !existing) return { ok: false, error: readErr?.message ?? "Circle not found" };

  const base =
    existing.metadata && typeof existing.metadata === "object"
      ? { ...(existing.metadata as Record<string, unknown>) }
      : {};

  if (identity.welcomeCopy?.trim()) base.welcome_copy = identity.welcomeCopy.trim();
  else delete base.welcome_copy;

  if (identity.rules?.length) base.rules = identity.rules;
  else delete base.rules;

  if (identity.welcomeThreadId?.trim()) base.welcome_thread_id = identity.welcomeThreadId.trim();
  else delete base.welcome_thread_id;

  const { error } = await supabase.from("communities").update({ metadata: base }).eq("id", communityId);
  if (error) return { ok: false, error: error.message };

  await writeAdminAudit(supabase, {
    staffUserId: adminUserId,
    action: "circle.identity.update",
    entityType: "community",
    entityId: communityId,
    metadata: auditMeta({ circle_id: communityId, identity }),
  });

  revalidatePath("/admin/circles");
  return { ok: true };
}
