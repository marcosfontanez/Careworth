import { supabase } from '@/lib/supabase';

export type CoverAbEventType =
  | 'impression'
  | 'view_2s'
  | 'play'
  | 'like'
  | 'comment'
  | 'share'
  | 'save';

export async function logPostCoverAbEvent(input: {
  postId: string;
  viewerId: string;
  variant: 'a' | 'b';
  eventType: CoverAbEventType;
  sessionId?: string | null;
}): Promise<void> {
  const { error } = await supabase.from('post_cover_ab_events').insert({
    post_id: input.postId,
    viewer_id: input.viewerId,
    variant: input.variant,
    event_type: input.eventType,
    session_id: input.sessionId ?? null,
  });
  if (error) {
    // Non-fatal: analytics must not break feed
    if (__DEV__) console.warn('[post_cover_ab_events]', error.message);
  }
}
