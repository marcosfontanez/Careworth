import { supabase } from '@/lib/supabase';
import type { RealtimeChannel } from '@supabase/supabase-js';

export type StreamQuestionStatus = 'queued' | 'pinned' | 'answered' | 'dismissed';

export interface StreamQuestion {
  id: string;
  streamId: string;
  userId: string;
  authorName: string;
  question: string;
  status: StreamQuestionStatus;
  createdAt: string;
  answeredAt?: string;
}

interface StreamQuestionRow {
  id: string;
  stream_id: string;
  user_id: string;
  author_name: string;
  question: string;
  status: StreamQuestionStatus;
  created_at: string;
  answered_at: string | null;
}

function rowToQuestion(row: StreamQuestionRow): StreamQuestion {
  return {
    id: row.id,
    streamId: row.stream_id,
    userId: row.user_id,
    authorName: row.author_name,
    question: row.question,
    status: row.status,
    createdAt: row.created_at,
    answeredAt: row.answered_at ?? undefined,
  };
}

function isMissingTableError(message: string): boolean {
  const m = message.toLowerCase();
  return m.includes('stream_questions') && (m.includes('does not exist') || m.includes('schema cache'));
}

export const streamQuestionsService = {
  async isBackendReady(): Promise<boolean> {
    try {
      const { error } = await supabase.from(
        'stream_questions',
      )
        .select('id')
        .limit(1);
      if (error) return !isMissingTableError(error.message);
      return true;
    } catch {
      return false;
    }
  },

  async listForStream(streamId: string, limit = 40): Promise<StreamQuestion[]> {
    if (!streamId) return [];
    try {
      const { data, error } = await supabase.from(
        'stream_questions',
      )
        .select('*')
        .eq('stream_id', streamId)
        .in('status', ['queued', 'pinned'])
        .order('created_at', { ascending: false })
        .limit(limit);

      if (error) {
        if (__DEV__ && !isMissingTableError(error.message)) {
          console.warn('[streamQuestions.listForStream]', error.message);
        }
        return [];
      }
      return (data ?? []).map((r) => rowToQuestion(r as StreamQuestionRow));
    } catch (err) {
      if (__DEV__) console.warn('[streamQuestions.listForStream]', err);
      return [];
    }
  },

  /** Host queue — includes recently answered questions for moderation. */
  async listForHost(streamId: string, limit = 50): Promise<StreamQuestion[]> {
    if (!streamId) return [];
    try {
      const { data, error } = await supabase.from(
        'stream_questions',
      )
        .select('*')
        .eq('stream_id', streamId)
        .in('status', ['queued', 'pinned', 'answered'])
        .order('created_at', { ascending: false })
        .limit(limit);

      if (error) {
        if (__DEV__ && !isMissingTableError(error.message)) {
          console.warn('[streamQuestions.listForHost]', error.message);
        }
        return [];
      }
      return (data ?? []).map((r) => rowToQuestion(r as StreamQuestionRow));
    } catch (err) {
      if (__DEV__) console.warn('[streamQuestions.listForHost]', err);
      return [];
    }
  },

  async submit(input: {
    streamId: string;
    userId: string;
    authorName: string;
    question: string;
  }): Promise<StreamQuestion | null> {
    const { streamId, userId, authorName, question } = input;
    const body = question.trim().slice(0, 500);
    if (!streamId || !userId || !body) return null;
    try {
      const { data, error } = await supabase.from(
        'stream_questions',
      )
        .insert({
          stream_id: streamId,
          user_id: userId,
          author_name: authorName.trim() || 'Viewer',
          question: body,
          status: 'queued',
        })
        .select('*')
        .single();

      if (error) {
        if (__DEV__) console.warn('[streamQuestions.submit]', error.message);
        return null;
      }
      return rowToQuestion(data as StreamQuestionRow);
    } catch (err) {
      if (__DEV__) console.warn('[streamQuestions.submit]', err);
      return null;
    }
  },

  async pinQuestion(streamId: string, questionId: string): Promise<boolean> {
    if (!streamId || !questionId) return false;
    try {
      await supabase.from('stream_questions')
        .update({ status: 'queued' })
        .eq('stream_id', streamId)
        .eq('status', 'pinned');

      const { error } = await supabase.from(
        'stream_questions',
      )
        .update({ status: 'pinned' })
        .eq('id', questionId)
        .eq('stream_id', streamId);

      if (error) {
        if (__DEV__) console.warn('[streamQuestions.pinQuestion]', error.message);
        return false;
      }
      return true;
    } catch (err) {
      if (__DEV__) console.warn('[streamQuestions.pinQuestion]', err);
      return false;
    }
  },

  async unpinQuestion(streamId: string, questionId: string): Promise<boolean> {
    if (!streamId || !questionId) return false;
    try {
      const { error } = await supabase.from(
        'stream_questions',
      )
        .update({ status: 'queued' })
        .eq('id', questionId)
        .eq('stream_id', streamId)
        .eq('status', 'pinned');

      if (error) {
        if (__DEV__) console.warn('[streamQuestions.unpinQuestion]', error.message);
        return false;
      }
      return true;
    } catch (err) {
      if (__DEV__) console.warn('[streamQuestions.unpinQuestion]', err);
      return false;
    }
  },

  async markAnswered(questionId: string): Promise<boolean> {
    if (!questionId) return false;
    try {
      const { error } = await supabase.from(
        'stream_questions',
      )
        .update({ status: 'answered', answered_at: new Date().toISOString() })
        .eq('id', questionId);

      if (error) {
        if (__DEV__) console.warn('[streamQuestions.markAnswered]', error.message);
        return false;
      }
      return true;
    } catch (err) {
      if (__DEV__) console.warn('[streamQuestions.markAnswered]', err);
      return false;
    }
  },

  async dismiss(questionId: string): Promise<boolean> {
    if (!questionId) return false;
    try {
      const { error } = await supabase.from(
        'stream_questions',
      )
        .update({ status: 'dismissed' })
        .eq('id', questionId);
      if (error) {
        if (__DEV__) console.warn('[streamQuestions.dismiss]', error.message);
        return false;
      }
      return true;
    } catch (err) {
      if (__DEV__) console.warn('[streamQuestions.dismiss]', err);
      return false;
    }
  },

  subscribe(streamId: string, onChange: () => void): () => void {
    if (!streamId) return () => {};

    const channel: RealtimeChannel = supabase
      .channel(`stream_questions:${streamId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'stream_questions',
          filter: `stream_id=eq.${streamId}`,
        },
        () => onChange(),
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  },
};
