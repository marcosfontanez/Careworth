import { supabase } from '@/lib/supabase';

export const soundVotesService = {
  async upsertVote(voterId: string, sourcePostId: string, vote: -1 | 0 | 1): Promise<void> {
    await supabase.from('sound_context_votes').delete().match({ voter_id: voterId, source_post_id: sourcePostId } as never);
    if (vote === 0) return;
    const { error } = await supabase.from('sound_context_votes').insert({
      voter_id: voterId,
      source_post_id: sourcePostId,
      vote,
    } as never);
    if (error) throw error;
  },

  async getNetScore(sourcePostId: string): Promise<number> {
    const { data, error } = await supabase.from('sound_context_votes').select('vote').eq('source_post_id', sourcePostId);
    if (error || !data?.length) return 0;
    return (data as { vote: number }[]).reduce((s, r) => s + r.vote, 0);
  },
};
