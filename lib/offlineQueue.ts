import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform } from 'react-native';
import { COMMENT_MAX_LENGTH } from '@/constants';

let NetInfo: any = null;
try {
  NetInfo = require('@react-native-community/netinfo')?.default;
} catch {}

const QUEUE_KEY = '@pulseverse_offline_queue';

export interface QueuedAction {
  id: string;
  type:
    | 'like_post'
    | 'unlike_post'
    | 'save_post'
    | 'unsave_post'
    | 'follow_user'
    | 'unfollow_user'
    | 'join_community'
    | 'create_comment'
    | 'share_post';
  payload: Record<string, any>;
  createdAt: string;
  retries: number;
}

async function getQueue(): Promise<QueuedAction[]> {
  try {
    const raw = await AsyncStorage.getItem(QUEUE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

async function setQueue(queue: QueuedAction[]): Promise<void> {
  await AsyncStorage.setItem(QUEUE_KEY, JSON.stringify(queue));
}

export async function enqueueAction(action: Omit<QueuedAction, 'id' | 'createdAt' | 'retries'>): Promise<void> {
  const queue = await getQueue();
  queue.push({
    ...action,
    id: `${Date.now()}_${Math.random().toString(36).slice(2)}`,
    createdAt: new Date().toISOString(),
    retries: 0,
  });
  await setQueue(queue);
}

export async function processQueue(
  executor: (action: QueuedAction) => Promise<boolean>
): Promise<{ processed: number; failed: number }> {
  if (NetInfo) {
    const state = await NetInfo.fetch();
    if (!state.isConnected) return { processed: 0, failed: 0 };
  } else if (Platform.OS === 'web' && !navigator.onLine) {
    return { processed: 0, failed: 0 };
  }

  const queue = await getQueue();
  if (queue.length === 0) return { processed: 0, failed: 0 };

  let processed = 0;
  let failed = 0;
  const remaining: QueuedAction[] = [];

  for (const action of queue) {
    try {
      const success = await executor(action);
      if (success) {
        processed++;
      } else {
        action.retries++;
        if (action.retries < 5) remaining.push(action);
        else failed++;
      }
    } catch {
      action.retries++;
      if (action.retries < 5) remaining.push(action);
      else failed++;
    }
  }

  await setQueue(remaining);
  return { processed, failed };
}

export async function getQueueSize(): Promise<number> {
  const queue = await getQueue();
  return queue.length;
}

export async function clearQueue(): Promise<void> {
  await AsyncStorage.removeItem(QUEUE_KEY);
}

/**
 * Idempotent executor used by `processQueue` to flush offline actions back to
 * Supabase. Every branch is safe to retry:
 *   - "set" actions use upsert with `ignoreDuplicates`, so a second flush is a
 *     no-op rather than a constraint error.
 *   - "unset" actions use delete with the unique-key columns, so deleting an
 *     already-deleted row is also a no-op.
 *   - create_comment has no natural idempotency key, but since the user only
 *     ever lands here from a single failed network call we accept the small
 *     risk of a duplicate vs. losing the comment.
 */
export function createOfflineExecutor() {
  const { supabase } = require('@/lib/supabase');

  return async (action: QueuedAction): Promise<boolean> => {
    switch (action.type) {
      case 'like_post': {
        const { error } = await supabase
          .from('post_likes')
          .upsert(
            { post_id: action.payload.postId, user_id: action.payload.userId },
            { onConflict: 'user_id,post_id', ignoreDuplicates: true },
          );
        return !error;
      }
      case 'unlike_post': {
        const { error } = await supabase
          .from('post_likes')
          .delete()
          .eq('post_id', action.payload.postId)
          .eq('user_id', action.payload.userId);
        return !error;
      }
      case 'save_post': {
        const { error } = await supabase
          .from('saved_posts')
          .upsert(
            { post_id: action.payload.postId, user_id: action.payload.userId },
            { onConflict: 'user_id,post_id', ignoreDuplicates: true },
          );
        return !error;
      }
      case 'unsave_post': {
        const { error } = await supabase
          .from('saved_posts')
          .delete()
          .eq('post_id', action.payload.postId)
          .eq('user_id', action.payload.userId);
        return !error;
      }
      case 'follow_user': {
        const { error } = await supabase
          .from('follows')
          .upsert(
            { follower_id: action.payload.followerId, following_id: action.payload.followingId },
            { onConflict: 'follower_id,following_id', ignoreDuplicates: true },
          );
        return !error;
      }
      case 'unfollow_user': {
        const { error } = await supabase
          .from('follows')
          .delete()
          .eq('follower_id', action.payload.followerId)
          .eq('following_id', action.payload.followingId);
        return !error;
      }
      case 'join_community': {
        const { error } = await supabase
          .from('community_members')
          .upsert(
            { community_id: action.payload.communityId, user_id: action.payload.userId },
            { onConflict: 'user_id,community_id', ignoreDuplicates: true },
          );
        return !error;
      }
      case 'create_comment': {
        /**
         * Re-cap on replay. Any comment queued before the 300-char cap
         * shipped (or by a stale client that bypassed the input
         * `maxLength`) would otherwise be rejected by the DB CHECK
         * constraint `comments_content_length_300` and retried forever.
         * Trimming here lets older payloads still land successfully.
         */
        const safeContent = String(action.payload.content ?? '').slice(
          0,
          COMMENT_MAX_LENGTH,
        );
        const { error } = await supabase
          .from('comments')
          .insert({
            post_id: action.payload.postId,
            author_id: action.payload.userId,
            content: safeContent,
            parent_id: action.payload.parentId ?? null,
          });
        return !error;
      }
      case 'share_post': {
        /**
         * No natural idempotency key for shares (a user can legitimately
         * share the same post multiple times), so we accept the small risk
         * that a duplicate flush double-counts vs. losing the share entirely.
         */
        const { error } = await supabase.from('post_shares').insert({
          user_id: action.payload.userId,
          post_id: action.payload.postId,
          channel: action.payload.channel ?? null,
        });
        return !error;
      }
      default:
        return false;
    }
  };
}
