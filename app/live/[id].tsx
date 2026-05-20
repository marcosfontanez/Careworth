import React, { useState, useEffect, useCallback, useMemo, useRef, Suspense, lazy } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  KeyboardAvoidingView,
  Platform,
  Dimensions,
  Alert,
  Share,
} from 'react-native';
import { Image } from 'expo-image';
import { useLocalSearchParams, useRouter, Redirect } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import * as Haptics from 'expo-haptics';
import * as Crypto from 'expo-crypto';
import { useQueryClient } from '@tanstack/react-query';
import { useFocusEffect } from '@react-navigation/native';
import { useStream } from '@/hooks/useQueries';
import { useAuth } from '@/contexts/AuthContext';
import { useAppStore } from '@/store/useAppStore';
import { LoadingState } from '@/components/ui/LoadingState';
import { pulseImageFeedHeroProps, pulseImageListThumbProps } from '@/lib/pulseImage';
import { LiveChatList } from '@/components/live/LiveChat';
import { GiftPicker } from '@/components/live/GiftPicker';
import { GiftLeaderboard } from '@/components/live/GiftLeaderboard';
import { PollWidget } from '@/components/live/PollWidget';
import { HostPollCreator } from '@/components/live/HostPollCreator';
import { SendCreatorGiftTray } from '@/components/shop/SendCreatorGiftTray';
import { RoleBadge } from '@/components/ui/RoleBadge';
import { SpecialtyBadge } from '@/components/ui/SpecialtyBadge';
import { PulseTierBadge } from '@/components/badges/PulseTierBadge';
import {
  streamMessagesService,
  streamGiftsService,
  streamPollsService,
  streamPinsService,
  streamsLiveService,
  profilesService,
} from '@/services/supabase';
import { useToast } from '@/components/ui/Toast';
import { isSeedStream } from '@/lib/liveSeedStreams';
import { isDemoLiveStreamId } from '@/lib/liveDemoStreams';
import { DemoLiveViewer } from '@/components/live/demo';
import { isFeatureEnabled } from '@/lib/featureFlags';
import { STREAM_CHAT_MAX_LENGTH } from '@/constants';
import { colors, borderRadius, typography } from '@/theme';
import { AccentComposerFrame, AccentCharCount } from '@/components/ui/AccentComposerFrame';
import { formatCount } from '@/utils/format';
import { useSparkWallet, useSparkBalanceNumber } from '@/hooks/useShopEconomy';
import { shopKeys } from '@/lib/shop/queryKeys';
import { liveHighlightsHref } from '@/lib/navigation/liveRoutes';
import type {
  StreamMessage,
  StreamPinnedMessage,
  StreamPoll,
  LiveGift,
  StreamGiftLeaderboard,
} from '@/types';
import { videoProvider } from '@/services/live/videoProvider';
import { isExpoGo } from '@/lib/expoRuntime';

/** Loaded only when real LiveKit video is shown — keeps Expo Go from requiring WebRTC native code at bundle parse time. */
const LiveKitStageLazy = lazy(() =>
  import('@/components/live/LiveKitStage').then((m) => ({ default: m.LiveKitStage })),
);
import { analytics } from '@/lib/analytics';
import { ReportModal } from '@/components/ui/ReportModal';
import { messagesService } from '@/services/supabase/messages';

const { height: SCREEN_H } = Dimensions.get('window');
const CHAT_MAX_H = SCREEN_H * 0.38;
const CHAT_LIST_H = CHAT_MAX_H - 54;

const DEFAULT_CHAT: StreamMessage[] = [
  {
    id: 'm0',
    streamId: '',
    userId: 'sys',
    displayName: 'PulseVerse',
    content: 'Welcome to the stream! Be kind and follow community guidelines.',
    role: undefined,
    isHost: false,
    isModerator: false,
    createdAt: new Date().toISOString(),
    messageType: 'system',
  },
];

/* -------------------------------------------------------------------------- */

export default function StreamViewerScreen() {
  if (!isFeatureEnabled('liveStreaming')) {
    return <Redirect href="/(tabs)/feed" />;
  }
  return <StreamViewerEntry />;
}

function StreamViewerEntry() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const streamId = id ?? '';
  if (streamId && isSeedStream({ id: streamId })) {
    return <Redirect href="/(tabs)/live" />;
  }
  if (streamId && isDemoLiveStreamId(streamId)) {
    return <DemoLiveViewer streamId={streamId} />;
  }
  return <StreamViewerScreenContent />;
}

