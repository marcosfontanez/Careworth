import React, { useMemo } from 'react';
import { Alert, StyleSheet, View } from 'react-native';
import { useRouter } from 'expo-router';
import * as Haptics from 'expo-haptics';
import { openPulsePage } from '@/lib/navigation/pulsePageRoutes';
import { LiveBottomSheet } from '@/components/live/LiveBottomSheet';
import { LiveControlDock } from '@/components/live/LiveControlDock';
import { HostEndStreamButton } from '@/components/live/studio/HostEndStreamButton';
import { LiveHud } from '@/components/live/studio/LiveHud';
import { LiveChatPanel } from '@/components/live/studio/LiveChatPanel';
import { LivePollPanel } from '@/components/live/studio/LivePollPanel';
import {
  StreamManagerPanel,
  type StreamManagerTab,
} from '@/components/live/studio/StreamManagerPanel';
import { type QuickAction } from '@/components/live/studio/QuickActionGrid';
import type { LivePreviewMode } from '@/components/live/studio/LivePreviewCard';
import { useLiveSessionTimer } from '@/components/live/studio/useLiveSessionTimer';
import { formatCount } from '@/utils/format';
import type { StreamHealthSnapshot } from '@/components/live/studio/LiveStreamHealthPanel';
import type { LiveSceneMode } from '@/lib/live/liveSceneMode';
import type { StreamQuestion } from '@/services/supabase/streamQuestions';
import type { LiveClipMarker } from '@/services/supabase/streamClipMarkers';
import type { StreamMessage, StreamPinnedMessage, StreamPoll } from '@/types';

export type HostStudioViewMode = 'camera' | 'manager';

type Props = {
  streamTitle: string;
  viewerCount: number;
  broadcastStartedAt?: string | null;
  preparingBroadcast: boolean;
  streamIsLive: boolean;
  recordingEnabled?: boolean;
  viewerClipsAllowed?: boolean;
  requireHostApproval?: boolean;
  allowClipDownloads?: boolean;
  onToggleViewerClips?: (allowed: boolean) => void;
  onToggleRequireHostApproval?: (required: boolean) => void;
  onToggleAllowClipDownloads?: (allowed: boolean) => void;
  togglingClipSetting?: 'viewer_clips' | 'require_approval' | 'downloads' | null;
  recordingActive?: boolean;
  onMarkMoment?: () => void;
  markMomentLoading?: boolean;
  onOpenClipStudio?: () => void;
  onReviewMarker?: (markerId: string, decision: 'approved' | 'rejected') => void;
  reviewingMarkerId?: string | null;
  clipMarkers?: LiveClipMarker[];
  clipMarkersLoading?: boolean;
  clipMarkersBackendReady?: boolean;
  giftsEnabled: boolean;
  sceneMode: LiveSceneMode;
  onSceneModeChange: (mode: LiveSceneMode) => void;
  sceneChanging?: boolean;
  hostMicMuted: boolean;
  onToggleMic: () => void;
  endingStream: boolean;
  onEndStream: () => void;
  onShare: () => void;
  onFlipCamera: () => void;
  onBack: () => void;
  bottomInset: number;
  previewMode?: LivePreviewMode;
  messages: StreamMessage[];
  pinned: StreamPinnedMessage | null;
  currentUserId?: string;
  inputText: string;
  onChangeInput: (text: string) => void;
  onSendMessage: () => void;
  onUnpin: () => void;
  onPinMessage?: (msg: StreamMessage) => void;
  onMessageLongPress: (msg: StreamMessage) => void;
  activePoll: StreamPoll | null;
  hasVotedPoll: boolean;
  votedOptionId?: string;
  onPollVote: (optionId: string) => void;
  pollVoting?: boolean;
  onCreatePoll: () => void;
  onEndPoll: () => void;
  onClearChat: () => void;
  chatBlocked?: boolean;
  chatSending?: boolean;
  showToast: (msg: string, type: 'success' | 'error' | 'info') => void;
  managerInitialTab?: StreamManagerTab;
  questions?: StreamQuestion[];
  pinnedQuestion?: StreamQuestion | null;
  qnaBackendReady?: boolean;
  qnaLoading?: boolean;
  onPinQuestion?: (questionId: string) => void;
  onUnpinQuestion?: (questionId: string) => void;
  onMarkQuestionAnswered?: (questionId: string) => void;
  onDismissQuestion?: (questionId: string) => void;
  healthSnapshot?: StreamHealthSnapshot;
  healthRefreshing?: boolean;
  onRefreshHealth?: () => void;
};

