import { supabase } from '@/lib/supabase';
import type { RealtimeChannel } from '@supabase/supabase-js';
import type { StreamPoll, StreamPollOption } from '@/types';

interface StreamPollRow {
  id: string;
  stream_id: string;
  question: string;
  options: Array<{ id: string; text: string; votes: number }>;
  total_votes: number;
  ends_at: string;
  is_active: boolean;
  created_at: string;
}

function optionsWithPercentage(
  options: StreamPollRow['options'],
  totalVotes: number,
): StreamPollOption[] {
  const safeTotal = Math.max(1, totalVotes);
  return (options ?? []).map((o) => {
    const votes = Number(o.votes ?? 0);
    return {
      id: o.id,
      text: o.text,
      votes,
      percentage: Math.round((votes / safeTotal) * 100),
    };
  });
}

function rowToPoll(row: StreamPollRow): StreamPoll {
  return {
    id: row.id,
    streamId: row.stream_id,
    question: row.question,
    options: optionsWithPercentage(row.options, row.total_votes),
    totalVotes: row.total_votes ?? 0,
    endsAt: row.ends_at,
    isActive: row.is_active,
    createdBy: '', // `created_by` isn't persisted in the current schema
  };
}

export const streamPollsService = {
  /**
   * Return the currently-active poll for a stream (if any). We return a single
   * poll because the viewer room only renders one widget at a time.
   */
  async getActive(streamId: string): Promise<StreamPoll | null> {
    if (!streamId) return null;
    const { data, error } = await supabase
      .from('stream_polls')
      .select('*')
      .eq('stream_id', streamId)
      .eq('is_active', true)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (error) {
      if (__DEV__) console.warn('[streamPolls.getActive]', error.message);
      return null;
    }
    if (!data) return null;
    return rowToPoll(data as StreamPollRow);
  },

  /** Check whether this user has already voted on a given poll. */
  async hasVoted(
    pollId: string,
    userId: string,
  ): Promise<{ voted: boolean; optionId?: string }> {
    if (!pollId || !userId) return { voted: false };
    const { data, error } = await supabase
      .from('stream_poll_votes')
      .select('option_id')
      .eq('poll_id', pollId)
      .eq('user_id', userId)
      .maybeSingle();

    if (error) return { voted: false };
    if (!data) return { voted: false };
    return { voted: true, optionId: data.option_id };
  },

  /**
   * Cast a vote. Inserts a row in `stream_poll_votes` (unique per user/poll)
   * then calls the `increment_poll_vote` RPC to atomically bump the option's
   * count and the poll's total. Returns `false` if the user already voted.
   */
  async vote(pollId: string, optionId: string, userId: string): Promise<boolean> {
    if (!pollId || !optionId || !userId) return false;

    const { error: voteErr } = await supabase
      .from('stream_poll_votes')
      .insert({ poll_id: pollId, option_id: optionId, user_id: userId });

    if (voteErr) {
      if (voteErr.code === '23505') return false;
      if (__DEV__) console.warn('[streamPolls.vote/insert]', voteErr.message);
      return false;
    }

    const { error: rpcErr } = await supabase.rpc('increment_poll_vote', {
      p_poll_id: pollId,
      p_option_id: optionId,
    });
    if (rpcErr && __DEV__) console.warn('[streamPolls.vote/rpc]', rpcErr.message);

    return true;
  },

  /**
   * Host-only: create a new active poll. Ends any currently-active poll on
   * the same stream first so only one poll is live at a time. Returns the
   * freshly-inserted poll so the host UI can snap to it immediately.
   */
  async create(input: {
    streamId: string;
    question: string;
    options: Array<{ id: string; text: string }>;
    durationSec?: number;
  }): Promise<StreamPoll | null> {
    const { streamId, question, options } = input;
    if (!streamId || !question.trim() || options.length < 2) return null;

    // End any lingering active poll on this stream first.
    await supabase
      .from('stream_polls')
      .update({ is_active: false })
      .eq('stream_id', streamId)
      .eq('is_active', true);

    const endsAt = new Date(
      Date.now() + (input.durationSec ?? 60) * 1000,
    ).toISOString();

    const payload = {
      stream_id: streamId,
      question: question.trim().slice(0, 140),
      options: options.map((o) => ({
        id: o.id,
        text: o.text.trim().slice(0, 80),
        votes: 0,
      })),
      total_votes: 0,
      ends_at: endsAt,
      is_active: true,
    };

    const { data, error } = await supabase
      .from('stream_polls')
      .insert(payload)
      .select('*')
      .single();

    if (error) {
      if (__DEV__) console.warn('[streamPolls.create]', error.message);
      return null;
    }
    return rowToPoll(data as StreamPollRow);
  },

  /** Host-only: flip `is_active = false` so viewers stop seeing the widget. */
  async end(pollId: string): Promise<boolean> {
    if (!pollId) return false;
    const { error } = await supabase
      .from('stream_polls')
      .update({ is_active: false })
      .eq('id', pollId);
    if (error) {
      if (__DEV__) console.warn('[streamPolls.end]', error.message);
      return false;
    }
    return true;
  },

  /**
   * Subscribe to poll lifecycle events on a given stream:
   *   - a new poll INSERT (host started one)
   *   - an UPDATE to the active poll (vote tally bumped, or host ended it)
   * The viewer room listens and replaces its local poll state accordingly.
   */
  subscribe(
    streamId: string,
    onPoll: (poll: StreamPoll | null) => void,
  ): () => void {
    if (!streamId) return () => {};

    const channel: RealtimeChannel = supabase
      .channel(`stream_polls:${streamId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'stream_polls',
          filter: `stream_id=eq.${streamId}`,
        },
        (payload) => {
          const row = (payload.new ?? payload.old) as StreamPollRow | undefined;
          if (!row) return;
          if (!row.is_active) {
            onPoll(null);
            return;
          }
          onPoll(rowToPoll(row));
        },
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  },
};
