import React, { useEffect, useState } from 'react';
import { Modal, ScrollView, StyleSheet, View } from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { openPulsePage } from '@/lib/navigation/pulsePageRoutes';
import { LinearGradient } from 'expo-linear-gradient';
import { LiveChatPanel } from '@/components/live/studio/LiveChatPanel';
import { LiveGiftPanel } from '@/components/live/studio/LiveGiftPanel';
import { LiveManagerTabs } from '@/components/live/studio/LiveManagerTabs';
import { LivePreviewCard, type LivePreviewMode } from '@/components/live/studio/LivePreviewCard';
import { LiveSettingsPanel } from '@/components/live/studio/LiveSettingsPanel';
import { LiveStatusChips } from '@/components/live/studio/LiveStatusChips';
import { LiveStudioHeader } from '@/components/live/studio/LiveStudioHeader';
import { LiveModPanel } from '@/components/live/studio/LiveModPanel';
import { LivePollPanel } from '@/components/live/studio/LivePollPanel';
import { QuickActionGrid, type QuickAction } from '@/components/live/studio/QuickActionGrid';
import { StreamManagerPanelShell } from '@/components/live/studio/StreamManagerPanelShell';
import { LiveQnaHostPanel } from '@/components/live/studio/LiveQnaHostPanel';
import { LiveClipMarkersHostPanel } from '@/components/live/studio/LiveClipMarkersHostPanel';
import { LiveSceneControls } from '@/components/live/studio/LiveSceneControls';
import { LiveStreamHealthPanel, type StreamHealthSnapshot } from '@/components/live/studio/LiveStreamHealthPanel';
import { liveStudioTheme } from '@/lib/live/studio/liveStudioTheme';
import type { LiveSceneMode } from '@/lib/live/liveSceneMode';
import type { StreamQuestion } from '@/services/supabase/streamQuestions';
import type { LiveClipMarker } from '@/services/supabase/streamClipMarkers';
import type { StreamMessage, StreamPinnedMessage, StreamPoll } from '@/types';

export type StreamManagerTab =
  | 'chat'
  | 'actions'
  | 'polls'
  | 'gifts'
  | 'qna'
  | 'markers'
  | 'mod'
  | 'health'
  | 'settings';

type Props = {
  visible: boolean;
  onClose: () => void;
  streamTitle: string;
  sessionTimer: string;
  viewerCountLabel: string;
  micMuted: boolean;
  brbMode: boolean;
  sceneMode: LiveSceneMode;
  onSceneModeChange: (mode: LiveSceneMode) => void;
  sceneChanging?: boolean;
  onResumeBrb?: () => void;
  previewMode?: LivePreviewMode;
  preview?: React.ReactNode;
  giftsEnabled: boolean;
  recordingEnabled?: boolean;
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
  onCreatePoll: () => void;
  onEndPoll: () => void;
  quickActions: QuickAction[];
  chatBlocked?: boolean;
  chatSending?: boolean;
  pollVoting?: boolean;
  initialTab?: StreamManagerTab;
  questions?: StreamQuestion[];
  pinnedQuestion?: StreamQuestion | null;
  qnaBackendReady?: boolean;
  qnaLoading?: boolean;
  onPinQuestion?: (questionId: string) => void;
  onUnpinQuestion?: (questionId: string) => void;
  onMarkQuestionAnswered?: (questionId: string) => void;
  onDismissQuestion?: (questionId: string) => void;
  clipMarkers?: LiveClipMarker[];
  clipMarkersLoading?: boolean;
  clipMarkersBackendReady?: boolean;
  recordingActive?: boolean;
  onMarkMoment?: () => void;
  markMomentLoading?: boolean;
  onOpenClipStudio?: () => void;
  onReviewMarker?: (markerId: string, decision: 'approved' | 'rejected') => void;
  reviewingMarkerId?: string | null;
  viewerClipsAllowed?: boolean;
  requireHostApproval?: boolean;
  allowClipDownloads?: boolean;
  streamIsLive?: boolean;
  onToggleViewerClips?: (allowed: boolean) => void;
  onToggleRequireHostApproval?: (required: boolean) => void;
  onToggleAllowClipDownloads?: (allowed: boolean) => void;
  togglingClipSetting?: 'viewer_clips' | 'require_approval' | 'downloads' | null;
  hasActivePoll?: boolean;
  pollQuestion?: string | null;
  healthSnapshot?: StreamHealthSnapshot;
  healthRefreshing?: boolean;
  onRefreshHealth?: () => void;
};

