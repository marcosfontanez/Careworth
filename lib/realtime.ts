import { supabase } from './supabase';
import type { RealtimeChannel } from '@supabase/supabase-js';

type RealtimeCallback = (payload: any) => void;

class RealtimeService {
  private channels: Map<string, RealtimeChannel> = new Map();

  subscribeToNotifications(userId: string, onNew: RealtimeCallback) {
    const key = `notifications:${userId}`;
    if (this.channels.has(key)) return;

    const channel = supabase
      .channel(key)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'notifications',
          filter: `user_id=eq.${userId}`,
        },
        (payload) => onNew(payload.new)
      )
      .subscribe();

    this.channels.set(key, channel);
  }

  subscribeToPostLikes(postId: string, onUpdate: RealtimeCallback) {
    const key = `post_likes:${postId}`;
    if (this.channels.has(key)) return;

    const channel = supabase
      .channel(key)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'post_likes',
          filter: `post_id=eq.${postId}`,
        },
        (payload) => onUpdate(payload)
      )
      .subscribe();

    this.channels.set(key, channel);
  }

  subscribeToComments(postId: string, onNew: RealtimeCallback) {
    const key = `comments:${postId}`;
    if (this.channels.has(key)) return;

    const channel = supabase
      .channel(key)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'comments',
          filter: `post_id=eq.${postId}`,
        },
        (payload) => onNew(payload.new)
      )
      .subscribe();

    this.channels.set(key, channel);
  }

  subscribeToCommunityPosts(communityId: string, onNew: RealtimeCallback) {
    const key = `community_posts:${communityId}`;
    if (this.channels.has(key)) return;

    const channel = supabase
      .channel(key)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'posts',
        },
        (payload) => {
          const communities = (payload.new as any).communities ?? [];
          if (communities.includes(communityId)) {
            onNew(payload.new);
          }
        }
      )
      .subscribe();

    this.channels.set(key, channel);
  }

  unsubscribe(key: string) {
    const channel = this.channels.get(key);
    if (channel) {
      supabase.removeChannel(channel);
      this.channels.delete(key);
    }
  }

  unsubscribeAll() {
    this.channels.forEach((channel) => supabase.removeChannel(channel));
    this.channels.clear();
  }
}

export const realtime = new RealtimeService();
