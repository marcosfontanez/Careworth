import React, { useMemo } from 'react';
import { Alert, StyleSheet, View } from 'react-native';
import * as Haptics from 'expo-haptics';
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
import { QuickActionsGrid, type QuickAction } from '@/components/live/studio/QuickActionsGrid';
import { useLiveSessionTimer } from '@/components/live/studio/useLiveSessionTimer';
import { formatCount } from '@/utils/format';
import type { StreamMessage, StreamPinnedMessage, StreamPoll } from '@/types';

export type HostStudioViewMode = 'camera' | 'manager';

type Props = {
  streamTitle: string;
  viewerCount: number;
  broadcastStartedAt?: string | null;
  preparingBroadcast: boolean;
  streamIsLive: boolean;
  recordingEnabled?: boolean;
  giftsEnabled: boolean;
  brbMode: boolean;
  onToggleBrb: () => void;
  hostMicMuted: boolean;
  onToggleMic: () => void;
  endingStream: boolean;
  onEndStream: () => void;
  onShare: () => void;
  onFlipCamera: () => void;
  onBack: () => void;
  bottomInset: number;
  preview?: React.ReactNode;
  messages: StreamMessage[];
  pinned: StreamPinnedMessage | null;
  currentUserId?: string;
  inputText: string;
  onChangeInput: (text: string) => void;
  onSendMessage: () => void;
  onUnpin: () => void;
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
  slowModeEnabled: boolean;
  onToggleSlowMode: () => void;
  managerInitialTab?: StreamManagerTab;
};

/** Host Live Studio — camera-first mode + full Stream Manager dashboard. */
export function HostLiveStudio({
  streamTitle,
  viewerCount,
  broadcastStartedAt,
  preparingBroadcast,
  streamIsLive,
  recordingEnabled,
  giftsEnabled,
  brbMode,
  onToggleBrb,
  hostMicMuted,
  onToggleMic,
  endingStream,
  onEndStream,
  onShare,
  onFlipCamera,
  onBack,
  bottomInset,
  preview,
  messages,
  pinned,
  currentUserId,
  inputText,
  onChangeInput,
  onSendMessage,
  onUnpin,
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
  slowModeEnabled,
  onToggleSlowMode,
  managerInitialTab,
}: Props) {
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
        key: 'edit',
        icon: 'create-outline',
        label: 'Edit Stream Info',
        onPress: () => showToast('Stream info editing opens in a future update.', 'info'),
      },
      {
        key: 'share',
        icon: 'share-social-outline',
        label: 'Share Stream',
        onPress: onShare,
      },
      {
        key: 'create-poll',
        icon: 'add-circle-outline',
        label: 'Create Poll',
        onPress: onCreatePoll,
      },
      {
        key: 'end-poll',
        icon: 'stop-circle-outline',
        label: 'End Poll',
        onPress: onEndPoll,
        disabled: !activePoll,
      },
      {
        key: 'brb',
        icon: 'pause-circle-outline',
        label: brbMode ? 'Resume Live' : 'BRB Mode',
        onPress: onToggleBrb,
        active: brbMode,
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
        key: 'gifts',
        icon: 'gift-outline',
        label: 'Gift Settings',
        tone: 'gold',
        onPress: () => openManager('gifts'),
      },
      {
        key: 'mod',
        icon: 'shield-checkmark-outline',
        label: 'Moderation',
        onPress: () => openManager('mod'),
      },
      {
        key: 'slow',
        icon: 'hourglass-outline',
        label: slowModeEnabled ? 'Slow Mode On' : 'Slow Mode',
        onPress: onToggleSlowMode,
        active: slowModeEnabled,
      },
      {
        key: 'clear',
        icon: 'trash-outline',
        label: 'Clear Chat',
        onPress: () => {
          Alert.alert('Clear chat?', 'This removes messages from your view only.', [
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
        tone: 'danger',
        onPress: onEndStream,
        disabled: endingStream,
      },
    ],
    [
      activePoll,
      brbMode,
      endingStream,
      hostMicMuted,
      onClearChat,
      onCreatePoll,
      onEndPoll,
      onEndStream,
      onFlipCamera,
      onShare,
      onToggleBrb,
      onToggleMic,
      onToggleSlowMode,
      showToast,
      slowModeEnabled,
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
                onPress: onToggleBrb,
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
        giftsEnabled={giftsEnabled}
        recordingEnabled={recordingEnabled}
        slowModeEnabled={slowModeEnabled}
        preview={preview}
        messages={messages}
        pinned={pinned}
        currentUserId={currentUserId}
        inputText={inputText}
        onChangeInput={onChangeInput}
        onSendMessage={onSendMessage}
        onUnpin={onUnpin}
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
          onMessageLongPress={onMessageLongPress}
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