function StreamViewerScreenContent() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const streamId = id ?? '';
  const router = useRouter();
  const queryClient = useQueryClient();
  const insets = useSafeAreaInsets();
  const { user, profile } = useAuth();
  const { data: stream, isLoading } = useStream(streamId);
  const showToast = useToast((s) => s.show);

  const walletQ = useSparkWallet(user?.id);
  const sparkBalance = useSparkBalanceNumber(walletQ.data);

  const streamIsLive = stream?.status === 'live';
  const broadcastLive =
    !!stream && stream.status === 'live' && Boolean(stream.broadcastStartedAt);
  const preparingBroadcast =
    !!stream && stream.status === 'live' && !stream.broadcastStartedAt;

  /** True when the signed-in user is the stream host — unlocks host controls. */
  const isHost = useMemo(
    () => !!user?.id && !!stream && stream.host.id === user.id,
    [user?.id, stream],
  );

  const liveKitEnabled = videoProvider.id === 'livekit';

  /** Host modal visibility + end-stream busy flag. */
  const [hostPollVisible, setHostPollVisible] = useState(false);
  const [endingStream, setEndingStream] = useState(false);
  const [lkToken, setLkToken] = useState<string | null>(null);
  const [lkServerUrl, setLkServerUrl] = useState<string | null>(null);
  const [lkError, setLkError] = useState<string | null>(null);
  const [reportOpen, setReportOpen] = useState(false);
  const [promoting, setPromoting] = useState(false);
  const [demoContinuing, setDemoContinuing] = useState(false);
  const [reminderOn, setReminderOn] = useState(false);

  /* ---------------- Followed set (hydrated from store) ------------------- */
  const followedCreatorIds = useAppStore((s) => s.followedCreatorIds);
  const setCreatorFollowed = useAppStore((s) => s.setCreatorFollowed);
  const isFollowing = stream ? followedCreatorIds.has(stream.host.id) : false;

  /* ---------------- Messages (real or simulated) ------------------------- */
  const [messages, setMessages] = useState<StreamMessage[]>(DEFAULT_CHAT);
  const [inputText, setInputText] = useState('');
  const [showChat, setShowChat] = useState(true);

  /* ---------------- Gifts / Sparks / leaderboard -------------------------- */
  const [showGiftPicker, setShowGiftPicker] = useState(false);
  const [sparkGiftOpen, setSparkGiftOpen] = useState(false);
  const [showLeaderboard, setShowLeaderboard] = useState(false);
  const [giftSending, setGiftSending] = useState(false);
  const [leaderboard, setLeaderboard] = useState<StreamGiftLeaderboard[]>([]);

  /* ---------------- Polls (still simulated in this stage) ---------------- */
  const [activePoll, setActivePoll] = useState<StreamPoll | null>(null);
  const [hasVotedPoll, setHasVotedPoll] = useState(false);
  const [votedOptionId, setVotedOptionId] = useState<string | undefined>();

  /* ---------------- Pinned (still simulated in this stage) --------------- */
  const [pinnedMessage, setPinnedMessage] = useState<StreamPinnedMessage | null>(null);

  /* ---------------- Viewer count (attendance RPC syncs live_streams) --------- */
  const [viewerCount, setViewerCount] = useState(0);

  useEffect(() => {
    if (stream) setViewerCount(stream.viewerCount);
  }, [stream]);

  useEffect(() => {
    if (!streamId || !user?.id || !broadcastLive || isHost) return;
    let cancelled = false;
    const tick = async () => {
      const n = await streamsLiveService.touchAttendance(streamId);
      if (!cancelled && typeof n === 'number') setViewerCount(n);
      void queryClient.invalidateQueries({ queryKey: ['stream', streamId] });
    };
    void tick();
    const iv = setInterval(tick, 45_000);
    return () => {
      cancelled = true;
      clearInterval(iv);
    };
  }, [streamId, user?.id, broadcastLive, isHost, queryClient]);

  /** Viewer polls while waiting for host broadcast_started_at (no LiveKit token yet). */
  useEffect(() => {
    if (!streamId || isHost || stream?.status !== 'live' || stream.broadcastStartedAt) return;
    const iv = setInterval(() => {
      void queryClient.invalidateQueries({ queryKey: ['stream', streamId] });
    }, 4000);
    return () => clearInterval(iv);
  }, [streamId, isHost, stream?.status, stream?.broadcastStartedAt, queryClient]);

  useEffect(() => {
    let cancelled = false;

    if (!stream || !streamId || !liveKitEnabled) {
      setLkToken(null);
      setLkServerUrl(null);
      setLkError(null);
      return;
    }

    const allowViewer = !isHost && broadcastLive;
    const allowHost = isHost && stream.status === 'live';

    if (!allowViewer && !allowHost) {
      setLkToken(null);
      setLkServerUrl(null);
      setLkError(null);
      return;
    }

    (async () => {
      try {
        const session = await videoProvider.getSession({
          streamId,
          role: isHost ? 'host' : 'viewer',
          userId: user?.id ?? '',
        });
        if (cancelled) return;
        setLkToken(session.token);
        setLkServerUrl(session.playbackUrl ?? '');
        setLkError(null);
        if (!isHost) analytics.track('live_stream_joined', { stream_id: streamId });
      } catch (e: any) {
        if (cancelled) return;
        setLkToken(null);
        setLkServerUrl(null);
        const msg = typeof e?.message === 'string' ? e.message : 'Live unavailable';
        setLkError(msg);
        analytics.track('live_stream_watch_failed', { stream_id: streamId, reason: msg });
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [
    streamId,
    stream?.status,
    stream?.broadcastStartedAt,
    broadcastLive,
    isHost,
    liveKitEnabled,
    stream,
    user?.id,
  ]);

  useFocusEffect(
    useCallback(() => {
      analytics.track('screen_view', { screen_name: 'live_stream_viewer', stream_id: streamId });
      return undefined;
    }, [streamId]),
  );

  /* ==========================================================================
   *  REAL — load + subscribe to real chat messages on DB-backed streams.
   * ==========================================================================*/
  useEffect(() => {
    if (!streamId) return;

    let cancelled = false;
    (async () => {
      const history = await streamMessagesService.listRecent(streamId, 50);
      if (!cancelled && history.length > 0) setMessages(history);
    })();

    const unsubscribe = streamMessagesService.subscribe(streamId, (msg) => {
      setMessages((prev) => {
        // Ignore dupes — sender optimistically appends, then realtime echoes it.
        if (prev.some((m) => m.id === msg.id)) return prev;
        return [...prev.slice(-199), msg];
      });
    });

    return () => {
      cancelled = true;
      unsubscribe();
    };
  }, [streamId]);

  /* ==========================================================================
   *  REAL — gift firehose for DB-backed streams.
   * ==========================================================================*/
  useEffect(() => {
    if (!streamId) return;

    const unsubscribe = streamGiftsService.subscribe(streamId, (event) => {
      const giftMsg: StreamMessage = {
        id: `gift-${event.id}`,
        streamId: event.streamId,
        userId: event.senderId,
        displayName: event.senderName,
        content: '',
        isHost: false,
        isModerator: false,
        createdAt: event.createdAt,
        messageType: 'gift',
        giftData: event,
      };
      setMessages((prev) => [...prev.slice(-199), giftMsg]);

      setLeaderboard((prev) => {
        const sparksAdded = event.gift.sparkCost * event.quantity;
        const existing = prev.find((l) => l.userId === event.senderId);
        const next = existing
          ? prev.map((l) =>
              l.userId === event.senderId
                ? {
                    ...l,
                    totalSparks: l.totalSparks + sparksAdded,
                    giftCount: l.giftCount + event.quantity,
                  }
                : l,
            )
          : [
              ...prev,
              {
                userId: event.senderId,
                displayName: event.senderName,
                totalSparks: sparksAdded,
                giftCount: event.quantity,
                rank: prev.length + 1,
              },
            ];
        return next
          .sort((a, b) => b.totalSparks - a.totalSparks)
          .map((l, i) => ({ ...l, rank: i + 1 }));
      });
    });

    return unsubscribe;
  }, [streamId]);

  /* ==========================================================================
   *  REAL — load active poll + subscribe to vote / lifecycle updates.
   *  Also hydrates `hasVotedPoll` from `stream_poll_votes` so the widget
   *  shows results immediately for users who already voted in a past session.
   * ==========================================================================*/
  useEffect(() => {
    if (!streamId) return;

    let cancelled = false;

    (async () => {
      const poll = await streamPollsService.getActive(streamId);
      if (cancelled) return;
      setActivePoll(poll);

      if (poll && user?.id) {
        const { voted, optionId } = await streamPollsService.hasVoted(poll.id, user.id);
        if (!cancelled && voted) {
          setHasVotedPoll(true);
          setVotedOptionId(optionId);
        }
      }
    })();

    const unsubscribe = streamPollsService.subscribe(streamId, (poll) => {
      setActivePoll(poll);
      if (!poll) {
        setHasVotedPoll(false);
        setVotedOptionId(undefined);
      }
    });

    return () => {
      cancelled = true;
      unsubscribe();
    };
  }, [streamId, user?.id]);

  /* ==========================================================================
   *  REAL — load active pinned message + subscribe to pin/unpin events.
   * ==========================================================================*/
  useEffect(() => {
    if (!streamId) return;

    let cancelled = false;
    (async () => {
      const pin = await streamPinsService.getActive(streamId);
      if (!cancelled) setPinnedMessage(pin);
    })();

    const unsubscribe = streamPinsService.subscribe(streamId, (pin) => {
      setPinnedMessage(pin);
    });

    return () => {
      cancelled = true;
      unsubscribe();
    };
  }, [streamId]);

  useEffect(() => {
    if (stream?.status !== 'scheduled') return;
    let cancelled = false;
    void streamsLiveService.hasReminder(streamId).then((v) => {
      if (!cancelled) setReminderOn(v);
    });
    return () => {
      cancelled = true;
    };
  }, [stream?.status, streamId]);

  /* ==========================================================================
   *  Handlers
   * ==========================================================================*/
  const handleLiveKitConnected = useCallback(async () => {
    if (!isHost || !streamId) return;
    const ok = await streamsLiveService.markBroadcastStarted(streamId);
    if (ok) {
      analytics.track('live_stream_started', { stream_id: streamId });
      await queryClient.invalidateQueries({ queryKey: ['stream', streamId] });
      await queryClient.invalidateQueries({ queryKey: ['streams', 'live'] });
      await queryClient.invalidateQueries({ queryKey: ['liveHub'] });
    }
  }, [isHost, streamId, queryClient]);

  const promoteScheduledNow = useCallback(async () => {
    setPromoting(true);
    try {
      const ok = await streamsLiveService.promoteScheduledToLive(streamId);
      if (!ok) showToast('Couldn\u2019t open broadcast.', 'error');
      else await queryClient.invalidateQueries({ queryKey: ['stream', streamId] });
    } finally {
      setPromoting(false);
    }
  }, [streamId, queryClient, showToast]);

  /** When LiveKit is off (Expo Go / missing env), real video never connects — still allow hub + chat via poster. */
  const continuePosterOnlyDemo = useCallback(async () => {
    setDemoContinuing(true);
    try {
      const ok = await streamsLiveService.markBroadcastStarted(streamId);
      if (!ok) showToast('Couldn\u2019t open session.', 'error');
      else {
        analytics.track('live_stream_started', { stream_id: streamId, demo_poster_only: true });
        await queryClient.invalidateQueries({ queryKey: ['stream', streamId] });
        await queryClient.invalidateQueries({ queryKey: ['streams', 'live'] });
        await queryClient.invalidateQueries({ queryKey: ['liveHub'] });
        showToast('Live on the hub — poster preview only until you use a dev build + LiveKit.', 'success');
      }
    } finally {
      setDemoContinuing(false);
    }
  }, [streamId, queryClient, showToast]);

  const sendMessage = useCallback(async () => {
    const body = inputText.trim().slice(0, STREAM_CHAT_MAX_LENGTH);
    if (!body) return;

    // Clear the input immediately so it feels snappy.
    setInputText('');

    // Optimistic append — replaced / deduped once the DB echo arrives.
    const optimistic: StreamMessage = {
      id: `local-${Date.now()}`,
      streamId,
      userId: user?.id ?? 'me',
      displayName: profile?.displayName ?? 'You',
      avatarUrl: profile?.avatarUrl,
      role: profile?.role as any,
      content: body,
      isHost: stream?.host.id === user?.id,
      isModerator: false,
      createdAt: new Date().toISOString(),
    };
    setMessages((prev) => [...prev, optimistic]);

    if (!user?.id) return;

    try {
      const persisted = await streamMessagesService.send({
        streamId,
        userId: user.id,
        displayName: profile?.displayName ?? 'User',
        avatarUrl: profile?.avatarUrl,
        role: profile?.role,
        content: body,
        isHost: stream?.host.id === user.id,
      });

      if (persisted) {
        // Swap the optimistic entry for the real one so edits/deletes key off
        // the canonical id.
        setMessages((prev) =>
          prev.map((m) => (m.id === optimistic.id ? persisted : m)),
        );
      }
    } catch {
      // Rollback on failure.
      setMessages((prev) => prev.filter((m) => m.id !== optimistic.id));
      showToast('Couldn\u2019t send message. Try again.', 'error');
    }
  }, [
    inputText,
    streamId,
    user?.id,
    profile?.displayName,
    profile?.avatarUrl,
    profile?.role,
    stream?.host.id,
    showToast,
  ]);

  const handleSendGift = useCallback(
    async (gift: LiveGift, quantity: number) => {
      if (!user?.id) {
        showToast('Sign in to send gifts.', 'info');
        return;
      }

      setGiftSending(true);

      try {
        await streamGiftsService.send({
          streamId,
          gift,
          quantity,
          idempotencyKey: Crypto.randomUUID(),
        });
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        await queryClient.invalidateQueries({ queryKey: shopKeys.sparkWallet(user.id) });
        analytics.track('live_gift_sent', {
          stream_id: streamId,
          gift_id: gift.id,
          quantity,
        });
      } catch (err: any) {
        showToast(
          err?.message?.toLowerCase().includes('insufficient')
            ? 'Not enough Sparks. Top up in Pulse Shop.'
            : 'Couldn\u2019t send gift. Try again.',
          'error',
        );
      } finally {
        setTimeout(() => {
          setGiftSending(false);
          setShowGiftPicker(false);
        }, 400);
      }
    },
    [streamId, user?.id, showToast, queryClient],
  );

  const handleToggleFollow = useCallback(async () => {
    if (!user?.id || !stream?.host.id) return;
    if (user.id === stream.host.id) return;

    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);

    // Optimistic flip.
    const nextFollowing = !isFollowing;
    setCreatorFollowed(stream.host.id, nextFollowing);

    try {
      const confirmed = await profilesService.toggleFollow(user.id, stream.host.id);
      if (confirmed !== nextFollowing) {
        setCreatorFollowed(stream.host.id, confirmed);
      }
    } catch {
      // Rollback on failure.
      setCreatorFollowed(stream.host.id, !nextFollowing);
      showToast('Couldn\u2019t update follow. Try again.', 'error');
    }
  }, [user?.id, stream?.host.id, isFollowing, setCreatorFollowed, showToast]);

  const handlePollVote = useCallback(
    async (optionId: string) => {
      if (!activePoll) return;

      // Optimistic: flip the widget immediately so the vote feels instant.
      setHasVotedPoll(true);
      setVotedOptionId(optionId);
      setActivePoll((prev) => {
        if (!prev) return null;
        const nextTotal = prev.totalVotes + 1;
        return {
          ...prev,
          totalVotes: nextTotal,
          options: prev.options.map((o) => {
            const votes = o.id === optionId ? o.votes + 1 : o.votes;
            return {
              ...o,
              votes,
              percentage: Math.round((votes / Math.max(1, nextTotal)) * 100),
            };
          }),
        };
      });
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

      if (!user?.id) return;

      try {
        const accepted = await streamPollsService.vote(activePoll.id, optionId, user.id);
        if (!accepted) {
          // User already voted (server said no) — keep their local state, it's
          // correct-ish. No toast needed; the widget is idempotent.
        }
        // The realtime subscription will surface the authoritative counts as
        // other viewers vote, so we don't need to refetch here.
      } catch {
        // Rollback.
        setHasVotedPoll(false);
        setVotedOptionId(undefined);
        setActivePoll((prev) => {
          if (!prev) return null;
          const nextTotal = Math.max(0, prev.totalVotes - 1);
          return {
            ...prev,
            totalVotes: nextTotal,
            options: prev.options.map((o) => {
              const votes = o.id === optionId ? Math.max(0, o.votes - 1) : o.votes;
              return {
                ...o,
                votes,
                percentage: Math.round((votes / Math.max(1, nextTotal)) * 100),
              };
            }),
          };
        });
        showToast('Couldn\u2019t record vote. Try again.', 'error');
      }
    },
    [activePoll, user?.id, showToast],
  );

  const handleUnpin = useCallback(async () => {
    if (!pinnedMessage) return;

    // Optimistic hide.
    const previous = pinnedMessage;
    setPinnedMessage(null);

    const ok = await streamPinsService.unpin(previous.id);
    if (!ok) {
      // Restore on failure.
      setPinnedMessage(previous);
      showToast('Couldn\u2019t unpin. Try again.', 'error');
    }
  }, [pinnedMessage, showToast]);

  /* ────────────────────── Host controls ────────────────────── */

  /** Host-only: create and launch a new poll. */
  const handleCreatePoll = useCallback(
    async (input: {
      question: string;
      options: { id: string; text: string }[];
      durationSec: number;
    }) => {
      if (!isHost) return;

      const poll = await streamPollsService.create({
        streamId,
        question: input.question,
        options: input.options,
        durationSec: input.durationSec,
      });

      if (poll) {
        setActivePoll(poll);
        setHasVotedPoll(false);
        setVotedOptionId(undefined);
        showToast('Poll launched.', 'success');
      } else {
        showToast('Couldn\u2019t launch poll. Try again.', 'error');
      }
    },
    [isHost, streamId, showToast],
  );

  /** Host-only: manually end the active poll early. */
  const handleEndPoll = useCallback(async () => {
    if (!isHost || !activePoll) return;

    const previous = activePoll;
    setActivePoll(null);
    setHasVotedPoll(false);
    setVotedOptionId(undefined);

    const ok = await streamPollsService.end(previous.id);
    if (!ok) {
      // Restore on failure.
      setActivePoll(previous);
      showToast('Couldn\u2019t end poll. Try again.', 'error');
    }
  }, [isHost, activePoll, showToast]);

  /** Host-only: long-press a chat message to pin it. */
  const handleMessageLongPress = useCallback(
    (msg: StreamMessage) => {
      if (!isHost) return;
      // Skip system, gift, and already-empty messages.
      if (!msg.content.trim() || msg.messageType !== 'chat') return;

      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

      Alert.alert(
        'Pin message?',
        `"${msg.content.slice(0, 80)}${msg.content.length > 80 ? '\u2026' : ''}"`,
        [
          { text: 'Cancel', style: 'cancel' },
          {
            text: 'Pin',
            onPress: async () => {
              if (!user?.id) return;

              // Optimistic pin — replaced when realtime echoes it.
              const optimisticPin: StreamPinnedMessage = {
                id: `local-pin-${Date.now()}`,
                streamId,
                content: msg.content,
                pinnedBy: user.id,
                pinnedByName: profile?.displayName ?? 'Host',
                createdAt: new Date().toISOString(),
              };
              const previous = pinnedMessage;
              setPinnedMessage(optimisticPin);

              const persisted = await streamPinsService.pin({
                streamId,
                content: msg.content,
                pinnedBy: user.id,
                pinnedByName: profile?.displayName ?? 'Host',
              });
              if (!persisted) {
                setPinnedMessage(previous);
                showToast('Couldn\u2019t pin. Try again.', 'error');
              }
            },
          },
        ],
      );
    },
    [isHost, user?.id, profile?.displayName, pinnedMessage, streamId, showToast],
  );

  /** Host-only: end the stream and return to the Live tab. */
  const handleEndStream = useCallback(() => {
    if (!isHost || endingStream) return;

    Alert.alert(
      'End stream?',
      'Viewers will be notified the stream has ended.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'End Stream',
          style: 'destructive',
          onPress: async () => {
            setEndingStream(true);
            try {
              const ok = await streamsLiveService.endStream(streamId);
              if (!ok) {
                showToast('Couldn\u2019t end stream. Try again.', 'error');
                setEndingStream(false);
                return;
              }
              analytics.track('live_stream_ended', { stream_id: streamId });
              showToast('Stream ended. Great work.', 'success');
              router.replace('/(tabs)/live');
            } catch {
              setEndingStream(false);
              showToast('Something went wrong. Try again.', 'error');
            }
          },
        },
      ],
    );
  }, [isHost, endingStream, streamId, router, showToast]);

  const handleShareLive = useCallback(async () => {
    if (!stream) return;
    try {
      await Share.share({
        message: `Watch ${stream.host.displayName} on PulseVerse Live: ${stream.title}`,
      });
    } catch {
      showToast('Share cancelled', 'info');
    }
  }, [stream, showToast]);

  const openLiveHighlights = useCallback(() => {
    router.push(liveHighlightsHref(streamId));
  }, [router, streamId]);

  const openLiveOverflowMenu = useCallback(() => {
    if (!user?.id || !stream || isHost) return;
    Alert.alert('Live options', undefined, [
      {
        text: 'Report stream',
        onPress: () => setReportOpen(true),
      },
      {
        text: 'Block host',
        style: 'destructive',
        onPress: () => {
          Alert.alert(
            `Block ${stream.host.displayName}?`,
            'They won\u2019t be able to message you.',
            [
              { text: 'Cancel', style: 'cancel' },
              {
                text: 'Block',
                style: 'destructive',
                onPress: async () => {
                  try {
                    await messagesService.blockUserAndOptionalDeleteConversation(user.id, stream.host.id);
                    showToast('Host blocked.', 'success');
                    router.back();
                  } catch {
                    showToast('Couldn\u2019t block user.', 'error');
                  }
                },
              },
            ],
          );
        },
      },
      { text: 'Cancel', style: 'cancel' },
    ]);
  }, [user?.id, stream, isHost, showToast, router]);

  if (isLoading || !stream) return <LoadingState />;

  const posterUri = (stream.thumbnailUrl ?? '').trim() || (stream.host.avatarUrl ?? '').trim();
  const showLiveKitLayer =
    liveKitEnabled && !!lkToken && !!lkServerUrl && stream.status === 'live';

  if (stream.status === 'ended') {
    return (
      <View style={[styles.container, { paddingTop: insets.top, paddingHorizontal: 14 }]}>
        <TouchableOpacity onPress={() => router.back()} style={styles.iconBtn}>
          <Ionicons name="chevron-back" size={22} color="#FFF" />
        </TouchableOpacity>
        <View style={{ flex: 1, justifyContent: 'center', paddingBottom: 48, gap: 10 }}>
          <Text style={styles.sessionTitle}>This live has ended</Text>
          <Text style={{ color: colors.dark.textMuted }}>{stream.title}</Text>
        </View>
      </View>
    );
  }

  if (stream.status === 'scheduled' && !isHost) {
    const starts =
      stream.scheduledFor != null && stream.scheduledFor !== ''
        ? new Date(stream.scheduledFor).toLocaleString()
        : 'Time TBD';
    return (
      <View style={[styles.container, { paddingTop: insets.top, paddingHorizontal: 14 }]}>
        <TouchableOpacity onPress={() => router.back()} style={styles.iconBtn}>
          <Ionicons name="chevron-back" size={22} color="#FFF" />
        </TouchableOpacity>
        <LinearGradient colors={['rgba(6,14,26,0.95)', 'rgba(6,14,26,0.75)']} style={StyleSheet.absoluteFill} />
        <View style={{ flex: 1, justifyContent: 'center', gap: 16, zIndex: 2 }}>
          <Text style={styles.sessionTitle}>Starts later</Text>
          <Text style={{ color: colors.neutral.white }}>{stream.title}</Text>
          <Text style={{ color: colors.dark.textMuted }}>Hosted by {stream.host.displayName}</Text>
          <Text style={{ color: colors.primary.teal }}>{starts}</Text>
          <TouchableOpacity
            style={styles.followBtn}
            onPress={async () => {
              if (!user?.id) {
                showToast('Sign in to save reminders.', 'info');
                return;
              }
              const next = await streamsLiveService.toggleReminder(stream.id);
              if (next === null) {
                showToast('Couldn\u2019t update reminder.', 'error');
                return;
              }
              setReminderOn(next);
              analytics.track('reminder_clicked', { stream_id: stream.id, enabled: next });
              showToast(
                next ? 'Reminder saved. Push at go-live is not wired yet.' : 'Reminder removed.',
                'success',
              );
            }}
          >
            <Text style={styles.followBtnText}>{reminderOn ? 'Reminder on' : 'Remind me'}</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <View style={styles.streamMediaUnderlay}>
        {showLiveKitLayer ? (
          <Suspense fallback={<View style={[styles.streamBg, { backgroundColor: '#020617' }]} />}>
            <LiveKitStageLazy
              serverUrl={lkServerUrl!}
              token={lkToken!}
              role={isHost ? 'host' : 'viewer'}
              style={styles.streamBg}
              onConnected={handleLiveKitConnected}
              onError={(err) => {
                if (!isHost) return;
                Alert.alert(
                  'Broadcast error',
                  `${err.message}\n\nYou can end this session and try again.`,
                  [
                    { text: 'Dismiss', style: 'cancel' },
                    {
                      text: 'End session',
                      style: 'destructive',
                      onPress: async () => {
                        await streamsLiveService.abortUnbroadcastStream(streamId);
                        await queryClient.invalidateQueries({ queryKey: ['stream', streamId] });
                        router.replace('/(tabs)/live');
                      },
                    },
                  ],
                );
              }}
            />
          </Suspense>
        ) : posterUri ? (
          <Image
            source={{ uri: posterUri }}
            style={styles.streamBg}
            contentFit="cover"
            {...pulseImageFeedHeroProps}
          />
        ) : (
          <View style={[styles.streamBg, { backgroundColor: '#0f172a' }]} />
        )}
      </View>
      <LinearGradient
        colors={['rgba(6,14,26,0.65)', 'rgba(6,14,26,0.2)', 'rgba(6,14,26,0.88)']}
        locations={[0, 0.35, 1]}
        style={StyleSheet.absoluteFill}
      />

      {!broadcastLive && streamIsLive && !isHost ? (
        <View style={styles.connectBanner} pointerEvents="none">
          <Text style={styles.connectBannerTxt}>Host is connecting\u2026</Text>
        </View>
      ) : null}

      {isHost && stream.status === 'scheduled' ? (
        <View style={styles.scheduledHostBanner}>
          <Text style={styles.scheduledHostTitle}>Scheduled session</Text>
          <Text style={styles.scheduledHostMeta}>Tap below when you\u2019re ready — viewers stay out until you broadcast.</Text>
          <TouchableOpacity
            style={[styles.promoteBtn, promoting && { opacity: 0.7 }]}
            disabled={promoting}
            onPress={promoteScheduledNow}
          >
            <Text style={styles.promoteBtnTxt}>{promoting ? 'Opening\u2026' : 'Start broadcast'}</Text>
          </TouchableOpacity>
        </View>
      ) : null}

      {isHost && streamIsLive && preparingBroadcast && !liveKitEnabled ? (
        <View style={styles.mockLiveKitBanner}>
          <Text style={styles.scheduledHostTitle}>Real camera isn\u2019t available here</Text>
          <Text style={styles.scheduledHostMeta}>
            {isExpoGo()
              ? 'Expo Go can\u2019t run LiveKit (native WebRTC). Use an EAS development build on a device, then set EXPO_PUBLIC_LIVEKIT_URL in .env.'
              : process.env.EXPO_PUBLIC_LIVEKIT_URL?.trim()
                ? 'EXPO_PUBLIC_LIVEKIT_URL must start with wss:// — fix .env and restart Metro.'
                : 'Add EXPO_PUBLIC_LIVEKIT_URL=wss://your-project.livekit.cloud to .env, restart Metro, and use a development build (not Expo Go).'}
          </Text>
          <TouchableOpacity
            style={[styles.promoteBtn, demoContinuing && { opacity: 0.7 }]}
            disabled={demoContinuing}
            onPress={continuePosterOnlyDemo}
          >
            <Text style={styles.promoteBtnTxt}>
              {demoContinuing ? 'Starting\u2026' : 'Continue with poster only (hub + chat)'}
            </Text>
          </TouchableOpacity>
        </View>
      ) : null}

      {lkError && isHost && streamIsLive ? (
        <View style={styles.lkErrorBanner}>
          <Text style={styles.lkErrorTxt}>{lkError}</Text>
        </View>
      ) : null}
      <View style={[styles.shell, { paddingTop: insets.top }]}>
        <View style={styles.topBar}>
          <TouchableOpacity onPress={() => router.back()} style={styles.iconBtn} accessibilityLabel="Back">
            <Ionicons name="chevron-back" size={22} color="#FFF" />
          </TouchableOpacity>

          <View style={styles.topCenter}>
            <View style={styles.liveBadge}>
              <View style={styles.livePulse} />
              <Text style={styles.liveText}>
                {streamIsLive ? (isHost && preparingBroadcast ? 'CONNECTING' : 'LIVE') : stream.status.toUpperCase()}
              </Text>
            </View>
            <View style={styles.viewerBadge}>
              <Ionicons name="eye-outline" size={14} color={colors.dark.textSecondary} />
              <Text style={styles.viewerText}>{formatCount(viewerCount)}</Text>
            </View>
          </View>

          <View style={styles.topRight}>
            {leaderboard.length > 0 && (
              <TouchableOpacity
                onPress={() => setShowLeaderboard(true)}
                style={styles.iconBtnSubtle}
                accessibilityLabel="Top supporters"
              >
                <Ionicons name="ribbon-outline" size={18} color={colors.dark.textSecondary} />
              </TouchableOpacity>
            )}
            <TouchableOpacity
              onPress={() => {
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                handleShareLive();
              }}
              style={styles.iconBtnSubtle}
              accessibilityLabel="Share live stream"
            >
              <Ionicons name="share-social-outline" size={17} color="#FFF" />
            </TouchableOpacity>
            <TouchableOpacity
              onPress={() => {
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                openLiveHighlights();
              }}
              style={styles.iconBtnSubtle}
              accessibilityLabel="Clips and highlights"
            >
              <Ionicons name="cut-outline" size={17} color="#FFF" />
            </TouchableOpacity>
            <TouchableOpacity onPress={() => setShowChat(!showChat)} style={styles.iconBtn} accessibilityLabel="Toggle chat">
              <Ionicons name={showChat ? 'chatbubble' : 'chatbubble-outline'} size={19} color="#FFF" />
            </TouchableOpacity>
            {!isHost && user?.id ? (
              <TouchableOpacity
                onPress={() => {
                  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                  openLiveOverflowMenu();
                }}
                style={styles.iconBtnSubtle}
                accessibilityLabel="More live actions"
              >
                <Ionicons name="ellipsis-horizontal" size={20} color="#FFF" />
              </TouchableOpacity>
            ) : null}
            {isHost && (
              <TouchableOpacity
                onPress={handleEndStream}
                style={[styles.iconBtn, styles.endBtn]}
                accessibilityLabel="End stream"
                disabled={endingStream}
              >
                <Ionicons name="stop-circle" size={20} color="#FFF" />
              </TouchableOpacity>
            )}
          </View>
        </View>

        <View style={styles.flexSpacer} />

        <View style={styles.sessionBlock}>
          <Text style={styles.sessionTitle} numberOfLines={3}>
            {stream.title}
          </Text>

          <View style={styles.creatorRow}>
            <Image
              source={{ uri: stream.host.avatarUrl }}
              style={styles.creatorAvatar}
              {...pulseImageListThumbProps}
            />
            <View style={styles.creatorMeta}>
              <View style={styles.creatorNameRow}>
                <Text style={styles.creatorName} numberOfLines={1}>{stream.host.displayName}</Text>
                {stream.host.isVerified && (
                  <Ionicons name="checkmark-circle" size={15} color={colors.primary.teal} />
                )}
              </View>
              <View style={styles.badgeRow}>
                <RoleBadge role={stream.host.role} size="sm" variant="overlay" />
                <SpecialtyBadge specialty={stream.host.specialty} />
                {/*
                  Pulse tier chip in the live overlay. Score is included
                  here (unlike comments) because live is a high-signal
                  identity moment — viewers are choosing whether to
                  stay/follow based on the host. Murmur is still hidden.
                */}
                <PulseTierBadge
                  tier={stream.host.pulseTier ?? null}
                  score={stream.host.pulseScoreCurrent ?? null}
                  size="sm"
                  hideMurmur
                />
              </View>
            </View>
            {user?.id !== stream.host.id && (
              <TouchableOpacity
                style={[styles.followBtn, isFollowing && styles.followBtnActive]}
                onPress={handleToggleFollow}
                activeOpacity={0.85}
              >
                <Text style={[styles.followBtnText, isFollowing && styles.followBtnTextActive]}>
                  {isFollowing ? 'Following' : 'Follow'}
                </Text>
              </TouchableOpacity>
            )}
          </View>
        </View>

        {activePoll && (
          <View style={styles.pollOuter}>
            <PollWidget
              poll={activePoll}
              onVote={handlePollVote}
              hasVoted={hasVotedPoll}
              votedOptionId={votedOptionId}
              compact
            />
            {isHost && (
              <TouchableOpacity
                onPress={handleEndPoll}
                style={styles.endPollBtn}
                activeOpacity={0.8}
              >
                <Ionicons name="stop-outline" size={13} color={colors.dark.textSecondary} />
                <Text style={styles.endPollText}>End poll</Text>
              </TouchableOpacity>
            )}
          </View>
        )}

        {showChat && (
          <View style={[styles.chatColumn, { paddingBottom: insets.bottom + 10, maxHeight: CHAT_MAX_H }]}>
            <View style={{ height: CHAT_LIST_H }}>
              <LiveChatList
                messages={messages}
                pinned={pinnedMessage}
                isHost={isHost}
                onUnpin={handleUnpin}
                onMessageLongPress={handleMessageLongPress}
              />
            </View>

            <View style={styles.chatInputRow}>
              {isHost ? (
                <TouchableOpacity
                  style={styles.giftBtn}
                  onPress={() => {
                    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                    setHostPollVisible(true);
                  }}
                  activeOpacity={0.75}
                  accessibilityLabel="Launch poll"
                >
                  <Ionicons name="stats-chart-outline" size={18} color={colors.primary.teal} />
                </TouchableOpacity>
              ) : (
                <View style={styles.viewerGiftBtns}>
                  <TouchableOpacity
                    style={styles.giftBtn}
                    onPress={() => {
                      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                      if (!user?.id) {
                        showToast('Sign in to send Sparks gifts', 'error');
                        return;
                      }
                      analytics.track('live_gift_opened', { stream_id: streamId, surface: 'spark_tray' });
                      setSparkGiftOpen(true);
                    }}
                    activeOpacity={0.75}
                    accessibilityLabel="Send a Sparks gift to the host"
                  >
                    <Ionicons name="gift-outline" size={18} color={colors.primary.teal} />
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={styles.giftBtn}
                    onPress={() => {
                      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                      if (!user?.id) {
                        showToast('Sign in to send gifts', 'error');
                        return;
                      }
                      analytics.track('live_gift_opened', { stream_id: streamId, surface: 'sticker_picker' });
                      setShowGiftPicker(true);
                    }}
                    activeOpacity={0.75}
                    accessibilityLabel="Send quick live stickers (Sparks)"
                  >
                    <Ionicons name="flash" size={18} color={colors.status.premium} />
                  </TouchableOpacity>
                </View>
              )}

              <AccentComposerFrame
                accentColor={colors.primary.teal}
                compact
                noShadow
                style={{ flex: 1 }}
                footer={
                  <AccentCharCount
                    length={inputText.length}
                    max={STREAM_CHAT_MAX_LENGTH}
                    accentColor={colors.primary.teal}
                    warnWithin={40}
                  />
                }
              >
                <TextInput
                  style={styles.chatInputPlain}
                  placeholder={isHost ? 'Talk to your viewers\u2026' : 'Message the room\u2026'}
                  placeholderTextColor={colors.dark.textQuiet}
                  value={inputText}
                  onChangeText={setInputText}
                  onSubmitEditing={sendMessage}
                  returnKeyType="send"
                  maxLength={STREAM_CHAT_MAX_LENGTH}
                />
              </AccentComposerFrame>

              <TouchableOpacity onPress={sendMessage} style={styles.sendBtn} activeOpacity={0.85}>
                <Ionicons name="arrow-up" size={20} color={colors.dark.bg} />
              </TouchableOpacity>
            </View>
          </View>
        )}
      </View>

      {stream && user?.id && !isHost ? (
        <SendCreatorGiftTray
          visible={sparkGiftOpen}
          onClose={() => setSparkGiftOpen(false)}
          creatorUserId={stream.host.id}
          creatorDisplayName={stream.host.displayName}
          creatorHandle={stream.host.username ?? null}
          creatorAvatarUrl={stream.host.avatarUrl ?? null}
          contextType="live"
          contextId={stream.id}
        />
      ) : null}

      <GiftPicker
        visible={showGiftPicker}
        sparkBalance={sparkBalance}
        onSendGift={handleSendGift}
        onClose={() => setShowGiftPicker(false)}
        onBuySparks={() => {
          setShowGiftPicker(false);
          router.push({ pathname: '/pulse-shop', params: { tab: 'sparks' } });
        }}
        sending={giftSending}
      />

      <GiftLeaderboard
        visible={showLeaderboard}
        leaderboard={leaderboard}
        onClose={() => setShowLeaderboard(false)}
      />

      <HostPollCreator
        visible={hostPollVisible}
        onClose={() => setHostPollVisible(false)}
        onSubmit={handleCreatePoll}
      />

      <ReportModal
        visible={reportOpen}
        onClose={() => setReportOpen(false)}
        targetType="live_stream"
        targetId={stream.id}
      />
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#000' },
  streamBg: { ...StyleSheet.absoluteFillObject },
  streamMediaUnderlay: { ...StyleSheet.absoluteFillObject },
  connectBanner: {
    position: 'absolute',
    top: 118,
    left: 14,
    right: 14,
    zIndex: 15,
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderRadius: borderRadius.md,
    backgroundColor: 'rgba(15,28,48,0.72)',
    borderWidth: 1,
    borderColor: 'rgba(56,189,248,0.22)',
  },
  connectBannerTxt: {
    ...typography.bodySmall,
    color: colors.neutral.white,
    fontWeight: '700',
    textAlign: 'center',
  },
  scheduledHostBanner: {
    position: 'absolute',
    top: 108,
    left: 14,
    right: 14,
    zIndex: 18,
    padding: 14,
    borderRadius: borderRadius.lg,
    backgroundColor: 'rgba(12,18,32,0.88)',
    borderWidth: 1,
    borderColor: 'rgba(56,189,248,0.28)',
    gap: 8,
  },
  scheduledHostTitle: { ...typography.h3, fontSize: 16, color: colors.neutral.white },
  scheduledHostMeta: { ...typography.bodySmall, color: colors.dark.textMuted },
  promoteBtn: {
    marginTop: 4,
    backgroundColor: colors.primary.teal,
    borderRadius: borderRadius.md,
    paddingVertical: 12,
    alignItems: 'center',
  },
  promoteBtnTxt: { ...typography.button, fontWeight: '800', color: colors.dark.bg },
  mockLiveKitBanner: {
    position: 'absolute',
    top: 108,
    left: 14,
    right: 14,
    zIndex: 17,
    padding: 14,
    borderRadius: borderRadius.lg,
    backgroundColor: 'rgba(12,18,32,0.92)',
    borderWidth: 1,
    borderColor: 'rgba(250,204,21,0.35)',
    gap: 8,
  },
  lkErrorBanner: {
    position: 'absolute',
    top: 108,
    left: 14,
    right: 14,
    zIndex: 19,
    padding: 12,
    borderRadius: borderRadius.md,
    backgroundColor: 'rgba(127,29,29,0.75)',
    borderWidth: 1,
    borderColor: 'rgba(252,165,165,0.35)',
  },
  lkErrorTxt: { ...typography.bodySmall, color: colors.neutral.white },
  shell: { flex: 1, paddingHorizontal: 14 },

  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    zIndex: 20,
  },
  flexSpacer: { flex: 1, minHeight: 48 },
  iconBtn: {
    width: 40,
    height: 40,
    borderRadius: borderRadius.full,
    backgroundColor: 'rgba(15,28,48,0.55)',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
  },
  iconBtnSubtle: {
    width: 38,
    height: 38,
    borderRadius: borderRadius.full,
    backgroundColor: 'rgba(15,28,48,0.4)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  topCenter: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  topRight: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  liveBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: colors.status.error,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: borderRadius.md,
    borderWidth: 1,
    borderColor: colors.primary.gold + '55',
  },
  livePulse: { width: 7, height: 7, borderRadius: 4, backgroundColor: '#FFF' },
  liveText: { fontSize: 11, fontWeight: '900', color: '#FFF', letterSpacing: 0.6 },
  viewerBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: 'rgba(15,28,48,0.85)',
    paddingHorizontal: 11,
    paddingVertical: 6,
    borderRadius: borderRadius.md,
    borderWidth: 1,
    borderColor: colors.dark.border,
  },
  viewerText: { fontSize: 12, fontWeight: '700', color: colors.dark.text },

  sessionBlock: {
    marginBottom: 10,
  },
  sessionTitle: {
    ...typography.h2,
    fontSize: 19,
    lineHeight: 25,
    color: colors.neutral.white,
    letterSpacing: -0.35,
    marginBottom: 12,
    textShadowColor: 'rgba(0,0,0,0.45)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 6,
  },
  creatorRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: 'rgba(11,31,58,0.5)',
    borderRadius: borderRadius.xl,
    padding: 10,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
  },
  creatorAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.2)',
  },
  creatorMeta: { flex: 1, minWidth: 0 },
  creatorNameRow: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  creatorName: {
    fontSize: 15,
    fontWeight: '800',
    color: colors.neutral.white,
    letterSpacing: -0.2,
  },
  badgeRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: 6 },
  followBtn: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: borderRadius.button,
    backgroundColor: colors.primary.teal,
  },
  followBtnActive: { backgroundColor: 'rgba(255,255,255,0.12)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.12)' },
  followBtnText: { fontSize: 13, fontWeight: '700', color: colors.dark.bg },
  followBtnTextActive: { color: colors.neutral.white },

  pollOuter: {
    marginBottom: 8,
  },
  endPollBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    alignSelf: 'flex-end',
    paddingHorizontal: 10,
    paddingVertical: 5,
    marginTop: 4,
    borderRadius: borderRadius.button,
    backgroundColor: 'rgba(15,28,48,0.7)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
  },
  endPollText: { fontSize: 11, fontWeight: '700', color: colors.dark.textSecondary },
  endBtn: { backgroundColor: colors.status.error, borderColor: colors.status.error },

  chatColumn: {
    width: '100%',
    alignSelf: 'stretch',
  },
  chatInputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 8,
  },
  giftBtn: {
    width: 40,
    height: 40,
    borderRadius: borderRadius.full,
    backgroundColor: 'rgba(15,28,48,0.75)',
    borderWidth: 1,
    borderColor: colors.dark.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  viewerGiftBtns: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  chatInputPlain: {
    paddingHorizontal: 4,
    paddingVertical: Platform.OS === 'ios' ? 6 : 4,
    color: colors.neutral.white,
    fontSize: 14,
    lineHeight: 20,
  },
  sendBtn: {
    width: 40,
    height: 40,
    borderRadius: borderRadius.full,
    backgroundColor: colors.primary.teal,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
