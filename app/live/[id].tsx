import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
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
} from 'react-native';
import { Image } from 'expo-image';
import { useLocalSearchParams, useRouter, Redirect } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import * as Haptics from 'expo-haptics';
import { useStream } from '@/hooks/useQueries';
import { useAuth } from '@/contexts/AuthContext';
import { useAppStore } from '@/store/useAppStore';
import { LoadingState } from '@/components/ui/LoadingState';
import { LiveChatList } from '@/components/live/LiveChat';
import { GiftPicker } from '@/components/live/GiftPicker';
import { GiftLeaderboard } from '@/components/live/GiftLeaderboard';
import { PollWidget } from '@/components/live/PollWidget';
import { HostPollCreator } from '@/components/live/HostPollCreator';
import { CoinShopModal } from '@/components/live/CoinShopModal';
import { RoleBadge } from '@/components/ui/RoleBadge';
import { SpecialtyBadge } from '@/components/ui/SpecialtyBadge';
import { PulseTierBadge } from '@/components/badges/PulseTierBadge';
import { LIVE_GIFTS } from '@/services/live/gifts';
import {
  streamMessagesService,
  streamGiftsService,
  streamPollsService,
  streamPinsService,
  streamsLiveService,
  userCoinsService,
  profilesService,
} from '@/services/supabase';
import { supabase } from '@/lib/supabase';
import { useToast } from '@/components/ui/Toast';
import { isSeedStream } from '@/lib/liveSeedStreams';
import { isFeatureEnabled } from '@/lib/featureFlags';
import { STREAM_CHAT_MAX_LENGTH } from '@/constants';
import { colors, borderRadius, typography } from '@/theme';
import { formatCount } from '@/utils/format';
import type {
  StreamMessage,
  StreamPinnedMessage,
  StreamPoll,
  LiveGift,
  LiveGiftEvent,
  StreamGiftLeaderboard,
} from '@/types';

const { height: SCREEN_H } = Dimensions.get('window');
const CHAT_MAX_H = SCREEN_H * 0.38;
const CHAT_LIST_H = CHAT_MAX_H - 54;

/* -------------------------------------------------------------------------- */
/*  Simulation — used only for seed streams (so demo never hits a broken DB). */
/* -------------------------------------------------------------------------- */
const SIMULATED_NAMES = [
  'NurseLife22', 'StudentRN_', 'ICU_Warrior', 'NightShiftNinja',
  'TravelNurseKai', 'MedSurgMama', 'PedsProPriya', 'ERDaveCharge',
  'CNA_Marcus', 'NewGradNina', 'ORNurseAlex', 'TeleNurse_Sam',
];
const SIMULATED_MSGS = [
  'Love this stream!', 'So informative!', 'Needed to hear this',
  'Can you repeat that?', 'Dropping a follow!', '❤️❤️❤️',
  'Same thing happened on my unit', 'Preach!', 'This is gold',
  'Thanks for sharing!', 'Learned something new today', 'Great content!',
];
const SIMULATED_ROLES = ['RN', 'CNA', 'LPN', 'Student Nurse', 'Travel Nurse', 'Charge Nurse'];

