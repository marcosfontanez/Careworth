import { supabase } from '@/lib/supabase';

export type SoundCatalogAdminRow = {
  id: string;
  post_id: string;
  artist: string | null;
  keywords: string | null;
  sort_boost: number;
  is_active: boolean;
  created_at: string;
};

export const soundCatalogService = {
  async listForAdmin(): Promise<SoundCatalogAdminRow[]> {
    const { data, error } = await supabase
      .from('sound_catalog')
      .select('id, post_id, artist, keywords, sort_boost, is_active, created_at')
      .order('sort_boost', { ascending: false });

    if (error) throw error;
    return (data ?? []) as SoundCatalogAdminRow[];
  },

  async upsert(params: {
    postId: string;
    artist?: string;
    keywords?: string;
    sortBoost?: number;
    isActive?: boolean;
  }): Promise<string> {
    const { data, error } = await supabase.rpc('admin_upsert_sound_catalog', {
      p_post_id: params.postId.trim(),
      p_artist: params.artist?.trim() || null,
      p_keywords: params.keywords?.trim() || null,
      p_sort_boost: params.sortBoost ?? 1000,
      p_is_active: params.isActive ?? true,
    });

    if (error) throw error;
    return String(data ?? '');
  },

  async deleteByPostId(postId: string): Promise<void> {
    const { error } = await supabase.rpc('admin_delete_sound_catalog', {
      p_post_id: postId.trim(),
    });
    if (error) throw error;
  },
};
