import { useCallback, useEffect, useRef, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { messagesService, type Conversation } from '@/services/supabase/messages';

const INBOX_REALTIME_DEBOUNCE_MS = 350;

export function useMessengerInbox(userId: string | undefined) {
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [loading, setLoading] = useState(!!userId);
  const [refreshing, setRefreshing] = useState(false);
  const [presenceOnline, setPresenceOnline] = useState<Set<string>>(new Set());
  const realtimeReloadTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const loadConversations = useCallback(async () => {
    if (!userId) return;
    try {
      const data = await messagesService.getConversations(userId);
      setConversations(data);
    } catch (e) {
      console.warn('[useMessengerInbox] loadConversations', e);
    }
  }, [userId]);

  const scheduleConversationsReload = useCallback(() => {
    if (realtimeReloadTimerRef.current) {
      clearTimeout(realtimeReloadTimerRef.current);
    }
    realtimeReloadTimerRef.current = setTimeout(() => {
      realtimeReloadTimerRef.current = null;
      void loadConversations();
    }, INBOX_REALTIME_DEBOUNCE_MS);
  }, [loadConversations]);

  useEffect(() => {
    if (!userId) {
      setLoading(false);
      setConversations([]);
      return;
    }

    let cancelled = false;
    setLoading(true);
    loadConversations().finally(() => {
      if (!cancelled) setLoading(false);
    });

    const changesChannel = supabase
      .channel(`messages-inbox:${userId}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'messages' },
        () => {
          scheduleConversationsReload();
        },
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'conversations' },
        () => {
          scheduleConversationsReload();
        },
      )
      .subscribe();

    const presenceChannel = supabase
      .channel('online-users')
      .on('presence', { event: 'sync' }, () => {
        const state = presenceChannel.presenceState();
        const onlineIds = new Set(
          Object.values(state).flat().map((p: any) => p.user_id as string),
        );
        setPresenceOnline(onlineIds);
      })
      .subscribe(async (status) => {
        if (status === 'SUBSCRIBED') {
          await presenceChannel.track({ user_id: userId, online_at: new Date().toISOString() });
        }
      });

    return () => {
      cancelled = true;
      if (realtimeReloadTimerRef.current) {
        clearTimeout(realtimeReloadTimerRef.current);
        realtimeReloadTimerRef.current = null;
      }
      supabase.removeChannel(changesChannel);
      supabase.removeChannel(presenceChannel);
    };
  }, [userId, loadConversations, scheduleConversationsReload]);

  const refresh = useCallback(async () => {
    setRefreshing(true);
    await loadConversations();
    setRefreshing(false);
  }, [loadConversations]);

  const removeConversationLocal = useCallback((conversationId: string) => {
    setConversations((prev) => prev.filter((c) => c.id !== conversationId));
  }, []);

  return {
    conversations,
    loading,
    refreshing,
    refresh,
    loadConversations,
    presenceOnline,
    removeConversationLocal,
  };
}