const TAB_META: Record<
  StreamManagerTab,
  { title: string; subtitle?: string; icon?: keyof typeof import('@expo/vector-icons').Ionicons.glyphMap }
> = {
  chat: { title: 'Live chat', subtitle: 'Pin, reply, and moderate in real time', icon: 'chatbubbles-outline' },
  actions: { title: 'Quick actions', subtitle: 'Host controls at a glance', icon: 'flash-outline' },
  polls: { title: 'Polls', subtitle: 'Engage viewers with live votes', icon: 'stats-chart-outline' },
  gifts: { title: 'Creator gifts', subtitle: 'Sparks gifts and leaderboard', icon: 'gift-outline' },
  qna: { title: 'Q&A queue', subtitle: 'Pin and answer viewer questions', icon: 'help-circle-outline' },
  markers: { title: 'Clips', subtitle: 'Mark moments and review viewer submissions', icon: 'cut-outline' },
  mod: { title: 'Moderation', subtitle: 'Safety and chat pacing', icon: 'shield-checkmark-outline' },
  health: { title: 'Stream health', subtitle: 'LiveKit, mic, and realtime status', icon: 'pulse-outline' },
  settings: { title: 'Stream settings', subtitle: 'Scenes, title, and broadcast', icon: 'settings-outline' },
};

