/**
 * Scheduled posts — client-side helpers + a dispatcher hook for a
 * `scheduled_status='scheduled'` and `scheduled_at` in the future. Cron should
 * invoke `supabase/functions/dispatch-scheduled` so due rows flip to `live`.
 */

import { supabase } from '@/lib/supabase';

export type ScheduledStatus = 'live' | 'scheduled' | 'sending' | 'failed';

export interface ScheduledPostRow {
  id: string;
  scheduled_at: string | null;
  scheduled_status: ScheduledStatus;
  caption: string;
  thumbnail_url: string | null;
  type: string;
}

export function isFutureMinutesAway(at: Date, minimumMinutes = 5): boolean {
  return at.getTime() - Date.now() >= minimumMinutes * 60_000;
}

export function formatScheduleLabel(at: Date): string {
  const d = at;
  const today = new Date();
  const sameDay = d.toDateString() === today.toDateString();
  const tomorrow = new Date(today);
  tomorrow.setDate(today.getDate() + 1);
  const isTomorrow = d.toDateString() === tomorrow.toDateString();
  const time = d.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });
  if (sameDay) return `Today at ${time}`;
  if (isTomorrow) return `Tomorrow at ${time}`;
  return d.toLocaleString([], { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' });
}

export async function listScheduledPosts(userId: string): Promise<ScheduledPostRow[]> {
  try {
    const { data, error } = await supabase
      .from('posts')
      .select('id, scheduled_at, scheduled_status, caption, thumbnail_url, type')
      .eq('creator_id', userId)
      .eq('scheduled_status', 'scheduled')
      .order('scheduled_at', { ascending: true })
      .limit(40);
    if (error || !data) return [];
    return (data as ScheduledPostRow[]).filter((r) => r.scheduled_at);
  } catch {
    return [];
  }
}

/** Cancel a queued post — marks `failed` and clears time so it is not auto-published or shown in feeds. */
export async function cancelScheduledPost(postId: string): Promise<boolean> {
  try {
    const { error } = await supabase
      .from('posts')
      .update({ scheduled_at: null, scheduled_status: 'failed' })
      .eq('id', postId);
    return !error;
  } catch {
    return false;
  }
}
