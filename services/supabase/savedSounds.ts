import { supabase } from '@/lib/supabase';

export const savedSoundsService = {
  async isSaved(userId: string, sourcePostId: string): Promise<boolean> {
    const { data, error } = await supabase
      .from('saved_sounds')
      .select('id')
      .eq('user_id', userId)
      .eq('source_post_id', sourcePostId)
      .maybeSingle();
    if (error) {
      if (__DEV__) console.warn('[savedSounds.isSaved]', error.message, error);
      return false;
    }
    return !!data;
  },

  /** Returns true if now saved, false if removed */
  async toggle(userId: string, sourcePostId: string): Promise<boolean> {
    const { data: existing } = await supabase
      .from('saved_sounds')
      .select('id')
      .eq('user_id', userId)
      .eq('source_post_id', sourcePostId)
      .maybeSingle();

    if (existing) {
      const { error } = await supabase.from('saved_sounds').delete().eq('id', existing.id);
      if (error) throw new Error(error.message);
      return false;
    }

    const { error } = await supabase.from('saved_sounds').insert({
      user_id: userId,
      source_post_id: sourcePostId,
    });
    if (error) throw new Error(error.message);
    return true;
  },
};
