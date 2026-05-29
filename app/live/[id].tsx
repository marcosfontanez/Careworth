import React, { useState, useEffect, useCallback, useMemo, useRef, Suspense, lazy } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Platform,
  Alert,
  Share,
  BackHandler,
} from 'react-native';
import { Image } from 'expo-image';
import { useLocalSearchParams, useRouter, Redirect } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import * as Haptics from 'expo-haptics';
import { useQueryClient } from '@tanstack/react-query';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import { useStream } from '@/hooks/useQueries';
import { useAuth } from '@/contexts/AuthContext';
import { useAppStore } from '@/store/useAppStore';
import { LoadingState } from '@/components/ui/LoadingState';
import { pulseImageFeedHeroProps } from '@/lib/pulseImage';
import { GiftLeaderboard } from '@/components/live/GiftLeaderboard';
import { HostPollCreator } from '@/components/live/HostPollCreator';
import { creatorLiveGiftToStreamMessage, giftCatalogById } from '@/lib/gifts';
import { HostLiveStudio } from '@/components/live/studio/HostLiveStudio';
import { LiveStage } from '@/components/live/studio/LiveStage';
import { ViewerLivePlayer } from '@/components/live/viewer/ViewerLivePlayer';
import { ViewerLiveStateScreen } from '@/components/live/viewer/ViewerLiveStateScreen';
import {
  streamMessagesService,
  streamPollsService,
  streamPinsService,
  streamQuestionsService,
  streamClipMarkersService,
  streamsLiveService,
  profilesService,
} from '@/services/supabase';
import type { StreamQuestion } from '@/services/supabase/streamQuestions';
import type { LiveClipMarker } from '@/services/supabase/streamClipMarkers';
import { CLIP_RECORDING_UNAVAILABLE, friendlyClipMarkerError, formatClipMarkerTime } from '@/lib/live/clipMarkerErrors';
import { friendlyLiveClipSettingsError } from '@/lib/live/liveClipSettingsErrors';
import {
  DEFAULT_CLIP_MARKER_DURATION,
  normalizeClipMarkerDuration,
  type ClipMarkerDurationSeconds,
} from '@/lib/live/clipMarkerDuration';
import type { StreamHealthSnapshot } from '@/components/live/studio/LiveStreamHealthPanel';
import { buildStreamHealthSnapshot } from '@/lib/live/streamHealth';
import { canModifyLivePins, livePinBlockedMessage } from '@/lib/live/livePinGuards';
import { isLiveSceneMode, type LiveSceneMode } from '@/lib/live/liveSceneMode';
import { liveCreatorGiftsService } from '@/services/gifts/liveCreatorGifts';
import { useToast } from '@/components/ui/Toast';
import { KeyboardAwareRoot } from '@/components/ui/KeyboardAwareRoot';
import { isSeedStream } from '@/lib/liveSeedStreams';
import { isDemoLiveStreamId } from '@/lib/liveDemoStreams';
import { DemoLiveViewer } from '@/components/live/demo';
import { isFeatureEnabled } from '@/lib/featureFlags';
import { STREAM_CHAT_MAX_LENGTH } from '@/constants';
import { colors, borderRadius, typography } from '@/theme';
import { useShopCatalog } from '@/hooks/useShopEconomy';
import { shopKeys } from '@/lib/shop/queryKeys';
import { liveHighlightsHref } from '@/lib/navigation/liveRoutes';
import type {
  StreamMessage,
  StreamPinnedMessage,
  StreamPoll,
  StreamGiftLeaderboard,
} from '@/types';
import { videoProvider } from '@/services/live/videoProvider';
import { isExpoGo } from '@/lib/expoRuntime';

/** Loaded only when real LiveKit video is shown — keeps Expo Go from requiring WebRTC native code at bundle parse time. */
const LiveKitStageLazy = lazy(() =>
  import('@/components/live/LiveKitStage').then((m) => ({ default: m.LiveKitStage })),
);
import { analytics } from '@/lib/analytics';
import { liveEndStreamDebug } from '@/lib/live/liveEndStreamDebug';
import { startLiveRecording, stopLiveRecording } from '@/services/live/liveRecordings';
import { isLiveClipEgressEnabled } from '@/lib/live/liveClipEgress';
import { friendlyLivePollError } from '@/lib/live/liveInteractionDebug';
import { isStreamActiveForDiscovery } from '@/lib/live/activeLiveStreams';
import { friendlyLiveKitJoinError } from '@/lib/live/liveKitJoinErrors';
import { liveKitJoinDebug } from '@/lib/live/liveKitJoinDebug';
import { pruneStreamFromLiveDiscovery } from '@/lib/live/pruneLiveDiscoveryCache';
import { ReportModal } from '@/components/ui/ReportModal';
import { messagesService } from '@/services/supabase/messages';
import { liveStreamGiftsEnabled } from '@/types/liveHub';
import { useLiveKitSession, LIVEKIT_TOKEN_REFRESH_BUFFER_SEC } from '@/hooks/useLiveKitSession';