/** Full-screen Live Studio dashboard — preview, status, and tabbed panels. */
export function StreamManagerPanel({
  visible,
  onClose,
  streamTitle,
  sessionTimer,
  viewerCountLabel,
  micMuted,
  brbMode,
  sceneMode,
  onSceneModeChange,
  sceneChanging = false,
  onResumeBrb,
  previewMode = 'fallback',
  preview,
  giftsEnabled,
  recordingEnabled,
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
  quickActions,
  chatBlocked,
  chatSending = false,
  pollVoting = false,
  initialTab = 'chat',
  questions = [],
  pinnedQuestion,
  qnaBackendReady = true,
  qnaLoading = false,
  onPinQuestion,
  onUnpinQuestion,
  onMarkQuestionAnswered,
  onDismissQuestion,
  clipMarkers = [],
  clipMarkersLoading = false,
  clipMarkersBackendReady = true,
  recordingActive = false,
  onMarkMoment,
  markMomentLoading = false,
  onOpenClipStudio,
  onReviewMarker,
  reviewingMarkerId = null,
  viewerClipsAllowed = false,
  requireHostApproval = true,
  allowClipDownloads = false,
  streamIsLive = false,
  onToggleViewerClips,
  onToggleRequireHostApproval,
  onToggleAllowClipDownloads,
  togglingClipSetting = null,
  hasActivePoll = false,
  pollQuestion,
  healthSnapshot,
  healthRefreshing = false,
  onRefreshHealth,
}: Props) {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const [tab, setTab] = useState<StreamManagerTab>(initialTab);

  useEffect(() => {
    if (visible) setTab(initialTab);
  }, [visible, initialTab]);

  const meta = TAB_META[tab];

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="fullScreen" onRequestClose={onClose}>
      <View style={[styles.root, { paddingTop: insets.top, paddingBottom: insets.bottom + 8 }]}>
        <LinearGradient colors={[...liveStudioTheme.screenGradient]} style={StyleSheet.absoluteFill} />

        <LiveStudioHeader streamTitle={streamTitle} onClose={onClose} />

        <View style={styles.mainColumn}>
          <View style={styles.topSection}>
            <LivePreviewCard
              brbMode={brbMode}
              sceneMode={sceneMode}
              previewMode={previewMode}
              pollQuestion={pollQuestion}
              onResumeBrb={onResumeBrb}
            >
              {preview}
            </LivePreviewCard>

            <LiveStatusChips
              sessionTimer={sessionTimer}
              viewerCountLabel={viewerCountLabel}
              micMuted={micMuted}
              sceneMode={sceneMode}
            />

            <LiveManagerTabs activeTab={tab} onTabChange={setTab} />
          </View>

          <View style={styles.panelArea}>
            <StreamManagerPanelShell
              title={meta.title}
              subtitle={meta.subtitle}
              icon={meta.icon}
              fill={tab === 'chat'}
            >
              {tab === 'chat' ? (
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
                    onClose();
                    openPulsePage(router, msg.userId);
                  }}
                  onLaunchPoll={onCreatePoll}
                  chatBlocked={chatBlocked}
                  chatSending={chatSending}
                  fillAvailable
                />
              ) : null}

              {tab !== 'chat' ? (
                <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.panelScroll}>
                  {tab === 'actions' ? <QuickActionGrid actions={quickActions} /> : null}
                  {tab === 'polls' ? (
                    <LivePollPanel
                      poll={activePoll}
                      hasVoted={hasVotedPoll}
                      votedOptionId={votedOptionId}
                      onVote={onPollVote}
                      onCreatePoll={onCreatePoll}
                      onEndPoll={onEndPoll}
                      pollVoting={pollVoting}
                    />
                  ) : null}
                  {tab === 'gifts' ? <LiveGiftPanel giftsEnabled={giftsEnabled} /> : null}
                  {tab === 'qna' ? (
                    <LiveQnaHostPanel
                      questions={questions}
                      pinnedQuestion={pinnedQuestion ?? null}
                      loading={qnaLoading}
                      backendReady={qnaBackendReady}
                      onPin={(id) => onPinQuestion?.(id)}
                      onUnpin={(id) => onUnpinQuestion?.(id)}
                      onMarkAnswered={(id) => onMarkQuestionAnswered?.(id)}
                      onDismiss={(id) => onDismissQuestion?.(id)}
                    />
                  ) : null}
                  {tab === 'markers' ? (
                    <LiveClipMarkersHostPanel
                      markers={clipMarkers}
                      loading={clipMarkersLoading}
                      backendReady={clipMarkersBackendReady}
                      recordingActive={recordingActive}
                      onMarkMoment={onMarkMoment}
                      markMomentLoading={markMomentLoading}
                      onOpenClipStudio={onOpenClipStudio}
                      onReviewMarker={onReviewMarker}
                      reviewingMarkerId={reviewingMarkerId}
                    />
                  ) : null}
                  {tab === 'mod' ? <LiveModPanel /> : null}
                  {tab === 'health' && healthSnapshot ? (
                    <LiveStreamHealthPanel
                      snapshot={healthSnapshot}
                      onRefresh={onRefreshHealth}
                      refreshing={healthRefreshing}
                    />
                  ) : null}
                  {tab === 'settings' ? (
                    <>
                      <LiveSceneControls
                        activeMode={sceneMode}
                        onSelect={onSceneModeChange}
                        loading={sceneChanging}
                        disabled={sceneChanging}
                        hasActivePoll={hasActivePoll}
                      />
                      <LiveSettingsPanel
                        streamTitle={streamTitle}
                        recordingEnabled={recordingEnabled}
                        streamIsLive={streamIsLive}
                        viewerClipsAllowed={viewerClipsAllowed}
                        requireHostApproval={requireHostApproval}
                        allowClipDownloads={allowClipDownloads}
                        onToggleViewerClips={onToggleViewerClips}
                        onToggleRequireHostApproval={onToggleRequireHostApproval}
                        onToggleAllowClipDownloads={onToggleAllowClipDownloads}
                        togglingSetting={togglingClipSetting}
                      />
                    </>
                  ) : null}
                </ScrollView>
              ) : null}
            </StreamManagerPanelShell>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  mainColumn: { flex: 1, paddingHorizontal: 14, paddingBottom: 8 },
  topSection: { flexShrink: 0 },
  panelArea: { flex: 1, minHeight: 0 },
  panelScroll: { paddingBottom: 16 },
});

/** @deprecated import from QuickActionGrid */
export type { QuickAction } from '@/components/live/studio/QuickActionGrid';
