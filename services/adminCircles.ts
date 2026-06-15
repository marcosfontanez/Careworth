import { supabase } from '@/lib/supabase';
import { writeMobileAdminAudit } from '@/lib/adminAuditMobile';
import type { CommunityPostPinRow } from '@/lib/communityPostPins';
import type { CircleIdentityMetadata } from '@/lib/circleIdentity';
import { parseCircleMetadata } from '@/lib/circleIdentity';

/** Typed client omits `Relationships` on most tables; admin mutations use a narrow escape hatch. */
const sb = supabase as any;

async function auditCircle(action: string, communityId: string, metadata?: Record<string, unknown>) {
  await writeMobileAdminAudit({
    action,
    entityType: 'community',
    entityId: communityId,
    metadata: { circle_id: communityId, ...(metadata ?? {}) },
  });
}

export type CommunityPostPin = CommunityPostPinRow & { id: string };

export function normalizeCommunitySlug(raw: string): string {
  const s = raw
    .trim()
    .toLowerCase()
    .replace(/\s+/g, '-')
    .replace(/[^a-z0-9-]/g, '')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '');
  return s;
}

export const adminCirclesService = {
  async setFeaturedOrder(communityId: string, featuredOrder: number | null): Promise<void> {
    const { error } = await sb
      .from('communities')
      .update({ featured_order: featuredOrder })
      .eq('id', communityId);
    if (error) throw error;
    await auditCircle(featuredOrder == null ? 'circle.unfeature' : 'circle.feature_order', communityId, {
      featured_order: featuredOrder,
    });
  },
  async createCommunity(input: {
    slug: string;
    name: string;
    description?: string;
    icon?: string;
    accentColor?: string;
    bannerUrl?: string | null;
  }): Promise<{ id: string; slug: string }> {
    const slug = normalizeCommunitySlug(input.slug);
    if (!slug) throw new Error('Invalid slug');

    const { data, error } = await sb
      .from('communities')
      .insert({
        slug,
        name: input.name.trim(),
        description: (input.description ?? '').trim(),
        icon: input.icon?.trim() || '🏥',
        accent_color: input.accentColor?.trim() || '#1E4ED8',
        banner_url: input.bannerUrl?.trim() || null,
      })
      .select('id, slug')
      .single();

    if (error) throw error;
    await auditCircle('circle.create', data.id, { slug: data.slug, name: input.name.trim() });
    return { id: data.id, slug: data.slug };
  },

  async listPins(communityId: string): Promise<CommunityPostPin[]> {
    const { data, error } = await sb
      .from('community_post_pins')
      .select('id, post_id, sort_order')
      .eq('community_id', communityId)
      .order('sort_order', { ascending: true });

    if (error) throw error;
    return (data ?? []) as CommunityPostPin[];
  },

  async listRecentPostIds(communityId: string, limit = 60): Promise<{ id: string; caption: string | null }[]> {
    const { data, error } = await sb
      .from('posts')
      .select('id, caption')
      .contains('communities', [communityId])
      .order('created_at', { ascending: false })
      .limit(limit);

    if (error) throw error;
    return (data ?? []) as { id: string; caption: string | null }[];
  },

  async addPin(communityId: string, postId: string): Promise<void> {
    const { data: maxRow, error: maxErr } = await sb
      .from('community_post_pins')
      .select('sort_order')
      .eq('community_id', communityId)
      .order('sort_order', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (maxErr) throw maxErr;
    const nextOrder = (maxRow?.sort_order ?? -1) + 1;

    const { error } = await sb.from('community_post_pins').insert({
      community_id: communityId,
      post_id: postId,
      sort_order: nextOrder,
    });

    if (error) throw error;
    await auditCircle('circle.pin_post', communityId, { post_id: postId });
  },

  async removePin(communityId: string, postId: string): Promise<void> {
    const { error } = await sb
      .from('community_post_pins')
      .delete()
      .eq('community_id', communityId)
      .eq('post_id', postId);

    if (error) throw error;
    await auditCircle('circle.unpin_post', communityId, { post_id: postId });
  },

  async movePin(communityId: string, postId: string, direction: 'up' | 'down'): Promise<void> {
    const pins = await this.listPins(communityId);
    const idx = pins.findIndex((p) => p.post_id === postId);
    if (idx < 0) return;
    const swapIdx = direction === 'up' ? idx - 1 : idx + 1;
    if (swapIdx < 0 || swapIdx >= pins.length) return;

    const a = pins[idx];
    const b = pins[swapIdx];
    const { error: e1 } = await sb
      .from('community_post_pins')
      .update({ sort_order: b.sort_order })
      .eq('id', a.id);
    if (e1) throw e1;
    const { error: e2 } = await sb
      .from('community_post_pins')
      .update({ sort_order: a.sort_order })
      .eq('id', b.id);
    if (e2) throw e2;
    await auditCircle('circle.pin_reorder', communityId, { post_id: postId, direction });
  },

  async getCommunityIdentity(communityId: string): Promise<CircleIdentityMetadata> {
    const { data, error } = await sb
      .from('communities')
      .select('metadata')
      .eq('id', communityId)
      .maybeSingle();
    if (error) throw error;
    return parseCircleMetadata(data?.metadata);
  },

  async updateCommunityIdentity(communityId: string, identity: CircleIdentityMetadata): Promise<void> {
    const { data: existing, error: readErr } = await sb
      .from('communities')
      .select('metadata')
      .eq('id', communityId)
      .maybeSingle();
    if (readErr) throw readErr;

    const base =
      existing?.metadata && typeof existing.metadata === 'object'
        ? { ...(existing.metadata as Record<string, unknown>) }
        : {};

    if (identity.welcomeCopy?.trim()) base.welcome_copy = identity.welcomeCopy.trim();
    else delete base.welcome_copy;

    if (identity.rules?.length) base.rules = identity.rules;
    else delete base.rules;

    if (identity.weeklyPrompt?.title && identity.weeklyPrompt.body) {
      base.weekly_prompt = {
        title: identity.weeklyPrompt.title,
        body: identity.weeklyPrompt.body,
        cta: identity.weeklyPrompt.cta || 'Start a thread',
      };
    } else {
      delete base.weekly_prompt;
    }

    if (identity.welcomeThreadId?.trim()) base.welcome_thread_id = identity.welcomeThreadId.trim();
    else delete base.welcome_thread_id;

    const { error } = await sb.from('communities').update({ metadata: base }).eq('id', communityId);
    if (error) throw error;
    await auditCircle('circle.identity.update', communityId, { identity });
  },

  async setWelcomeThreadPin(communityId: string, threadId: string): Promise<void> {
    const cid = communityId.trim();
    const tid = threadId.trim();
    if (!cid || !tid) throw new Error('Missing community or thread id');

    await sb.from('community_thread_pins').delete().eq('community_id', cid).eq('pin_role', 'welcome');

    const { error } = await sb.from('community_thread_pins').insert({
      community_id: cid,
      thread_id: tid,
      pin_role: 'welcome',
      sort_order: 0,
    });
    if (error) throw error;
    await auditCircle('circle.welcome_thread.pin', communityId, { thread_id: tid });
  },

  async clearWelcomeThreadPin(communityId: string): Promise<void> {
    const { error } = await sb
      .from('community_thread_pins')
      .delete()
      .eq('community_id', communityId)
      .eq('pin_role', 'welcome');
    if (error) throw error;
    await auditCircle('circle.welcome_thread.unpin', communityId);
  },
};