/** Host Live Studio — camera-first mode + full Stream Manager dashboard. */
export function HostLiveStudio({
  streamTitle,
  viewerCount,
  broadcastStartedAt,
  preparingBroadcast,
  streamIsLive,
  recordingEnabled,
  viewerClipsAllowed,
  requireHostApproval = true,
  allowClipDownloads = false,
  onToggleViewerClips,
  onToggleRequireHostApproval,
  onToggleAllowClipDownloads,
  togglingClipSetting = null,
  recordingActive = false,
  onMarkMoment,
  markMomentLoading = false,
  onOpenClipStudio,
  onReviewMarker,
  reviewingMarkerId = null,
  clipMarkers = [],
  clipMarkersLoading = false,
  clipMarkersBackendReady = true,
  giftsEnabled,
  sceneMode,
  onSceneModeChange,
  sceneChanging = false,
  hostMicMuted,
  onToggleMic,
  endingStream,
  onEndStream,
  onShare,
  onFlipCamera,
  onBack,
  bottomInset,
  previewMode = 'fallback',
  messages,
  pinned,
  currentUserId,
  inputText,
  onChangeInput,
  onSendMessage,
  onUnpin,
  onPinMessage,
  onMessageLongPress,
  activePoll,
  hasVotedPoll,
  votedOptionId,
  onPollVote,
  onCreatePoll,
  onEndPoll,
  onClearChat,
  chatBlocked,
  chatSending = false,
  pollVoting = false,
  showToast,
  managerInitialTab,
  questions = [],
  pinnedQuestion,
  qnaBackendReady = true,
  qnaLoading = false,
  onPinQuestion,
  onUnpinQuestion,
  onMarkQuestionAnswered,
  onDismissQuestion,
  healthSnapshot,
  healthRefreshing = false,
  onRefreshHealth,
}: Props) {
  const router = useRouter();
  const brbMode = sceneMode === 'brb';
  const resumeLive = () => onSceneModeChange('live');
  const toggleBrb = () => onSceneModeChange(brbMode ? 'live' : 'brb');
  const [viewMode, setViewMode] = React.useState<HostStudioViewMode>('camera');
  const [chatSheetOpen, setChatSheetOpen] = React.useState(false);
  const [pollSheetOpen, setPollSheetOpen] = React.useState(false);

  const sessionTimer = useLiveSessionTimer(
    broadcastStartedAt ?? undefined,
    streamIsLive && !preparingBroadcast,
  );
  const viewerLabel = formatCount(viewerCount);
  const liveLabel = preparingBroadcast ? 'CONNECTING' : 'LIVE';

  const openManager = (tab?: StreamManagerTab) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    if (tab) {
      setManagerTab(tab);
    }
    setViewMode('manager');
  };

  const [managerTab, setManagerTab] = React.useState<StreamManagerTab>(managerInitialTab ?? 'chat');

  const quickActions: QuickAction[] = useMemo(
    () => [
      {
        key: 'clip-studio',
        icon: 'cut-outline',
        label: 'Clip Studio',
        description: 'Turn markers into feed clips',
        variant: 'creator',
        onPress: () => onOpenClipStudio?.(),
        disabled: !onOpenClipStudio,
      },
      {
        key: 'mark-moment',
        icon: 'bookmark-outline',
        label: 'Mark Moment',
        description: 'Flag a clip window on the recording',
        variant: 'creator',
        onPress: () => onMarkMoment?.(),
        loading: markMomentLoading,
        disabled: markMomentLoading || !onMarkMoment,
      },
      {
        key: 'clip-markers',
        icon: 'albums-outline',
        label: 'Clip Markers',
        description: 'Review viewer submissions',
        variant: 'creator',
        onPress: () => openManager('markers'),
      },
      {
        key: 'edit',
        icon: 'create-outline',
        label: 'Edit Stream Info',
        description: 'Title, category, and tags',
        variant: 'creator',
        onPress: () => showToast('Stream info editing opens in a future update.', 'info'),
      },
      {
        key: 'share',
        icon: 'share-social-outline',
        label: 'Share Stream',
        description: 'Invite viewers to your room',
        onPress: onShare,
      },
      {
        key: 'create-poll',
        icon: 'add-circle-outline',
        label: 'Create Poll',
        description: 'Launch a live vote',
        variant: 'creator',
        onPress: onCreatePoll,
      },
      {
        key: 'end-poll',
        icon: 'stop-circle-outline',
        label: 'End Poll',
        variant: 'creator',
        onPress: onEndPoll,
        disabled: !activePoll,
      },
      {
        key: 'scene-starting',
        icon: 'time-outline',
        label: 'Starting Soon',
        description: 'Branded hold screen before you go live',
        variant: 'creator',
        onPress: () => onSceneModeChange('starting_soon'),
        active: sceneMode === 'starting_soon',
        disabled: sceneChanging,
      },
      {
        key: 'scene-ending',
        icon: 'flag-outline',
        label: 'Ending Soon',
        description: 'Tell viewers you are wrapping up',
        variant: 'creator',
        onPress: () => onSceneModeChange('ending_soon'),
        active: sceneMode === 'ending_soon',
        disabled: sceneChanging,
      },
      {
        key: 'scene-qna',
        icon: 'help-circle-outline',
        label: 'Q&A Mode',
        description: 'Highlight pinned questions on stream',
        variant: 'creator',
        onPress: () => onSceneModeChange('qna'),
        active: sceneMode === 'qna',
        disabled: sceneChanging,
      },
      {
        key: 'scene-poll',
        icon: 'stats-chart-outline',
        label: 'Poll Mode',
        description: 'Spotlight the active live poll',
        variant: 'creator',
        onPress: () => onSceneModeChange('poll'),
        active: sceneMode === 'poll',
        disabled: sceneChanging || !activePoll?.isActive,
      },
      {
        key: 'scene-live',
        icon: 'videocam-outline',
        label: 'Live Camera',
        description: 'Return to normal broadcast',
        onPress: () => onSceneModeChange('live'),
        active: sceneMode === 'live',
        disabled: sceneChanging,
      },
      {
        key: 'brb',
        icon: brbMode ? 'play-circle-outline' : 'pause-circle-outline',
        label: brbMode ? 'Resume Live' : 'BRB Mode',
        description: brbMode ? 'Return camera to viewers' : 'Hold stream, pause camera',
        onPress: toggleBrb,
        active: brbMode,
        variant: 'creator',
      },
      {
        key: 'mic',
        icon: hostMicMuted ? 'mic-off-outline' : 'mic-outline',
        label: hostMicMuted ? 'Unmute Mic' : 'Mute Mic',
        onPress: onToggleMic,
        active: !hostMicMuted,
      },
      {
        key: 'flip',
        icon: 'camera-reverse-outline',
        label: 'Flip Camera',
        onPress: onFlipCamera,
      },
      {
        key: 'qna',
        icon: 'help-circle-outline',
        label: 'Q&A Queue',
        description: 'Pin and answer viewer questions',
        variant: 'creator',
        onPress: () => openManager('qna'),
      },
      {
        key: 'gifts',
        icon: 'gift-outline',
        label: 'Gift Settings',
        description: 'Creator gift tray and leaderboard',
        variant: 'gold',
        onPress: () => openManager('gifts'),
      },
      {
        key: 'health',
        icon: 'pulse-outline',
        label: 'Stream Health',
        description: 'LiveKit, mic, and realtime status',
        onPress: () => openManager('health'),
      },
      {
        key: 'mod',
        icon: 'shield-checkmark-outline',
        label: 'Moderation',
        variant: 'shield',
        onPress: () => openManager('mod'),
      },
      {
        key: 'clear',
        icon: 'trash-outline',
        label: 'Clear Chat (local)',
        variant: 'danger',
        onPress: () => {
          Alert.alert('Clear chat on this device?', 'This hides messages on your screen only — viewers still see chat.', [
            { text: 'Cancel', style: 'cancel' },
            {
              text: 'Clear',
              style: 'destructive',
              onPress: onClearChat,
            },
          ]);
        },
      },
      {
        key: 'end',
        icon: 'stop-circle-outline',
        label: 'End Stream',
        variant: 'danger',
        onPress: onEndStream,
        disabled: endingStream,
        loading: endingStream,
      },
    ],
    [
      activePoll,
      brbMode,
      sceneMode,
      sceneChanging,
      onSceneModeChange,
      endingStream,
      hostMicMuted,
      markMomentLoading,
      onMarkMoment,
      onOpenClipStudio,
      onClearChat,
      onCreatePoll,
      onEndPoll,
      onEndStream,
      onFlipCamera,
      onShare,
      showToast,
      onSceneModeChange,
    ],
  );

  return (
    <>
      {viewMode === 'camera' ? (
        <View style={[styles.cameraShell, { paddingBottom: bottomInset }]}>
          <LiveHud
            liveLabel={liveLabel}
            sessionTimer={sessionTimer}
            viewerCountLabel={viewerLabel}
            onBack={onBack}
            onOpenManager={() => openManager('chat')}
            showManager
          />

          <View style={styles.flexSpacer} />

          <HostEndStreamButton onPress={onEndStream} disabled={endingStream} loading={endingStream} />

          <LiveControlDock
            actions={[
              {
                key: 'brb',
                icon: 'pause-circle-outline',
                label: 'BRB',
                active: brbMode,
                onPress: toggleBrb,
                disabled: endingStream,
              },
              {
                key: 'polls',
                icon: 'stats-chart-outline',
                label: 'Polls',
                active: pollSheetOpen || !!activePoll,
                onPress: () => {
                  if (activePoll) setPollSheetOpen(true);
                  else onCreatePoll();
                },
                disabled: endingStream,
              },
              {
                key: 'chat',
                icon: chatSheetOpen ? 'chatbubble' : 'chatbubble-outline',
                label: 'Chat',
                active: chatSheetOpen,
                onPress: () => setChatSheetOpen(true),
                disabled: endingStream,
              },
              {
                key: 'flip',
                icon: 'camera-reverse-outline',
                label: 'Flip',
                onPress: onFlipCamera,
                disabled: endingStream,
              },
              {
                key: 'mic',
                icon: hostMicMuted ? 'mic-off-outline' : 'mic-outline',
                label: hostMicMuted ? 'Muted' : 'Mic',
                active: !hostMicMuted,
                onPress: onToggleMic,
                disabled: endingStream,
              },
            ]}
          />
        </View>
      ) : null}

      <StreamManagerPanel
        visible={viewMode === 'manager'}
        onClose={() => setViewMode('camera')}
        streamTitle={streamTitle}
        sessionTimer={sessionTimer}
        viewerCountLabel={viewerLabel}
        micMuted={hostMicMuted}
        brbMode={brbMode}
        sceneMode={sceneMode}
        onSceneModeChange={onSceneModeChange}
        sceneChanging={sceneChanging}
        giftsEnabled={giftsEnabled}
        recordingEnabled={recordingEnabled}
        viewerClipsAllowed={viewerClipsAllowed}
        requireHostApproval={requireHostApproval}
        allowClipDownloads={allowClipDownloads}
        streamIsLive={streamIsLive}
        onToggleViewerClips={onToggleViewerClips}
        onToggleRequireHostApproval={onToggleRequireHostApproval}
        onToggleAllowClipDownloads={onToggleAllowClipDownloads}
        togglingClipSetting={togglingClipSetting}
        clipMarkers={clipMarkers}
        clipMarkersLoading={clipMarkersLoading}
        clipMarkersBackendReady={clipMarkersBackendReady}
        recordingActive={recordingActive}
        onMarkMoment={onMarkMoment}
        markMomentLoading={markMomentLoading}
        onOpenClipStudio={onOpenClipStudio}
        onReviewMarker={onReviewMarker}
        reviewingMarkerId={reviewingMarkerId}
        previewMode={previewMode}
        onResumeBrb={resumeLive}
        messages={messages}
        pinned={pinned}
        currentUserId={currentUserId}
        inputText={inputText}
        onChangeInput={onChangeInput}
        onSendMessage={onSendMessage}
        onUnpin={onUnpin}
        onPinMessage={onPinMessage}
        onMessageLongPress={onMessageLongPress}
        activePoll={activePoll}
        hasVotedPoll={hasVotedPoll}
        votedOptionId={votedOptionId}
        onPollVote={onPollVote}
        onCreatePoll={onCreatePoll}
        onEndPoll={onEndPoll}
        quickActions={quickActions}
        chatBlocked={chatBlocked}
        chatSending={chatSending}
        pollVoting={pollVoting}
        initialTab={managerTab}
        questions={questions}
        pinnedQuestion={pinnedQuestion}
        qnaBackendReady={qnaBackendReady}
        qnaLoading={qnaLoading}
        onPinQuestion={onPinQuestion}
        onUnpinQuestion={onUnpinQuestion}
        onMarkQuestionAnswered={onMarkQuestionAnswered}
        onDismissQuestion={onDismissQuestion}
        hasActivePoll={Boolean(activePoll?.isActive)}
        pollQuestion={activePoll?.question ?? null}
        healthSnapshot={healthSnapshot}
        healthRefreshing={healthRefreshing}
        onRefreshHealth={onRefreshHealth}
      />

      <LiveBottomSheet visible={chatSheetOpen} onClose={() => setChatSheetOpen(false)} title="Live chat">
        <LiveChatPanel
          messages={messages}
          pinned={pinned}
          currentUserId={currentUserId}
          inputText={inputText}
          onChangeInput={onChangeInput}
          onSend={onSendMessage}
          onUnpin={onUnpin}
          onPinMessage={onPinMessage}
          onMessageLongPress={onMessageLongPress}
          onPressUser={(msg) => {
            setChatSheetOpen(false);
            openPulsePage(router, msg.userId);
          }}
          onLaunchPoll={onCreatePoll}
          chatBlocked={chatBlocked}
          chatSending={chatSending}
          listHeight={260}
        />
      </LiveBottomSheet>

      <LiveBottomSheet
        visible={pollSheetOpen && !!activePoll}
        onClose={() => setPollSheetOpen(false)}
        title="Live poll"
        maxHeightRatio={0.5}
      >
        {activePoll ? (
          <LivePollPanel
            poll={activePoll}
            hasVoted={hasVotedPoll}
            votedOptionId={votedOptionId}
            onVote={onPollVote}
            onCreatePoll={onCreatePoll}
            onEndPoll={() => {
              onEndPoll();
              setPollSheetOpen(false);
            }}
            pollVoting={pollVoting}
          />
        ) : null}
      </LiveBottomSheet>
    </>
  );
}

const styles = StyleSheet.create({
  cameraShell: {
    flex: 1,
    paddingHorizontal: 14,
    zIndex: 20,
  },
  flexSpacer: { flex: 1, minHeight: 48 },
});