const SEED_WELCOME: StreamMessage[] = [
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

  const { id } = useLocalSearchParams<{ id: string }>();
  const streamId = id ?? '';
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { user, profile } = useAuth();
  const { data: stream, isLoading } = useStream(streamId);
  const showToast = useToast((s) => s.show);

  const coinWallet = isFeatureEnabled('coinWallet');

  /** Seed streams lack real DB rows — we keep the nice simulation for those. */
  const isSeed = useMemo(() => isSeedStream({ id: streamId }), [streamId]);
  const streamIsLive = stream?.status === 'live';

  /** True when the signed-in user is the stream host — unlocks host controls. */
  const isHost = useMemo(
    () => !!user?.id && !!stream && stream.host.id === user.id,
    [user?.id, stream],
  );

  /** Host modal visibility + end-stream busy flag. */
  const [hostPollVisible, setHostPollVisible] = useState(false);
  const [endingStream, setEndingStream] = useState(false);

  /** Coin shop modal (open from GiftPicker's "Buy Coins"). */
  const [coinShopVisible, setCoinShopVisible] = useState(false);

  /* ---------------- Followed set (hydrated from store) ------------------- */
  const followedCreatorIds = useAppStore((s) => s.followedCreatorIds);
  const setCreatorFollowed = useAppStore((s) => s.setCreatorFollowed);
  const isFollowing = stream ? followedCreatorIds.has(stream.host.id) : false;

  /* ---------------- Messages (real or simulated) ------------------------- */
  const [messages, setMessages] = useState<StreamMessage[]>(SEED_WELCOME);
  const [inputText, setInputText] = useState('');
  const [showChat, setShowChat] = useState(true);

  /* ---------------- Gifts / coins / leaderboard -------------------------- */
  const [showGiftPicker, setShowGiftPicker] = useState(false);
  const [showLeaderboard, setShowLeaderboard] = useState(false);
  const [coinBalance, setCoinBalance] = useState(0);
  const [giftSending, setGiftSending] = useState(false);
  const [leaderboard, setLeaderboard] = useState<StreamGiftLeaderboard[]>([]);

  /* ---------------- Polls (still simulated in this stage) ---------------- */
  const [activePoll, setActivePoll] = useState<StreamPoll | null>(null);
  const [hasVotedPoll, setHasVotedPoll] = useState(false);
  const [votedOptionId, setVotedOptionId] = useState<string | undefined>();

  /* ---------------- Pinned (still simulated in this stage) --------------- */
  const [pinnedMessage, setPinnedMessage] = useState<StreamPinnedMessage | null>(null);

  /* ---------------- Viewer count (presence for real streams) ------------- */
  const [viewerCount, setViewerCount] = useState(0);
  const presenceChannelRef = useRef<ReturnType<typeof supabase.channel> | null>(null);

  useEffect(() => {
    if (stream) setViewerCount(stream.viewerCount);
  }, [stream]);

  /* ==========================================================================
   *  REAL — load + subscribe to real chat messages on DB-backed streams.
   * ==========================================================================*/
  useEffect(() => {
    if (!streamId || isSeed) return;

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
  }, [streamId, isSeed]);

  /* ==========================================================================
   *  REAL — gift firehose for DB-backed streams.
   * ==========================================================================*/
  useEffect(() => {
    if (!streamId || isSeed) return;

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
        const coinsAdded = event.gift.coinCost * event.quantity;
        const existing = prev.find((l) => l.userId === event.senderId);
        const next = existing
          ? prev.map((l) =>
              l.userId === event.senderId
                ? {
                    ...l,
                    totalCoins: l.totalCoins + coinsAdded,
                    giftCount: l.giftCount + event.quantity,
                  }
                : l,
            )
          : [
              ...prev,
              {
                userId: event.senderId,
                displayName: event.senderName,
                totalCoins: coinsAdded,
                giftCount: event.quantity,
                rank: prev.length + 1,
              },
            ];
        return next
          .sort((a, b) => b.totalCoins - a.totalCoins)
          .map((l, i) => ({ ...l, rank: i + 1 }));
      });
    });

    return unsubscribe;
  }, [streamId, isSeed]);

  /* ==========================================================================
   *  REAL — load the caller's coin wallet.
   * ==========================================================================*/
  useEffect(() => {
    if (!user?.id) return;
    let cancelled = false;
    (async () => {
      await userCoinsService.ensureRow(user.id);
      const wallet = await userCoinsService.getBalance(user.id);
      if (!cancelled) setCoinBalance(wallet.balance);
    })();
    return () => {
      cancelled = true;
    };
  }, [user?.id]);

  /* ==========================================================================
   *  REAL — Supabase Realtime Presence gives an authoritative viewer count.
   *  Presence is in-memory (no DB writes) — ideal for transient viewership.
   * ==========================================================================*/
  useEffect(() => {
    if (!streamId || isSeed || !user?.id) return;

    const channel = supabase.channel(`live_presence:${streamId}`, {
      config: { presence: { key: user.id } },
    });
    presenceChannelRef.current = channel;

    channel
      .on('presence', { event: 'sync' }, () => {
        const state = channel.presenceState();
        setViewerCount(Object.keys(state).length);
      })
      .subscribe(async (status) => {
        if (status === 'SUBSCRIBED') {
          await channel.track({
            joined_at: new Date().toISOString(),
            role: profile?.role,
          });
        }
      });

    return () => {
      supabase.removeChannel(channel);
      presenceChannelRef.current = null;
    };
  }, [streamId, isSeed, user?.id, profile?.role]);

  /* ==========================================================================
   *  SEED — keep the friendly simulated chatter for demo streams.
   * ==========================================================================*/
  useEffect(() => {
    if (!isSeed) return;

    const interval = setInterval(() => {
      const name = SIMULATED_NAMES[Math.floor(Math.random() * SIMULATED_NAMES.length)];
      const content = SIMULATED_MSGS[Math.floor(Math.random() * SIMULATED_MSGS.length)];
      const role = SIMULATED_ROLES[Math.floor(Math.random() * SIMULATED_ROLES.length)];

      const msg: StreamMessage = {
        id: `auto-${Date.now()}-${Math.random()}`,
        streamId,
        userId: `bot-${Math.random()}`,
        displayName: name,
        content,
        role: role as any,
        isHost: false,
        isModerator: Math.random() < 0.05,
        isSubscriber: Math.random() < 0.15,
        createdAt: new Date().toISOString(),
      };
      setMessages((prev) => [...prev.slice(-80), msg]);
    }, 2800 + Math.random() * 2200);

    return () => clearInterval(interval);
  }, [isSeed, streamId]);

  useEffect(() => {
    if (!isSeed) return;
    const interval = setInterval(() => {
      setViewerCount((v) => Math.max(1, v + Math.floor(Math.random() * 8 - 3)));
    }, 5000);
    return () => clearInterval(interval);
  }, [isSeed]);

  /* ==========================================================================
   *  SEED — simulated poll + pinned (demo streams only).
   * ==========================================================================*/
  useEffect(() => {
    if (!isSeed) return;

    const pollTimer = setTimeout(() => {
      setActivePoll({
        id: 'poll-1',
        streamId,
        question: 'What topic should we cover next?',
        options: [
          { id: 'p1', text: 'Night Shift Tips', votes: 45, percentage: 45 },
          { id: 'p2', text: 'Charge Nurse Duties', votes: 32, percentage: 32 },
          { id: 'p3', text: 'Travel Nursing Pay', votes: 23, percentage: 23 },
        ],
        totalVotes: 100,
        endsAt: new Date(Date.now() + 60000).toISOString(),
        isActive: true,
        createdBy: 'host',
      });
    }, 15000);

    const pinTimer = setTimeout(() => {
      setPinnedMessage({
        id: 'pin-1',
        streamId,
        content: 'New video dropping tomorrow — follow to get notified!',
        pinnedBy: 'host',
        pinnedByName: stream?.host.displayName ?? 'Host',
        createdAt: new Date().toISOString(),
      });
    }, 8000);

    return () => {
      clearTimeout(pollTimer);
      clearTimeout(pinTimer);
    };
  }, [isSeed, streamId, stream]);

  /* ==========================================================================
   *  REAL — load active poll + subscribe to vote / lifecycle updates.
   *  Also hydrates `hasVotedPoll` from `stream_poll_votes` so the widget
   *  shows results immediately for users who already voted in a past session.
   * ==========================================================================*/
  useEffect(() => {
    if (!streamId || isSeed) return;

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
  }, [streamId, isSeed, user?.id]);

  /* ==========================================================================
   *  REAL — load active pinned message + subscribe to pin/unpin events.
   * ==========================================================================*/
  useEffect(() => {
    if (!streamId || isSeed) return;

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
  }, [streamId, isSeed]);

  /* ==========================================================================
   *  Handlers
   * ==========================================================================*/
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

    // Seed streams don't have a DB row — simulation-only path.
    if (isSeed || !user?.id) return;

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
    } catch (err) {
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
    isSeed,
    showToast,
  ]);

  const handleSendGift = useCallback(
    async (gift: LiveGift, quantity: number) => {
      if (!user?.id) {
        showToast('Sign in to send gifts.', 'info');
        return;
      }

      setGiftSending(true);

      // ---- Seed stream path (fully local) -----------------------------------
      if (isSeed) {
        const event: LiveGiftEvent = {
          id: `mygift-${Date.now()}`,
          streamId,
          gift,
          senderId: user.id,
          senderName: profile?.displayName ?? 'You',
          quantity,
          comboCount: 1,
          createdAt: new Date().toISOString(),
        };
        if (gift.coinCost > 0) {
          setCoinBalance((b) => Math.max(0, b - gift.coinCost * quantity));
        }
        const giftMsg: StreamMessage = {
          id: `mygiftmsg-${Date.now()}`,
          streamId,
          userId: user.id,
          displayName: profile?.displayName ?? 'You',
          content: '',
          isHost: false,
          isModerator: false,
          createdAt: new Date().toISOString(),
          messageType: 'gift',
          giftData: event,
        };
        setMessages((prev) => [...prev, giftMsg]);
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        setTimeout(() => {
          setGiftSending(false);
          setShowGiftPicker(false);
        }, 500);
        return;
      }

      // ---- Real stream path -------------------------------------------------
      // Optimistic: debit balance immediately. Rollback if the RPC throws.
      const totalCost = gift.coinCost * quantity;
      if (totalCost > 0) {
        setCoinBalance((b) => Math.max(0, b - totalCost));
      }

      try {
        await streamGiftsService.send({
          streamId,
          senderId: user.id,
          gift,
          quantity,
        });
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      } catch (err: any) {
        // Rollback on failure.
        if (totalCost > 0) setCoinBalance((b) => b + totalCost);
        showToast(
          err?.message?.toLowerCase().includes('insufficient')
            ? 'Not enough coins. Top up to keep sending.'
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
    [isSeed, streamId, user?.id, profile?.displayName, showToast],
  );

  const handleToggleFollow = useCallback(async () => {
    if (!user?.id || !stream?.host.id) return;
    if (user.id === stream.host.id) return;

    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);

    // Optimistic flip.
    const nextFollowing = !isFollowing;
    setCreatorFollowed(stream.host.id, nextFollowing);

    // Seed streams are demo-only — don't persist.
    if (isSeed) return;

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
  }, [user?.id, stream?.host.id, isFollowing, isSeed, setCreatorFollowed, showToast]);

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

      // Seed streams don't have a DB row — optimistic-only.
      if (isSeed || !user?.id) return;

      try {
        const accepted = await streamPollsService.vote(activePoll.id, optionId, user.id);
        if (!accepted) {
          // User already voted (server said no) — keep their local state, it's
          // correct-ish. No toast needed; the widget is idempotent.
        }
        // The realtime subscription will surface the authoritative counts as
        // other viewers vote, so we don't need to refetch here.
      } catch (err) {
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
    [activePoll, isSeed, user?.id, showToast],
  );

  const handleUnpin = useCallback(async () => {
    if (!pinnedMessage) return;

    // Optimistic hide.
    const previous = pinnedMessage;
    setPinnedMessage(null);

    // Seed streams are local-only.
    if (isSeed) return;

    const ok = await streamPinsService.unpin(previous.id);
    if (!ok) {
      // Restore on failure.
      setPinnedMessage(previous);
      showToast('Couldn\u2019t unpin. Try again.', 'error');
    }
  }, [pinnedMessage, isSeed, showToast]);

  /* ────────────────────── Host controls ────────────────────── */

  /** Host-only: create and launch a new poll. */
  const handleCreatePoll = useCallback(
    async (input: {
      question: string;
      options: Array<{ id: string; text: string }>;
      durationSec: number;
    }) => {
      if (!isHost) return;

      // Seed streams skip the DB and just surface the poll locally so the
      // host can preview the widget shape in demo mode.
      if (isSeed) {
        setActivePoll({
          id: `local-poll-${Date.now()}`,
          streamId,
          question: input.question,
          options: input.options.map((o) => ({
            id: o.id,
            text: o.text,
            votes: 0,
            percentage: 0,
          })),
          totalVotes: 0,
          endsAt: new Date(Date.now() + input.durationSec * 1000).toISOString(),
          isActive: true,
          createdBy: user?.id ?? 'host',
        });
        setHasVotedPoll(false);
        setVotedOptionId(undefined);
        showToast('Poll launched (preview mode).', 'success');
        return;
      }

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
    [isHost, isSeed, streamId, user?.id, showToast],
  );

  /** Host-only: manually end the active poll early. */
  const handleEndPoll = useCallback(async () => {
    if (!isHost || !activePoll) return;

    const previous = activePoll;
    setActivePoll(null);
    setHasVotedPoll(false);
    setVotedOptionId(undefined);

    if (isSeed) return;

    const ok = await streamPollsService.end(previous.id);
    if (!ok) {
      // Restore on failure.
      setActivePoll(previous);
      showToast('Couldn\u2019t end poll. Try again.', 'error');
    }
  }, [isHost, activePoll, isSeed, showToast]);

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

              if (isSeed) return;

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
    [isHost, user?.id, profile?.displayName, pinnedMessage, isSeed, streamId, showToast],
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
              if (!isSeed) {
                const ok = await streamsLiveService.endStream(streamId);
                if (!ok) {
                  showToast('Couldn\u2019t end stream. Try again.', 'error');
                  setEndingStream(false);
                  return;
                }
              }
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
  }, [isHost, endingStream, isSeed, streamId, router, showToast]);

  if (isLoading || !stream) return <LoadingState />;

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <Image source={{ uri: stream.thumbnailUrl }} style={styles.streamBg} contentFit="cover" />
      <LinearGradient
        colors={['rgba(6,14,26,0.65)', 'rgba(6,14,26,0.2)', 'rgba(6,14,26,0.88)']}
        locations={[0, 0.35, 1]}
        style={StyleSheet.absoluteFill}
      />

      <View style={[styles.shell, { paddingTop: insets.top }]}>
        <View style={styles.topBar}>
          <TouchableOpacity onPress={() => router.back()} style={styles.iconBtn} accessibilityLabel="Back">
            <Ionicons name="chevron-back" size={22} color="#FFF" />
          </TouchableOpacity>

          <View style={styles.topCenter}>
            <View style={styles.liveBadge}>
              <View style={styles.livePulse} />
              <Text style={styles.liveText}>{streamIsLive ? 'LIVE' : stream.status.toUpperCase()}</Text>
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
            <TouchableOpacity onPress={() => setShowChat(!showChat)} style={styles.iconBtn} accessibilityLabel="Toggle chat">
              <Ionicons name={showChat ? 'chatbubble' : 'chatbubble-outline'} size={19} color="#FFF" />
            </TouchableOpacity>
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
            <Image source={{ uri: stream.host.avatarUrl }} style={styles.creatorAvatar} />
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
                <TouchableOpacity
                  style={styles.giftBtn}
                  onPress={() => {
                    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                    setShowGiftPicker(true);
                  }}
                  activeOpacity={0.75}
                  accessibilityLabel="Send a gift"
                >
                  <Ionicons name="gift-outline" size={18} color={colors.dark.textMuted} />
                </TouchableOpacity>
              )}

              <TextInput
                style={styles.chatInput}
                placeholder={isHost ? 'Talk to your viewers\u2026' : 'Message the room\u2026'}
                placeholderTextColor={colors.dark.textQuiet}
                value={inputText}
                onChangeText={setInputText}
                onSubmitEditing={sendMessage}
                returnKeyType="send"
                maxLength={STREAM_CHAT_MAX_LENGTH}
              />

              <TouchableOpacity onPress={sendMessage} style={styles.sendBtn} activeOpacity={0.85}>
                <Ionicons name="arrow-up" size={20} color={colors.dark.bg} />
              </TouchableOpacity>
            </View>
          </View>
        )}
      </View>

      <GiftPicker
        visible={showGiftPicker}
        coinBalance={coinBalance}
        onSendGift={handleSendGift}
        onClose={() => setShowGiftPicker(false)}
        onBuyCoins={coinWallet ? () => setCoinShopVisible(true) : undefined}
        sending={giftSending}
      />

      {coinWallet ? (
        <CoinShopModal
          visible={coinShopVisible}
          userId={user?.id}
          currentBalance={coinBalance}
          onClose={() => setCoinShopVisible(false)}
          onPurchased={(next) => setCoinBalance(next)}
        />
      ) : null}

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
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#000' },
  streamBg: { ...StyleSheet.absoluteFillObject },
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
  chatInput: {
    flex: 1,
    backgroundColor: 'rgba(15,28,48,0.88)',
    borderRadius: borderRadius.full,
    paddingHorizontal: 16,
    paddingVertical: Platform.OS === 'ios' ? 11 : 9,
    color: colors.neutral.white,
    fontSize: 14,
    lineHeight: 20,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
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