import { getBlockRelationship } from '@/services/supabase/blocks';

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

  const catalogQ = useShopCatalog();
  const giftCatalogMap = useMemo(
    () => giftCatalogById(catalogQ.data ?? []),
    [catalogQ.data],
  );

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

  const canModifyPins = canModifyLivePins({
    isHost,
    streamIsLive,
    endedAt: stream?.endedAt,
  });

  const streamStaleForViewers =
    !isHost &&
    !!stream &&
    stream.status === 'live' &&
    Boolean(stream.broadcastStartedAt) &&
    !isStreamActiveForDiscovery(stream);

  const liveKitEnabled = videoProvider.id === 'livekit';

  /** Host modal visibility + end-stream busy flag. */
  const [hostPollVisible, setHostPollVisible] = useState(false);
  const [endingStream, setEndingStream] = useState(false);
  const endingStreamRef = useRef(false);
  const endStreamAlertOpenRef = useRef(false);
  const hostLeaveAlertOpenRef = useRef(false);
  const hostLeaveConfirmedRef = useRef(false);
  const navigation = useNavigation();
  useEffect(() => {
    endingStreamRef.current = endingStream;
  }, [endingStream]);
  const [reportOpen, setReportOpen] = useState(false);
  const [reportMessageOpen, setReportMessageOpen] = useState(false);
  const [reportMessageId, setReportMessageId] = useState<string | null>(null);
  const [promoting, setPromoting] = useState(false);
  const [demoContinuing, setDemoContinuing] = useState(false);
  const [reminderOn, setReminderOn] = useState(false);
  const [liveChatBlocked, setLiveChatBlocked] = useState(false);

  const allowViewerLiveKit =
    !isHost && broadcastLive && !streamStaleForViewers && Boolean(stream?.livekitRoomName?.trim());
  const allowHostLiveKit = isHost && stream?.status === 'live';
  const liveKitSessionEnabled =
    liveKitEnabled &&
    !!stream &&
    !!streamId &&
    !!user?.id &&
    (allowViewerLiveKit || allowHostLiveKit) &&
    !endingStream;

  const [lkRoomError, setLkRoomError] = useState<string | null>(null);

  const {
    token: lkToken,
    serverUrl: lkServerUrl,
    roomName: lkRoomName,
    participantIdentity: lkParticipantIdentity,
    error: lkError,
    sessionKey: lkSessionKey,
    expiresAt: lkExpiresAt,
    remint: remintLiveKit,
  } = useLiveKitSession({
    streamId,
    enabled: liveKitSessionEnabled,
    isHost,
    userId: user?.id,
    streamStatus: stream?.status ?? null,
    broadcastStartedAt: stream?.broadcastStartedAt ?? null,
    endedAt: stream?.endedAt ?? null,
    hostLastSeenAt: stream?.hostLastSeenAt ?? null,
    livekitRoomName: stream?.livekitRoomName ?? null,
    onJoined: () => analytics.track('live_stream_joined', { stream_id: streamId }),
    onRefreshFailed: () => {
      setLkReconnecting(true);
      showToast('Live video reconnecting\u2026', 'info');
    },
  });

  useEffect(() => {
    if (!lkError) setLkRoomError(null);
  }, [lkError]);

  useFocusEffect(
    useCallback(() => {
      if (!isHost && liveKitSessionEnabled) {
        setLkRoomError(null);
        const nowSec = Math.floor(Date.now() / 1000);
        const tokenStale =
          lkExpiresAt != null &&
          lkExpiresAt - LIVEKIT_TOKEN_REFRESH_BUFFER_SEC.viewer <= nowSec;
        if (!lkToken || lkError || tokenStale) {
          remintLiveKit();
        }
      }
      return undefined;
    }, [isHost, liveKitSessionEnabled, remintLiveKit, lkToken, lkError, lkExpiresAt]),
  );

  /* ---------------- Followed set (hydrated from store) ------------------- */
  const followedCreatorIds = useAppStore((s) => s.followedCreatorIds);
  const setCreatorFollowed = useAppStore((s) => s.setCreatorFollowed);
  const isFollowing = stream ? followedCreatorIds.has(stream.host.id) : false;

  /* ---------------- Messages (real or simulated) ------------------------- */
  const [messages, setMessages] = useState<StreamMessage[]>(DEFAULT_CHAT);
  const [inputText, setInputText] = useState('');
  const [sceneMode, setSceneMode] = useState<LiveSceneMode>('live');
  const [sceneChanging, setSceneChanging] = useState(false);
  const [questions, setQuestions] = useState<StreamQuestion[]>([]);
  const [qnaBackendReady, setQnaBackendReady] = useState(true);
  const [qnaLoading, setQnaLoading] = useState(false);
  const [questionSubmitting, setQuestionSubmitting] = useState(false);
  const [clipMarkers, setClipMarkers] = useState<LiveClipMarker[]>([]);
  const [clipMarkersLoading, setClipMarkersLoading] = useState(false);
  const [clipMarkersBackendReady, setClipMarkersBackendReady] = useState(true);
  const [recordingActive, setRecordingActive] = useState(false);
  const [markMomentLoading, setMarkMomentLoading] = useState(false);
  const [clipMomentLoading, setClipMomentLoading] = useState(false);
  const [reviewingMarkerId, setReviewingMarkerId] = useState<string | null>(null);
  const [togglingClipSetting, setTogglingClipSetting] = useState<
    'viewer_clips' | 'require_approval' | 'downloads' | null
  >(null);
  const brbMode = sceneMode === 'brb';
  const pinnedQuestion = useMemo(
    () => questions.find((q) => q.status === 'pinned') ?? null,
    [questions],
  );
  const [realtimeHealth, setRealtimeHealth] = useState({
    chat: false,
    polls: false,
    pins: false,
    gifts: false,
    stream: false,
    questions: false,
  });
  const markRealtime = useCallback((key: keyof typeof realtimeHealth) => {
    setRealtimeHealth((prev) => (prev[key] ? prev : { ...prev, [key]: true }));
  }, []);
  const [flipCameraNonce, setFlipCameraNonce] = useState(0);
  const [hostMicMuted, setHostMicMuted] = useState(false);
  const [viewerAudioMuted, setViewerAudioMuted] = useState(false);
  const [hostMicPermissionDenied, setHostMicPermissionDenied] = useState(false);
  const [hostAudioPublished, setHostAudioPublished] = useState<boolean | null>(null);
  const [hostCameraGranted, setHostCameraGranted] = useState<boolean | null>(null);
  const [lkRoomConnected, setLkRoomConnected] = useState(false);
  const [lkReconnecting, setLkReconnecting] = useState(false);
  const [lastLocalHeartbeatAt, setLastLocalHeartbeatAt] = useState<string | null>(null);
  const [healthRefreshing, setHealthRefreshing] = useState(false);

  /* ---------------- Gifts / Sparks / leaderboard -------------------------- */
  const [showLeaderboard, setShowLeaderboard] = useState(false);
  const [chatSending, setChatSending] = useState(false);
  const [pollVoting, setPollVoting] = useState(false);
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
      void streamsLiveService.leaveAttendance(streamId);
    };
  }, [streamId, user?.id, broadcastLive, isHost, queryClient]);

  /** Host liveness ping — stale streams drop out of Happening Now after crash/disconnect. */
  useEffect(() => {
    if (!streamId || !isHost || !broadcastLive || endingStream) return;
    const tick = async () => {
      const ok = await streamsLiveService.touchHostHeartbeat(streamId);
      if (ok) setLastLocalHeartbeatAt(new Date().toISOString());
    };
    void tick();
    const iv = setInterval(tick, 30_000);
    return () => clearInterval(iv);
  }, [streamId, isHost, broadcastLive, endingStream]);

  /** Viewer polls while waiting for host broadcast_started_at (no LiveKit token yet). */
  useEffect(() => {
    if (!streamId || isHost || stream?.status !== 'live' || stream.broadcastStartedAt) return;
    const iv = setInterval(() => {
      void queryClient.invalidateQueries({ queryKey: ['stream', streamId] });
    }, 4000);
    return () => clearInterval(iv);
  }, [streamId, isHost, stream?.status, stream?.broadcastStartedAt, queryClient]);

  /** Realtime stream row updates — ended state + broadcast_started_at without polling. */
  useEffect(() => {
    if (stream?.sceneMode && isLiveSceneMode(stream.sceneMode)) {
      setSceneMode(stream.sceneMode);
    }
  }, [stream?.sceneMode]);

  useEffect(() => {
    if (!streamId) return;
    return streamsLiveService.subscribeStatus(streamId, (row) => {
      markRealtime('stream');
      if (row.scene_mode && isLiveSceneMode(row.scene_mode)) {
        setSceneMode(row.scene_mode);
      }
      if (row.status === 'ended' || row.ended_at) {
        pruneStreamFromLiveDiscovery(queryClient, streamId);
      }
      void queryClient.invalidateQueries({ queryKey: ['stream', streamId] });
      void queryClient.invalidateQueries({ queryKey: ['streams', 'live'] });
      void queryClient.invalidateQueries({ queryKey: ['liveHub'] });
    });
  }, [streamId, queryClient]);

  /** Blocked users cannot post in the host's live chat (RLS + client guard). */
  useEffect(() => {
    if (!user?.id || !stream?.host.id || isHost) {
      setLiveChatBlocked(false);
      return;
    }
    let cancelled = false;
    void getBlockRelationship(user.id, stream.host.id).then((rel) => {
      if (!cancelled) setLiveChatBlocked(rel !== 'none');
    });
    return () => {
      cancelled = true;
    };
  }, [user?.id, stream?.host.id, isHost]);

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
      markRealtime('chat');
      setMessages((prev) => {
        // Ignore dupes — sender optimistically appends, then realtime echoes it.
        if (prev.some((m) => m.id === msg.id)) return prev;
        return [...prev.slice(-199), msg];
      });
    });

    const unsubscribeDeletes = streamMessagesService.subscribeDeletes(streamId, (messageId) => {
      setMessages((prev) => prev.filter((m) => m.id !== messageId));
    });

    return () => {
      cancelled = true;
      unsubscribe();
      unsubscribeDeletes();
    };
  }, [streamId]);

  /* ==========================================================================
   *  REAL — shop creator gift firehose + DB-backed leaderboard hydrate.
   * ==========================================================================*/
  useEffect(() => {
    if (!streamId) return;

    let cancelled = false;
    void liveCreatorGiftsService.fetchLeaderboard(streamId).then((rows) => {
      if (!cancelled && rows.length > 0) setLeaderboard(rows);
    });

    const unsubscribe = liveCreatorGiftsService.subscribe(streamId, (event) => {
      markRealtime('gifts');
      try {
        if (!event?.id) return;
        const shopItem = giftCatalogMap.get(event.giftItemId) ?? null;
        const giftMsg = creatorLiveGiftToStreamMessage(
          shopItem ? { ...event, shopItem } : event,
          shopItem,
        );
        setMessages((prev) => [...prev.slice(-199), giftMsg]);

        setLeaderboard((prev) => {
          const existing = prev.find((l) => l.userId === event.senderId);
          const next = existing
            ? prev.map((l) =>
                l.userId === event.senderId
                  ? {
                      ...l,
                      totalSparks: l.totalSparks + event.sparksSpent,
                      giftCount: l.giftCount + 1,
                    }
                  : l,
              )
            : [
                ...prev,
                {
                  userId: event.senderId,
                  displayName: event.senderName,
                  avatarUrl: event.senderAvatar,
                  totalSparks: event.sparksSpent,
                  giftCount: 1,
                  rank: prev.length + 1,
                },
              ];
          return next
            .sort((a, b) => b.totalSparks - a.totalSparks)
            .map((l, i) => ({ ...l, rank: i + 1 }));
        });
      } catch (err) {
        if (__DEV__) console.warn('[live] creator gift realtime', err);
      }
    });

    return () => {
      cancelled = true;
      unsubscribe();
    };
  }, [streamId, giftCatalogMap]);

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
      markRealtime('polls');
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
      markRealtime('pins');
      setPinnedMessage(pin);
    });

    return () => {
      cancelled = true;
      unsubscribe();
    };
  }, [streamId]);

  /* ==========================================================================
   *  REAL — Q&A queue (migration 202). Graceful no-op if table missing.
   * ==========================================================================*/
  useEffect(() => {
    if (!streamId) return;
    let cancelled = false;

    const refresh = async () => {
      setQnaLoading(true);
      try {
        const ready = await streamQuestionsService.isBackendReady();
        if (!cancelled) setQnaBackendReady(ready);
        if (!ready) {
          if (!cancelled) setQuestions([]);
          return;
        }
        const rows = isHost
          ? await streamQuestionsService.listForHost(streamId)
          : await streamQuestionsService.listForStream(streamId);
        if (!cancelled) setQuestions(rows);
      } catch {
        if (!cancelled) {
          setQnaBackendReady(false);
          setQuestions([]);
        }
      } finally {
        if (!cancelled) setQnaLoading(false);
      }
    };

    void refresh();
    const unsubscribe = streamQuestionsService.subscribe(streamId, () => {
      markRealtime('questions');
      void refresh();
    });

    return () => {
      cancelled = true;
      unsubscribe();
    };
  }, [streamId, isHost]);

  /* ==========================================================================
   *  REAL — clip markers (migration 206). Host list + active recording probe.
   * ==========================================================================*/
  useEffect(() => {
    if (!streamId || !isHost) return;
    let cancelled = false;

    const refreshRecording = async () => {
      const active = await streamClipMarkersService.hasActiveRecording(streamId);
      if (!cancelled) setRecordingActive(active);
    };

    const refreshMarkers = async () => {
      setClipMarkersLoading(true);
      try {
        const ready = await streamClipMarkersService.isBackendReady();
        if (!cancelled) setClipMarkersBackendReady(ready);
        if (!ready) {
          if (!cancelled) setClipMarkers([]);
          return;
        }
        const rows = await streamClipMarkersService.listForHost(streamId);
        if (!cancelled) setClipMarkers(rows);
      } catch {
        if (!cancelled) {
          setClipMarkersBackendReady(false);
          setClipMarkers([]);
        }
      } finally {
        if (!cancelled) setClipMarkersLoading(false);
      }
    };

    void refreshRecording();
    void refreshMarkers();
    const recordingIv = setInterval(() => void refreshRecording(), 30_000);
    const unsubscribe = streamClipMarkersService.subscribe(streamId, () => {
      void refreshMarkers();
    });

    return () => {
      cancelled = true;
      clearInterval(recordingIv);
      unsubscribe();
    };
  }, [streamId, isHost, broadcastLive]);

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
    setLkRoomConnected(true);
    setLkReconnecting(false);
    if (!isHost || !streamId) return;
    liveKitJoinDebug.connected({
      streamId,
      roomName: lkRoomName ?? stream?.livekitRoomName ?? null,
      userId: user?.id ?? null,
      role: 'host',
    });
  }, [isHost, streamId, lkRoomName, stream?.livekitRoomName, user?.id]);

  const handleRefreshHealth = useCallback(async () => {
    if (healthRefreshing || !streamId) return;
    setHealthRefreshing(true);
    try {
      await queryClient.invalidateQueries({ queryKey: ['stream', streamId] });
      if (isHost && broadcastLive) {
        const ok = await streamsLiveService.touchHostHeartbeat(streamId);
        if (ok) setLastLocalHeartbeatAt(new Date().toISOString());
      }
    } catch (err) {
      if (__DEV__) console.warn('[live.handleRefreshHealth]', err);
    } finally {
      setHealthRefreshing(false);
    }
  }, [healthRefreshing, streamId, queryClient, isHost, broadcastLive]);

  const handleHostBroadcastReady = useCallback(async () => {
    if (!isHost || !streamId) return;
    try {
      const ok = await streamsLiveService.markBroadcastStarted(streamId);
      liveKitJoinDebug.broadcastMarked({ streamId, ok });
      if (ok) {
        if (isLiveClipEgressEnabled()) {
          void startLiveRecording(streamId);
        }
        analytics.track('live_stream_started', { stream_id: streamId });
        await queryClient.invalidateQueries({ queryKey: ['stream', streamId] });
        await queryClient.invalidateQueries({ queryKey: ['streams', 'live'] });
        await queryClient.invalidateQueries({ queryKey: ['liveHub'] });
      } else if (__DEV__) {
        console.warn('[live.handleHostBroadcastReady] markBroadcastStarted returned false');
      }
    } catch (err) {
      if (__DEV__) console.warn('[live.handleHostBroadcastReady]', err);
    }
  }, [isHost, streamId, queryClient]);

  const handleSceneModeChange = useCallback(
    async (mode: LiveSceneMode) => {
      if (sceneChanging) return;
      if (mode === 'poll' && !activePoll?.isActive) {
        showToast('Launch a poll first to use Poll Mode.', 'info');
        return;
      }
      const prev = sceneMode;
      setSceneMode(mode);
      if (!isHost || !streamId) return;
      setSceneChanging(true);
      try {
        const ok = await streamsLiveService.setSceneMode(streamId, mode);
        if (!ok) {
          setSceneMode(prev);
          showToast(
            mode === 'poll'
              ? 'Poll Mode requires migration 203 (and 202). Scene saved locally only.'
              : 'Scene saved locally only — run migrations 202–203 to sync viewers.',
            'info',
          );
        }
      } catch (err) {
        setSceneMode(prev);
        if (__DEV__) console.warn('[live.handleSceneModeChange]', err);
        showToast('Could not update scene.', 'error');
      } finally {
        setSceneChanging(false);
      }
    },
    [isHost, sceneMode, sceneChanging, activePoll?.isActive, showToast, streamId],
  );

  useEffect(() => {
    if (!isHost || sceneMode !== 'poll') return;
    if (!activePoll?.isActive) {
      void handleSceneModeChange('live');
    }
  }, [isHost, sceneMode, activePoll?.isActive, handleSceneModeChange]);

  const handleSubmitQuestion = useCallback(
    async (question: string): Promise<boolean> => {
      if (!user?.id || !streamId || questionSubmitting) return false;
      if (stream?.status !== 'live' || stream?.endedAt) {
        showToast('This stream has ended.', 'info');
        return false;
      }
      if (!broadcastLive) {
        showToast('Questions open when the host is live.', 'info');
        return false;
      }
      if (!qnaBackendReady) {
        showToast('Q&A requires migration 202.', 'info');
        return false;
      }
      setQuestionSubmitting(true);
      try {
        const row = await streamQuestionsService.submit({
          streamId,
          userId: user.id,
          authorName: profile?.displayName ?? user.email?.split('@')[0] ?? 'Viewer',
          question,
        });
        if (row) {
          setQuestions((prev) => [row, ...prev].slice(0, 50));
          return true;
        }
        showToast('Could not submit question. Try again.', 'error');
        return false;
      } catch (err) {
        if (__DEV__) console.warn('[live.handleSubmitQuestion]', err);
        showToast('Could not submit question. Try again.', 'error');
        return false;
      } finally {
        setQuestionSubmitting(false);
      }
    },
    [
      user?.id,
      user?.email,
      profile?.displayName,
      streamId,
      stream?.status,
      stream?.endedAt,
      broadcastLive,
      questionSubmitting,
      qnaBackendReady,
      showToast,
    ],
  );

  const handleMarkMoment = useCallback(async () => {
    if (!streamId || markMomentLoading) return;
    if (stream?.status !== 'live' || stream?.endedAt) {
      showToast('This stream has ended.', 'info');
      return;
    }
    if (!broadcastLive) {
      showToast('Go live before marking moments.', 'info');
      return;
    }
    if (!clipMarkersBackendReady) {
      showToast('Clip markers require migration 206.', 'info');
      return;
    }
    if (!isLiveClipEgressEnabled()) {
      showToast('Live clip recording is not enabled for this build.', 'info');
      return;
    }
    setMarkMomentLoading(true);
    try {
      const result = await streamClipMarkersService.createMarker(
        streamId,
        'host',
        DEFAULT_CLIP_MARKER_DURATION,
      );
      if (result.ok && result.marker) {
        const rows = await streamClipMarkersService.listForHost(streamId);
        setClipMarkers(rows);
        showToast(
          `Moment marked at ${formatClipMarkerTime(result.marker.markerTimeSeconds)} (${formatClipMarkerTime(result.marker.startSeconds)}–${formatClipMarkerTime(result.marker.endSeconds)})`,
          'success',
        );
        return;
      }
      showToast(friendlyClipMarkerError(result.code), 'error');
    } catch (err) {
      if (__DEV__) console.warn('[live.handleMarkMoment]', err);
      showToast('Could not mark moment. Try again.', 'error');
    } finally {
      setMarkMomentLoading(false);
    }
  }, [
    streamId,
    markMomentLoading,
    stream?.status,
    stream?.endedAt,
    broadcastLive,
    clipMarkersBackendReady,
    showToast,
  ]);

  const handleClipMoment = useCallback(async (duration?: ClipMarkerDurationSeconds): Promise<boolean> => {
    if (!user?.id || !streamId || clipMomentLoading) return false;
    if (stream?.status !== 'live' || stream?.endedAt) {
      showToast('This stream has ended.', 'info');
      return false;
    }
    if (!broadcastLive) {
      showToast('Clip moments open when the host is live.', 'info');
      return false;
    }
    if (!stream?.viewerClipsAllowed) {
      showToast('The host has not enabled viewer clips for this stream.', 'info');
      return false;
    }
    if (!clipMarkersBackendReady) {
      showToast('Clip markers require migration 206.', 'info');
      return false;
    }

    const clipDuration = normalizeClipMarkerDuration(duration);
    if (__DEV__) {
      console.log('[live.handleClipMoment] saving marker', { streamId, clipDuration });
    }

    setClipMomentLoading(true);
    try {
      const result = await streamClipMarkersService.createMarker(streamId, 'viewer', clipDuration);
      if (result.ok) {
        const windowLabel =
          result.marker != null
            ? `${formatClipMarkerTime(result.marker.startSeconds)}–${formatClipMarkerTime(result.marker.endSeconds)}`
            : null;
        const pendingNote = stream?.requireHostApproval !== false
          ? 'The host will review it before Clip Studio processing.'
          : 'It is queued for the host in Clip Studio — nothing publishes automatically.';
        showToast(
          windowLabel
            ? `Clip marker saved (${windowLabel}). ${pendingNote}`
            : `Clip marker saved. ${pendingNote}`,
          'success',
        );
        return true;
      }
      if (result.code === 'recording_not_active') {
        showToast(CLIP_RECORDING_UNAVAILABLE, 'info');
        return false;
      }
      showToast(friendlyClipMarkerError(result.code), 'error');
      return false;
    } catch (err) {
      if (__DEV__) console.warn('[live.handleClipMoment]', err);
      showToast('Could not submit clip moment. Try again.', 'error');
      return false;
    } finally {
      setClipMomentLoading(false);
    }
  }, [
    user?.id,
    streamId,
    clipMomentLoading,
    stream?.status,
    stream?.endedAt,
    stream?.viewerClipsAllowed,
    stream?.requireHostApproval,
    broadcastLive,
    clipMarkersBackendReady,
    showToast,
  ]);

  const handleReviewMarker = useCallback(
    async (markerId: string, decision: 'approved' | 'rejected') => {
      if (reviewingMarkerId) return;
      setReviewingMarkerId(markerId);
      try {
        const result = await streamClipMarkersService.reviewMarker(markerId, decision);
        if (result.ok) {
          showToast(
            decision === 'approved' ? 'Submission approved.' : 'Submission rejected.',
            'success',
          );
        } else {
          showToast('Could not update submission.', 'error');
        }
      } catch (err) {
        if (__DEV__) console.warn('[live.handleReviewMarker]', err);
        showToast('Could not update submission.', 'error');
      } finally {
        setReviewingMarkerId(null);
      }
    },
    [reviewingMarkerId, showToast],
  );

  const handleUpdateClipSettings = useCallback(
    async (
      patch: {
        viewerClipsAllowed?: boolean;
        requireHostApproval?: boolean;
        allowClipDownloads?: boolean;
      },
      settingKey: 'viewer_clips' | 'require_approval' | 'downloads',
    ) => {
      if (!streamId || togglingClipSetting) return;

      if (patch.viewerClipsAllowed !== undefined) {
        if (stream?.status !== 'live' || stream?.endedAt) {
          showToast('Viewer clips can only be changed during a live stream.', 'info');
          return;
        }
      }

      if (
        patch.requireHostApproval !== undefined ||
        patch.allowClipDownloads !== undefined
      ) {
        if (stream?.status !== 'live' && stream?.status !== 'ended') {
          showToast('Clip settings cannot be changed for this stream right now.', 'info');
          return;
        }
      }

      setTogglingClipSetting(settingKey);
      try {
        const result = await streamsLiveService.updateClipSettings(streamId, patch);
        if (!result.ok) {
          showToast(friendlyLiveClipSettingsError(result.code), 'error');
          return;
        }

        queryClient.setQueryData(['stream', streamId], (old: typeof stream) =>
          old
            ? {
                ...old,
                viewerClipsAllowed: result.viewerClipsAllowed ?? old.viewerClipsAllowed,
                requireHostApproval: result.requireHostApproval ?? old.requireHostApproval,
                allowClipDownloads: result.allowClipDownloads ?? old.allowClipDownloads,
              }
            : old,
        );

        if (patch.viewerClipsAllowed !== undefined) {
          showToast(
            patch.viewerClipsAllowed ? 'Viewers can submit clip moments.' : 'Viewer clip moments off.',
            'success',
          );
        } else if (patch.requireHostApproval !== undefined) {
          showToast(
            patch.requireHostApproval
              ? 'Viewer clips require your approval.'
              : 'Viewer clips skip approval — you still publish manually.',
            'success',
          );
        } else if (patch.allowClipDownloads !== undefined) {
          showToast(
            patch.allowClipDownloads ? 'Non-host downloads enabled.' : 'Non-host downloads disabled.',
            'success',
          );
        }
      } catch (err) {
        if (__DEV__) console.warn('[live.handleUpdateClipSettings]', err);
        showToast(friendlyLiveClipSettingsError('unknown'), 'error');
      } finally {
        setTogglingClipSetting(null);
      }
    },
    [streamId, togglingClipSetting, queryClient, showToast, stream],
  );

  const handleToggleViewerClips = useCallback(
    (allowed: boolean) => void handleUpdateClipSettings({ viewerClipsAllowed: allowed }, 'viewer_clips'),
    [handleUpdateClipSettings],
  );

  const handleToggleRequireHostApproval = useCallback(
    (required: boolean) =>
      void handleUpdateClipSettings({ requireHostApproval: required }, 'require_approval'),
    [handleUpdateClipSettings],
  );

  const handleToggleAllowClipDownloads = useCallback(
    (allowed: boolean) => void handleUpdateClipSettings({ allowClipDownloads: allowed }, 'downloads'),
    [handleUpdateClipSettings],
  );

  const handlePinQuestion = useCallback(
    async (questionId: string) => {
      if (!streamId) return;
      if (!canModifyPins) {
        showToast(livePinBlockedMessage(), 'info');
        return;
      }
      try {
        const ok = await streamQuestionsService.pinQuestion(streamId, questionId);
        showToast(ok ? 'Question pinned' : 'Could not pin question.', ok ? 'success' : 'error');
      } catch (err) {
        if (__DEV__) console.warn('[live.handlePinQuestion]', err);
        showToast('Could not pin question.', 'error');
      }
    },
    [streamId, canModifyPins, showToast],
  );

  const handleUnpinQuestion = useCallback(
    async (questionId: string) => {
      if (!streamId) return;
      if (!canModifyPins) {
        showToast(livePinBlockedMessage(), 'info');
        return;
      }
      try {
        const ok = await streamQuestionsService.unpinQuestion(streamId, questionId);
        showToast(ok ? 'Question unpinned' : 'Could not unpin question.', ok ? 'success' : 'error');
      } catch (err) {
        if (__DEV__) console.warn('[live.handleUnpinQuestion]', err);
        showToast('Could not unpin question.', 'error');
      }
    },
    [streamId, canModifyPins, showToast],
  );

  const handleMarkQuestionAnswered = useCallback(
    async (questionId: string) => {
      try {
        const ok = await streamQuestionsService.markAnswered(questionId);
        showToast(ok ? 'Question marked answered' : 'Could not update question.', ok ? 'success' : 'error');
      } catch (err) {
        if (__DEV__) console.warn('[live.handleMarkQuestionAnswered]', err);
        showToast('Could not update question.', 'error');
      }
    },
    [showToast],
  );

  const handleDismissQuestion = useCallback(
    async (questionId: string) => {
      try {
        const ok = await streamQuestionsService.dismiss(questionId);
        if (!ok) showToast('Could not dismiss question.', 'error');
      } catch (err) {
        if (__DEV__) console.warn('[live.handleDismissQuestion]', err);
      }
    },
    [showToast],
  );

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
    if (!body || chatSending) return;

    if (!user?.id) {
      showToast('Sign in to chat in live.', 'info');
      return;
    }

    if (!broadcastLive && !isHost) {
      showToast('Chat opens once the host is broadcasting.', 'info');
      return;
    }

    if (!streamIsLive || stream?.endedAt) {
      showToast('This live stream has ended.', 'info');
      return;
    }

    if (liveChatBlocked) {
      showToast('You can\u2019t message this live.', 'error');
      return;
    }

    setChatSending(true);
    setInputText('');

    const optimistic: StreamMessage = {
      id: `local-${Date.now()}`,
      streamId,
      userId: user.id,
      displayName: profile?.displayName?.trim() || 'You',
      avatarUrl: profile?.avatarUrl,
      role: profile?.role as any,
      content: body,
      isHost: stream?.host.id === user.id,
      isModerator: false,
      createdAt: new Date().toISOString(),
    };
    setMessages((prev) => [...prev, optimistic]);

    try {
      const result = await streamMessagesService.send({
        streamId,
        userId: user.id,
        displayName: profile?.displayName?.trim() || 'PulseVerse Member',
        avatarUrl: profile?.avatarUrl,
        role: profile?.role,
        content: body,
        isHost: stream?.host.id === user.id,
      });

      if (result.ok) {
        setMessages((prev) =>
          prev.map((m) => (m.id === optimistic.id ? result.message : m)),
        );
      } else {
        setMessages((prev) => prev.filter((m) => m.id !== optimistic.id));
        setInputText(body);
        showToast(result.friendly, 'error');
      }
    } catch (err: unknown) {
      setMessages((prev) => prev.filter((m) => m.id !== optimistic.id));
      setInputText(body);
      if (__DEV__) console.warn('[live.sendMessage]', err);
      showToast('Couldn\u2019t send message. Try again.', 'error');
    } finally {
      setChatSending(false);
    }
  }, [
    inputText,
    chatSending,
    streamId,
    user?.id,
    profile?.displayName,
    profile?.avatarUrl,
    profile?.role,
    stream?.host.id,
    liveChatBlocked,
    broadcastLive,
    isHost,
    streamIsLive,
    stream?.endedAt,
    showToast,
  ]);

  const handleGiftSent = useCallback(() => {
    analytics.track('live_gift_sent', { stream_id: streamId, surface: 'creator_gift_tray' });
    void queryClient.invalidateQueries({ queryKey: shopKeys.sparkWallet(user?.id) });
  }, [queryClient, streamId, user?.id]);

  const followInFlightRef = useRef(false);

  const handleToggleFollow = useCallback(async () => {
    if (!user?.id || !stream?.host.id) return;
    if (user.id === stream.host.id) return;
    if (followInFlightRef.current) return;

    followInFlightRef.current = true;
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
    } finally {
      followInFlightRef.current = false;
    }
  }, [user?.id, stream?.host.id, isFollowing, setCreatorFollowed, showToast]);

  const handlePollVote = useCallback(
    async (optionId: string) => {
      if (!activePoll || pollVoting) return;

      if (!user?.id) {
        showToast('Sign in to vote in polls.', 'info');
        return;
      }

      if (!broadcastLive && !isHost) {
        showToast('Polls unlock once the host is broadcasting.', 'info');
        return;
      }

      if (!streamIsLive || stream?.endedAt) {
        showToast('This live stream has ended.', 'info');
        return;
      }

      if (hasVotedPoll) return;

      const previousPoll = activePoll;
      const previousVoted = hasVotedPoll;
      const previousOptionId = votedOptionId;

      setPollVoting(true);
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
      try {
        await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      } catch {
        /* optional */
      }

      try {
        const result = await streamPollsService.vote(activePoll.id, optionId, user.id);
        if (!result.ok) {
          setHasVotedPoll(previousVoted);
          setVotedOptionId(previousOptionId);
          setActivePoll(previousPoll);
          showToast(
            result.friendly ?? friendlyLivePollError(result.reason),
            result.reason === 'already_voted' ? 'info' : 'error',
          );
        }
      } catch (err: unknown) {
        setHasVotedPoll(previousVoted);
        setVotedOptionId(previousOptionId);
        setActivePoll(previousPoll);
        if (__DEV__) console.warn('[live.handlePollVote]', err);
        showToast('Couldn\u2019t record vote. Try again.', 'error');
      } finally {
        setPollVoting(false);
      }
    },
    [activePoll, user?.id, hasVotedPoll, votedOptionId, broadcastLive, isHost, pollVoting, streamIsLive, stream?.endedAt, showToast],
  );

  const handleUnpin = useCallback(async () => {
    if (!pinnedMessage) return;
    if (!canModifyPins) {
      showToast(livePinBlockedMessage(), 'info');
      return;
    }

    // Optimistic hide.
    const previous = pinnedMessage;
    setPinnedMessage(null);

    const ok = await streamPinsService.unpin(previous.id);
    if (!ok) {
      // Restore on failure.
      setPinnedMessage(previous);
      showToast('Couldn\u2019t unpin. Try again.', 'error');
    }
  }, [pinnedMessage, canModifyPins, showToast]);

  /* ────────────────────── Host controls ────────────────────── */

  const pollCreatingRef = useRef(false);

  /** Host-only: create and launch a new poll. */
  const handleCreatePoll = useCallback(
    async (input: {
      question: string;
      options: { id: string; text: string }[];
      durationSec: number;
    }) => {
      if (!isHost || pollCreatingRef.current) return;

      pollCreatingRef.current = true;
      try {
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
          setHostPollVisible(false);
          showToast('Poll launched.', 'success');
        } else {
          showToast('Couldn\u2019t launch poll. Try again.', 'error');
        }
      } catch (err) {
        if (__DEV__) console.warn('[live.handleCreatePoll]', err);
        showToast('Couldn\u2019t launch poll. Try again.', 'error');
      } finally {
        pollCreatingRef.current = false;
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

  /** Host-only: pin a chat message (replaces any previous chat pin). */
  const pinChatMessage = useCallback(
    async (msg: StreamMessage) => {
      if (!isHost || !user?.id) return;
      if (!canModifyPins) {
        showToast(livePinBlockedMessage(), 'info');
        return;
      }

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
      } else {
        setPinnedMessage(persisted);
        showToast('Message pinned', 'success');
      }
    },
    [isHost, user?.id, profile?.displayName, pinnedMessage, streamId, canModifyPins, showToast],
  );

  /** Host-only: pin/unpin from chat row action. */
  const togglePinChatMessage = useCallback(
    (msg: StreamMessage) => {
      if (!msg.content.trim() || msg.messageType !== 'chat') return;
      const isPinnedRow =
        pinnedMessage && pinnedMessage.content.trim() === msg.content.trim();
      if (isPinnedRow) {
        void handleUnpin();
      } else {
        void pinChatMessage(msg);
      }
    },
    [pinnedMessage, handleUnpin, pinChatMessage],
  );

  /** Long-press chat row — host can pin/report; viewers can report others' messages. */
  const handleChatMessageLongPress = useCallback(
    (msg: StreamMessage) => {
      if (!msg.content.trim() || msg.messageType !== 'chat') return;

      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

      const isOwn = msg.userId === user?.id;
      const canReport = !isOwn && !!user?.id;

      if (isHost) {
        const isPinnedRow =
          pinnedMessage && pinnedMessage.content.trim() === msg.content.trim();
        Alert.alert(
          'Message actions',
          `"${msg.content.slice(0, 80)}${msg.content.length > 80 ? '\u2026' : ''}"`,
          [
            { text: 'Cancel', style: 'cancel' },
            {
              text: 'Remove',
              style: 'destructive',
              onPress: () => {
                void (async () => {
                  const ok = await streamMessagesService.softDelete(msg.id);
                  if (ok) {
                    setMessages((prev) => prev.filter((m) => m.id !== msg.id));
                    showToast('Message removed for everyone.', 'success');
                  } else {
                    showToast('Could not remove message.', 'error');
                  }
                })();
              },
            },
            ...(canReport
              ? [
                  {
                    text: 'Report',
                    onPress: () => {
                      setReportMessageId(msg.id);
                      setReportMessageOpen(true);
                    },
                  },
                ]
              : []),
            isPinnedRow
              ? {
                  text: 'Unpin',
                  onPress: () => {
                    void handleUnpin();
                  },
                }
              : {
                  text: 'Pin',
                  onPress: () => {
                    void pinChatMessage(msg);
                  },
                },
          ],
        );
        return;
      }

      if (canReport) {
        setReportMessageId(msg.id);
        setReportMessageOpen(true);
      }
    },
    [isHost, user?.id, pinChatMessage, pinnedMessage, handleUnpin, showToast],
  );

  /** Host-only: persist ended status, refresh discovery, route to post-stream summary. */
  const performEndStream = useCallback(async (): Promise<boolean> => {
    if (!isHost || endingStream) return false;
    liveEndStreamDebug.endRequested(streamId);
    endingStreamRef.current = true;
    setEndingStream(true);

    try {
      await stopLiveRecording(streamId);
      const result = await streamsLiveService.endStream(streamId);
      if (!result.ok) {
        liveEndStreamDebug.endFailed(streamId, result.reason);
        endingStreamRef.current = false;
        setEndingStream(false);
        showToast('Couldn\u2019t end stream. Try again.', 'error');
        return false;
      }

      liveEndStreamDebug.supabaseUpdated(streamId, result.reason);
      const endedAt = new Date().toISOString();
      queryClient.setQueryData(['stream', streamId], (old: typeof stream) =>
        old ? { ...old, status: 'ended' as const, endedAt, viewerCount: 0 } : old,
      );
      pruneStreamFromLiveDiscovery(queryClient, streamId);
      await queryClient.invalidateQueries({ queryKey: ['stream', streamId] });
      await queryClient.invalidateQueries({ queryKey: ['streams', 'live'] });
      await queryClient.invalidateQueries({ queryKey: ['liveHub'] });
      await queryClient.refetchQueries({ queryKey: ['liveHub'] });
      liveEndStreamDebug.happeningNowRefreshed(streamId);

      analytics.track('live_stream_ended', { stream_id: streamId });
      showToast('Stream ended. Great work.', 'success');
      router.replace(liveHighlightsHref(streamId));
      return true;
    } catch (err) {
      const reason = err instanceof Error ? err.message : 'unknown';
      liveEndStreamDebug.endFailed(streamId, reason);
      endingStreamRef.current = false;
      setEndingStream(false);
      showToast('Something went wrong. Try again.', 'error');
      return false;
    }
  }, [isHost, endingStream, streamId, router, showToast, queryClient, stream]);

  /** Host-only: end the stream and return to the Live tab. */
  const handleEndStream = useCallback(() => {
    if (!isHost || endingStream || endStreamAlertOpenRef.current) return;
    endStreamAlertOpenRef.current = true;

    Alert.alert(
      'End stream?',
      'Viewers will be notified the stream has ended.',
      [
        {
          text: 'Cancel',
          style: 'cancel',
          onPress: () => {
            endStreamAlertOpenRef.current = false;
          },
        },
        {
          text: 'End Stream',
          style: 'destructive',
          onPress: async () => {
            endStreamAlertOpenRef.current = false;
            await performEndStream();
          },
        },
      ],
    );
  }, [isHost, endingStream, performEndStream]);

  /**
   * Host back / leave while broadcasting — strongly prompt to end so we don't leave ghost lives.
   * `onLeave` runs after the host confirms leaving without ending (stream stays live until heartbeat timeout).
   */
  const promptHostLeaveWhileLive = useCallback(
    (onLeave: () => void) => {
      if (!isHost || !broadcastLive || endingStream) {
        onLeave();
        return;
      }
      if (hostLeaveAlertOpenRef.current) return;
      hostLeaveAlertOpenRef.current = true;

      Alert.alert(
        'Leave live stream?',
        'Your broadcast is still live. End it for everyone, or leave and it stays on until you reconnect or drop offline (~2 min).',
        [
          {
            text: 'Cancel',
            style: 'cancel',
            onPress: () => {
              hostLeaveAlertOpenRef.current = false;
            },
          },
          {
            text: 'Leave (keep live)',
            onPress: () => {
              hostLeaveAlertOpenRef.current = false;
              hostLeaveConfirmedRef.current = true;
              onLeave();
            },
          },
          {
            text: 'End stream',
            style: 'destructive',
            onPress: async () => {
              hostLeaveAlertOpenRef.current = false;
              await performEndStream();
            },
          },
        ],
      );
    },
    [isHost, broadcastLive, endingStream, performEndStream],
  );

  const handleHostBack = useCallback(() => {
    promptHostLeaveWhileLive(() => router.back());
  }, [promptHostLeaveWhileLive, router]);

  useEffect(() => {
    if (!isHost || !broadcastLive || endingStream) return;
    const sub = navigation.addListener('beforeRemove', (e) => {
      if (hostLeaveConfirmedRef.current || endingStreamRef.current) return;
      e.preventDefault();
      promptHostLeaveWhileLive(() => {
        hostLeaveConfirmedRef.current = true;
        navigation.dispatch(e.data.action);
      });
    });
    return sub;
  }, [isHost, broadcastLive, endingStream, navigation, promptHostLeaveWhileLive]);

  useFocusEffect(
    useCallback(() => {
      if (!isHost || !broadcastLive || endingStream) return undefined;
      const onHardwareBack = () => {
        if (hostLeaveConfirmedRef.current || endingStreamRef.current) return false;
        promptHostLeaveWhileLive(() => {
          hostLeaveConfirmedRef.current = true;
          router.back();
        });
        return true;
      };
      const sub = BackHandler.addEventListener('hardwareBackPress', onHardwareBack);
      return () => sub.remove();
    }, [isHost, broadcastLive, endingStream, promptHostLeaveWhileLive, router]),
  );

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

  const handleFlipCamera = useCallback(() => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setFlipCameraNonce((n) => n + 1);
  }, []);

  const handleClearChat = useCallback(() => {
    setMessages(DEFAULT_CHAT);
    showToast('Chat cleared on your device.', 'success');
  }, [showToast]);

  const openLiveHighlights = useCallback(() => {
    router.push(liveHighlightsHref(streamId));
  }, [router, streamId]);

  const handleBlockHost = useCallback(() => {
    if (!user?.id || !stream || isHost) return;
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
  }, [user?.id, stream, isHost, showToast, router]);

  const healthSnapshot: StreamHealthSnapshot = useMemo(
    () =>
      buildStreamHealthSnapshot({
        liveKitEnabled,
        liveKitRoomConnected: lkRoomConnected,
        liveKitReconnecting: lkReconnecting,
        liveKitSessionActive: liveKitSessionEnabled && Boolean(lkToken),
        liveKitError: lkError ?? lkRoomError,
        micMuted: hostMicMuted,
        micPublished: hostAudioPublished,
        micPermissionDenied: hostMicPermissionDenied,
        cameraPermissionGranted: hostCameraGranted,
        cameraPublishing:
          lkRoomConnected &&
          (sceneMode === 'live' || sceneMode === 'qna' || sceneMode === 'poll') &&
          hostCameraGranted !== false,
        sceneMode,
        viewerCount,
        streamStatus: stream?.status ?? 'unknown',
        broadcastLive,
        endingStream,
        hostLastSeenAt: stream?.hostLastSeenAt ?? null,
        lastLocalHeartbeatAt,
        realtimeChannels: {
          chat: realtimeHealth.chat,
          polls: realtimeHealth.polls,
          pins: realtimeHealth.pins,
          gifts: realtimeHealth.gifts,
          stream: realtimeHealth.stream,
          questions: qnaBackendReady ? realtimeHealth.questions : undefined,
        },
        qnaBackendReady,
      }),
    [
      liveKitEnabled,
      lkRoomConnected,
      lkReconnecting,
      liveKitSessionEnabled,
      lkToken,
      lkError,
      lkRoomError,
      hostMicMuted,
      hostAudioPublished,
      hostMicPermissionDenied,
      hostCameraGranted,
      sceneMode,
      viewerCount,
      stream?.status,
      stream?.hostLastSeenAt,
      broadcastLive,
      endingStream,
      lastLocalHeartbeatAt,
      realtimeHealth,
      qnaBackendReady,
    ],
  );

  if (isLoading || !stream) return <LoadingState />;

  const posterUri = (stream.thumbnailUrl ?? '').trim() || (stream.host.avatarUrl ?? '').trim();
  const giftsEnabled = liveStreamGiftsEnabled(stream.tags);
  const showLiveKitLayer =
    liveKitEnabled &&
    !!lkToken &&
    !!lkServerUrl &&
    stream.status === 'live' &&
    !lkRoomError;

  if (stream.status === 'ended') {
    return (
      <View style={[styles.container, { paddingTop: insets.top }]}>
        <ViewerLiveStateScreen
          title="This live has ended"
          message={stream.title}
          icon="radio-outline"
          tone="muted"
          onBack={() => router.back()}
        />
      </View>
    );
  }

  if (streamStaleForViewers) {
    return (
      <View style={[styles.container, { paddingTop: insets.top }]}>
        <ViewerLiveStateScreen
          title="This live has ended"
          message="The host disconnected. Check Happening Now for other streams."
          icon="radio-outline"
          tone="muted"
          onBack={() => router.back()}
        />
      </View>
    );
  }

  if (stream.status === 'scheduled' && !isHost) {
    const starts =
      stream.scheduledFor != null && stream.scheduledFor !== ''
        ? new Date(stream.scheduledFor).toLocaleString()
        : 'Time TBD';
    return (
      <View style={[styles.container, { paddingTop: insets.top }]}>
        <ViewerLiveStateScreen
          title="Starts later"
          message={`${stream.title}\nHosted by ${stream.host.displayName}\n${starts}`}
          icon="calendar-outline"
          actionLabel={reminderOn ? 'Reminder on' : 'Remind me'}
          onAction={async () => {
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
              next ? 'Reminder saved — we\u2019ll notify you when they go live.' : 'Reminder removed.',
              'success',
            );
          }}
          onBack={() => router.back()}
        />
      </View>
    );
  }

  return (
    <KeyboardAwareRoot style={styles.container} keyboardVerticalOffset={insets.top}>
      <LiveStage>
        {showLiveKitLayer ? (
          <Suspense fallback={<View style={[styles.streamBg, { backgroundColor: '#020617' }]} />}>
            <LiveKitStageLazy
              key={lkSessionKey}
              serverUrl={lkServerUrl!}
              token={lkToken!}
              role={isHost ? 'host' : 'viewer'}
              style={styles.streamBg}
              streamId={streamId}
              roomName={lkRoomName ?? stream.livekitRoomName}
              participantIdentity={lkParticipantIdentity ?? undefined}
              sceneMode={sceneMode}
              brbMode={isHost && brbMode}
              micMuted={hostMicMuted}
              viewerAudioMuted={viewerAudioMuted}
              pollQuestion={activePoll?.isActive ? activePoll.question : null}
              flipCameraNonce={isHost ? flipCameraNonce : undefined}
              onResumeFromBrb={isHost ? () => void handleSceneModeChange('live') : undefined}
              onConnected={handleLiveKitConnected}
              onBroadcastReady={handleHostBroadcastReady}
              onDisconnected={() => {
                setLkRoomConnected(false);
                if (endingStreamRef.current) {
                  liveEndStreamDebug.liveKitDisconnected(streamId);
                }
              }}
              onAvPermissionsResolved={({ micGranted, cameraGranted }) => {
                setHostCameraGranted(cameraGranted);
                if (!micGranted) setHostMicPermissionDenied(true);
              }}
              onMicPermissionDenied={() => {
                setHostMicPermissionDenied(true);
                showToast('Allow microphone access in Settings to broadcast audio.', 'error');
              }}
              onHostAudioPublished={(published) => {
                setHostAudioPublished(published);
                if (!published && isHost) {
                  showToast('Viewers may not hear you — check mic permission and the Mic control.', 'info');
                }
              }}
              onError={(err) => {
                const friendly = friendlyLiveKitJoinError(err);
                liveKitJoinDebug.connectionError({
                  streamId,
                  roomName: lkRoomName ?? stream.livekitRoomName ?? null,
                  userId: user?.id ?? null,
                  participantIdentity: lkParticipantIdentity ?? null,
                  role: isHost ? 'host' : 'viewer',
                  streamStatus: stream.status,
                  broadcastStartedAt: stream.broadcastStartedAt ?? null,
                  endedAt: stream.endedAt ?? null,
                  hostLastSeenAt: stream.hostLastSeenAt ?? null,
                  errorMessage: err.message,
                });
                if (isHost) {
                  Alert.alert(
                    'Broadcast error',
                    `${friendly}\n\nYou can end this session and try again.`,
                    [
                      { text: 'Dismiss', style: 'cancel' },
                      {
                        text: 'End session',
                        style: 'destructive',
                        onPress: async () => {
                          try {
                            await streamsLiveService.abortUnbroadcastStream(streamId);
                            await queryClient.invalidateQueries({ queryKey: ['stream', streamId] });
                            router.replace('/(tabs)/live');
                          } catch (abortErr) {
                            if (__DEV__) console.warn('[live.liveKit.onError.endSession]', abortErr);
                            showToast('Couldn\u2019t end session. Try again.', 'error');
                          }
                        },
                      },
                    ],
                  );
                  return;
                }
                setLkRoomError(friendly);
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
      </LiveStage>
      <LinearGradient
        colors={
          isHost
            ? ['rgba(6,14,26,0.28)', 'transparent', 'rgba(6,14,26,0.42)']
            : ['rgba(6,14,26,0.16)', 'transparent', 'rgba(6,14,26,0.32)']
        }
        locations={[0, 0.22, 1]}
        style={StyleSheet.absoluteFill}
        pointerEvents="none"
      />

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

      {isHost && hostMicPermissionDenied ? (
        <View style={styles.lkErrorBanner}>
          <Text style={styles.lkErrorTxt}>
            Microphone access is off. Enable it in Settings to broadcast audio.
          </Text>
        </View>
      ) : null}

      {isHost && hostAudioPublished === false && !hostMicMuted && !hostMicPermissionDenied ? (
        <View style={styles.connectBanner}>
          <Text style={styles.connectBannerTxt}>
            Your mic is not live yet — tap Mic in the dock or check permissions.
          </Text>
        </View>
      ) : null}

      {lkError && streamIsLive && isHost ? (
        <View style={styles.lkErrorBanner}>
          <Text style={styles.lkErrorTxt}>{lkError}</Text>
        </View>
      ) : null}
      <View style={[styles.shell, { paddingTop: insets.top, paddingBottom: insets.bottom + 8 }]}>
        {isHost ? (
          <HostLiveStudio
            streamTitle={stream.title}
            viewerCount={viewerCount}
            broadcastStartedAt={stream.broadcastStartedAt}
            preparingBroadcast={preparingBroadcast}
            streamIsLive={streamIsLive}
            recordingEnabled={stream.recordingEnabled}
            viewerClipsAllowed={stream.viewerClipsAllowed}
            requireHostApproval={stream.requireHostApproval}
            allowClipDownloads={stream.allowClipDownloads}
            onToggleViewerClips={handleToggleViewerClips}
            onToggleRequireHostApproval={handleToggleRequireHostApproval}
            onToggleAllowClipDownloads={handleToggleAllowClipDownloads}
            togglingClipSetting={togglingClipSetting}
            recordingActive={recordingActive}
            onMarkMoment={isLiveClipEgressEnabled() ? handleMarkMoment : undefined}
            markMomentLoading={markMomentLoading}
            onOpenClipStudio={isLiveClipEgressEnabled() ? openLiveHighlights : undefined}
            onReviewMarker={handleReviewMarker}
            reviewingMarkerId={reviewingMarkerId}
            clipMarkers={clipMarkers}
            clipMarkersLoading={clipMarkersLoading}
            clipMarkersBackendReady={clipMarkersBackendReady}
            giftsEnabled={giftsEnabled}
            sceneMode={sceneMode}
            onSceneModeChange={handleSceneModeChange}
            sceneChanging={sceneChanging}
            hostMicMuted={hostMicMuted}
            onToggleMic={() => setHostMicMuted((v) => !v)}
            endingStream={endingStream}
            onEndStream={handleEndStream}
            onShare={handleShareLive}
            onFlipCamera={handleFlipCamera}
            onBack={handleHostBack}
            bottomInset={0}
            previewMode={
              preparingBroadcast
                ? 'connecting'
                : showLiveKitLayer &&
                    (sceneMode === 'live' || sceneMode === 'qna' || sceneMode === 'poll')
                  ? 'live'
                  : 'fallback'
            }
            activePoll={activePoll}
            questions={questions}
            pinnedQuestion={pinnedQuestion}
            qnaBackendReady={qnaBackendReady}
            qnaLoading={qnaLoading}
            onPinQuestion={handlePinQuestion}
            onUnpinQuestion={handleUnpinQuestion}
            onMarkQuestionAnswered={handleMarkQuestionAnswered}
            onDismissQuestion={handleDismissQuestion}
            healthSnapshot={healthSnapshot}
            healthRefreshing={healthRefreshing}
            onRefreshHealth={handleRefreshHealth}
            messages={messages}
            pinned={pinnedMessage}
            currentUserId={user?.id}
            inputText={inputText}
            onChangeInput={setInputText}
            onSendMessage={sendMessage}
            onUnpin={handleUnpin}
            onPinMessage={togglePinChatMessage}
            onMessageLongPress={handleChatMessageLongPress}
            hasVotedPoll={hasVotedPoll}
            votedOptionId={votedOptionId}
            onPollVote={handlePollVote}
            onCreatePoll={() => setHostPollVisible(true)}
            onEndPoll={handleEndPoll}
            onClearChat={handleClearChat}
            chatBlocked={liveChatBlocked}
            chatSending={chatSending}
            pollVoting={pollVoting}
            showToast={showToast}
          />
        ) : (
          <ViewerLivePlayer
            host={stream.host}
            streamId={streamId}
            streamTitle={stream.title}
            viewerUserId={user?.id}
            isFollowing={isFollowing}
            onToggleFollow={handleToggleFollow}
            viewerCount={viewerCount}
            broadcastLive={broadcastLive}
            streamIsLive={streamIsLive}
            giftsEnabled={giftsEnabled}
            viewerAudioMuted={viewerAudioMuted}
            onToggleAudio={() => setViewerAudioMuted((v) => !v)}
            onBack={() => router.back()}
            onShare={handleShareLive}
            onReportStream={() => setReportOpen(true)}
            onBlockHost={handleBlockHost}
            messages={messages}
            pinned={pinnedMessage}
            pinnedQuestion={pinnedQuestion}
            questions={questions}
            qnaBackendReady={qnaBackendReady}
            onSubmitQuestion={handleSubmitQuestion}
            questionSubmitting={questionSubmitting}
            onGiftSent={handleGiftSent}
            onOpenLeaderboard={() => setShowLeaderboard(true)}
            showLeaderboard={leaderboard.length > 0}
            inputText={inputText}
            onChangeInput={setInputText}
            onSendMessage={sendMessage}
            onMessageLongPress={handleChatMessageLongPress}
            chatBlocked={liveChatBlocked}
            chatSending={chatSending}
            activePoll={activePoll}
            hasVotedPoll={hasVotedPoll}
            votedOptionId={votedOptionId}
            onPollVote={handlePollVote}
            pollVoting={pollVoting}
            pollUnavailable={!activePoll?.isActive}
            audioUnavailable={Boolean(lkError && broadcastLive)}
            streamConnecting={preparingBroadcast || (!broadcastLive && streamIsLive)}
            streamVideoError={
              lkRoomError ??
              (broadcastLive && !showLiveKitLayer && lkError ? lkError : null)
            }
            showToast={showToast}
            welcomeMessage={DEFAULT_CHAT[0]?.content}
            viewerClipsAllowed={Boolean(stream.viewerClipsAllowed)}
            clipMarkersBackendReady={clipMarkersBackendReady}
            onSaveClipMoment={handleClipMoment}
            clipMomentLoading={clipMomentLoading}
          />
        )}
      </View>

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

      {reportMessageId ? (
        <ReportModal
          visible={reportMessageOpen}
          onClose={() => {
            setReportMessageOpen(false);
            setReportMessageId(null);
          }}
          targetType="stream_message"
          targetId={reportMessageId}
        />
      ) : null}
    </KeyboardAwareRoot>
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
  streamTitleHud: {
    ...typography.subtitle,
    fontSize: 15,
    fontWeight: '700',
    color: 'rgba(248,250,252,0.92)',
    marginBottom: 8,
    textShadowColor: 'rgba(0,0,0,0.45)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 6,
  },
  pollChipRow: { marginBottom: 8 },
  managerActions: { gap: 10, paddingVertical: 8 },
  managerActionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingVertical: 12,
    paddingHorizontal: 14,
    borderRadius: borderRadius.lg,
    backgroundColor: 'rgba(15,28,48,0.72)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
  },
  managerActionDanger: {
    backgroundColor: 'rgba(127,29,29,0.82)',
    borderColor: 'rgba(252,165,165,0.35)',
  },
  managerActionTxt: {
    ...typography.bodySmall,
    fontWeight: '700',
    color: colors.neutral.white,
  },
  managerEmpty: {
    ...typography.bodySmall,
    color: colors.dark.textMuted,
    paddingVertical: 16,
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
