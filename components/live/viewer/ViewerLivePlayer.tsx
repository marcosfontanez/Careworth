import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { LiveBottomSheet } from '@/components/live/LiveBottomSheet';
import { LiveChatPanel } from '@/components/live/studio/LiveChatPanel';
import { PollWidget } from '@/components/live/PollWidget';
import { LiveGiftDrawer, type LiveGiftSentPayload } from '@/components/live/viewer/LiveGiftDrawer';
import { LiveGiftOverlay } from '@/components/gifts/LiveGiftOverlay';
import { LiveGiftSentBanner } from '@/components/live/viewer/LiveGiftSentBanner';
import { LivePinnedOverlay } from '@/components/live/viewer/LivePinnedOverlay';
import { LiveQnaViewerPanel } from '@/components/live/viewer/LiveQnaViewerPanel';
import { PulseTapButton } from '@/components/live/viewer/PulseTapButton';
import { PulseTapOverlay } from '@/components/live/viewer/PulseTapOverlay';
import { ViewerClipMomentSheet, type ViewerClipDurationChoice } from '@/components/live/viewer/ViewerClipMomentSheet';
import { ViewerLiveBottomBar } from '@/components/live/viewer/ViewerLiveBottomBar';
import { ViewerLiveHud } from '@/components/live/viewer/ViewerLiveHud';
import { ViewerStreamInfoPanel } from '@/components/live/viewer/ViewerStreamInfoPanel';
import { useRouter } from 'expo-router';
import { openPulsePage } from '@/lib/navigation/pulsePageRoutes';
import { usePulseTapReaction } from '@/hooks/usePulseTapReaction';
import { pulseColors, pulseRadius, pulseSpacing, pulseTypography } from '@/lib/theme/pulseTheme';
import type { CreatorSummary, StreamMessage, StreamPinnedMessage, StreamPoll } from '@/types';
import type { ShopItemRow } from '@/lib/shop/types';
import type { StreamQuestion } from '@/services/supabase/streamQuestions';

type GiftOverlayPayload = {
  giftSlug: string;
  giftName: string;
  shopItem: ShopItemRow | null;
  senderName: string;
} | null;

type Props = {
  host: CreatorSummary;
  streamId: string;
  streamTitle?: string;
  viewerUserId?: string;
  isFollowing: boolean;
  onToggleFollow: () => void;
  viewerCount: number;
  broadcastLive: boolean;
  streamIsLive: boolean;
  giftsEnabled: boolean;
  viewerAudioMuted: boolean;
  onToggleAudio: () => void;
  onBack: () => void;
  onShare: () => void;
  onReportStream?: () => void;
  onBlockHost?: () => void;
  messages: StreamMessage[];
  pinned: StreamPinnedMessage | null;
  pinnedQuestion?: StreamQuestion | null;
  inputText: string;
  onChangeInput: (text: string) => void;
  onSendMessage: () => void;
  onMessageLongPress: (msg: StreamMessage) => void;
  chatBlocked?: boolean;
  chatSending?: boolean;
  activePoll: StreamPoll | null;
  hasVotedPoll: boolean;
  votedOptionId?: string;
  onPollVote: (optionId: string) => void;
  pollVoting?: boolean;
  pollUnavailable?: boolean;
  audioUnavailable?: boolean;
  streamConnecting?: boolean;
  streamVideoError?: string | null;
  showToast: (msg: string, type: 'success' | 'error' | 'info') => void;
  welcomeMessage?: string;
  questions?: StreamQuestion[];
  qnaBackendReady?: boolean;
  onSubmitQuestion?: (question: string) => Promise<boolean>;
  questionSubmitting?: boolean;
  onGiftSent?: (payload?: LiveGiftSentPayload) => void;
  onOpenLeaderboard?: () => void;
  showLeaderboard?: boolean;
  viewerClipsAllowed?: boolean;
  clipMarkersBackendReady?: boolean;
  onSaveClipMoment?: (duration: ViewerClipDurationChoice) => Promise<boolean>;
  clipMomentLoading?: boolean;
};

/** Immersive viewer live player — video-first with sheet-based interactions. */
export function ViewerLivePlayer({
  host,
  streamId,
  streamTitle,
  viewerUserId,
  isFollowing,
  onToggleFollow,
  viewerCount,
  broadcastLive,
  streamIsLive,
  giftsEnabled,
  viewerAudioMuted,
  onToggleAudio,
  onBack,
  onShare,
  onReportStream,
  onBlockHost,
  messages,
  pinned,
  pinnedQuestion,
  inputText,
  onChangeInput,
  onSendMessage,
  onMessageLongPress,
  chatBlocked,
  chatSending = false,
  activePoll,
  hasVotedPoll,
  votedOptionId,
  onPollVote,
  pollVoting = false,
  pollUnavailable,
  audioUnavailable,
  streamConnecting,
  streamVideoError,
  showToast,
  welcomeMessage = 'Welcome! Be kind and follow community guidelines.',
  questions = [],
  qnaBackendReady = true,
  onSubmitQuestion,
  questionSubmitting = false,
  onGiftSent,
  onOpenLeaderboard,
  showLeaderboard,
  viewerClipsAllowed = false,
  clipMarkersBackendReady = true,
  onSaveClipMoment,
  clipMomentLoading = false,
}: Props) {
  const [chatSheetOpen, setChatSheetOpen] = useState(false);
  const [giftSheetOpen, setGiftSheetOpen] = useState(false);
  const [pollSheetOpen, setPollSheetOpen] = useState(false);
  const [qnaSheetOpen, setQnaSheetOpen] = useState(false);
  const [moreSheetOpen, setMoreSheetOpen] = useState(false);
  const [clipSheetOpen, setClipSheetOpen] = useState(false);
  const [giftOverlay, setGiftOverlay] = useState<GiftOverlayPayload>(null);
  const [giftSentBanner, setGiftSentBanner] = useState<string | null>(null);
  const [pinDismissed, setPinDismissed] = useState(false);
  const lastGiftIdRef = useRef<string | null>(null);
  const actionLockRef = useRef(false);
  const { bursts, comboFlash, triggerPulse, dismissBurst } = usePulseTapReaction();
  const router = useRouter();

  const anySheetOpen =
    chatSheetOpen ||
    giftSheetOpen ||
    pollSheetOpen ||
    qnaSheetOpen ||
    moreSheetOpen ||
    clipSheetOpen;
  const pulseDisabled = !streamIsLive || !broadcastLive || anySheetOpen;

  const liveLabel = streamConnecting ? 'CONNECTING' : streamIsLive ? 'LIVE' : 'OFFLINE';
  const canFollow = Boolean(viewerUserId && viewerUserId !== host.id);
  const chatUnavailable = !broadcastLive || Boolean(chatBlocked);
  const hasActivePoll = Boolean(activePoll?.isActive && !pollUnavailable);
  const showPinned = Boolean((pinned || pinnedQuestion) && !pinDismissed);

  useEffect(() => {
    setPinDismissed(false);
  }, [pinned?.id, pinnedQuestion?.id]);

  useEffect(() => {
    try {
      const latestGift = [...messages].reverse().find((m) => m.messageType === 'gift' && m.giftData);
      if (!latestGift?.giftData || latestGift.id === lastGiftIdRef.current) return;
      lastGiftIdRef.current = latestGift.id;

      const slug = latestGift.giftData.creatorGiftSlug ?? latestGift.giftData.shopItem?.slug ?? 'pulse';
      const name = latestGift.giftData.gift?.name ?? latestGift.giftData.shopItem?.name ?? 'Gift';

      setGiftOverlay({
        giftSlug: slug,
        giftName: name,
        shopItem: latestGift.giftData.shopItem ?? null,
        senderName: latestGift.displayName,
      });
    } catch (err) {
      if (__DEV__) console.warn('[ViewerLivePlayer.giftOverlay]', err);
    }
  }, [messages]);

  const withActionLock = useCallback((fn: () => void) => {
    if (actionLockRef.current) return;
    actionLockRef.current = true;
    try {
      fn();
    } finally {
      setTimeout(() => {
        actionLockRef.current = false;
      }, 350);
    }
  }, []);

  const handleGiftOpen = useCallback(() => {
    withActionLock(() => {
      if (!viewerUserId) {
        showToast('Sign in to send gifts', 'info');
        return;
      }
      if (!streamIsLive) {
        showToast('This live stream has ended.', 'info');
        return;
      }
      if (!broadcastLive) {
        showToast('Gifts unlock once the host is broadcasting.', 'info');
        return;
      }
      if (!giftsEnabled) {
        showToast('Gifts are not enabled for this stream.', 'info');
        return;
      }
      setGiftSheetOpen(true);
    });
  }, [viewerUserId, streamIsLive, broadcastLive, giftsEnabled, showToast, withActionLock]);

  const handlePollQna = useCallback(() => {
    withActionLock(() => {
      if (hasActivePoll && broadcastLive) {
        setPollSheetOpen(true);
        return;
      }
      setQnaSheetOpen(true);
    });
  }, [hasActivePoll, broadcastLive, withActionLock]);

  const handleSubmitQuestion = useCallback(
    async (question: string) => {
      if (!onSubmitQuestion) return;
      try {
        const ok = await onSubmitQuestion(question);
        if (ok) showToast('Question submitted', 'success');
        else showToast('Could not submit question.', 'error');
      } catch {
        showToast('Could not submit question.', 'error');
      }
    },
    [onSubmitQuestion, showToast],
  );

  const handleSendMessage = useCallback(() => {
    if (chatSending || chatUnavailable) return;
    try {
      onSendMessage();
    } catch (err) {
      if (__DEV__) console.warn('[ViewerLivePlayer.sendMessage]', err);
      showToast('Could not send message.', 'error');
    }
  }, [chatSending, chatUnavailable, onSendMessage, showToast]);

  const statusBanner = useMemo(() => {
    if (streamVideoError) return streamVideoError;
    if (audioUnavailable && !viewerAudioMuted) {
      return 'Audio may be unavailable — tap the speaker to retry.';
    }
    if (streamConnecting) return 'Host is connecting…';
    return null;
  }, [audioUnavailable, viewerAudioMuted, streamConnecting, streamVideoError]);

  const handlePulseTap = useCallback(() => {
    try {
      triggerPulse();
    } catch (err) {
      if (__DEV__) console.warn('[ViewerLivePlayer.pulseTap]', err);
    }
  }, [triggerPulse]);

  const closeSheets = useCallback(() => {
    setChatSheetOpen(false);
    setGiftSheetOpen(false);
    setPollSheetOpen(false);
    setQnaSheetOpen(false);
    setMoreSheetOpen(false);
    setClipSheetOpen(false);
  }, []);

  const handleSaveClipMoment = useCallback(
    async (duration: ViewerClipDurationChoice) => {
      if (!onSaveClipMoment) return;
      try {
        const ok = await onSaveClipMoment(duration);
        if (ok) setClipSheetOpen(false);
      } catch (err) {
        if (__DEV__) console.warn('[ViewerLivePlayer.saveClipMoment]', err);
        showToast('Could not submit clip moment. Try again.', 'error');
      }
    },
    [onSaveClipMoment, showToast],
  );

  return (
    <View style={styles.root} pointerEvents="box-none">
      <ViewerLiveHud
        liveLabel={liveLabel}
        viewerCount={viewerCount}
        audioMuted={viewerAudioMuted}
        onBack={onBack}
        onToggleAudio={onToggleAudio}
      />

      {showPinned ? (
        <LivePinnedOverlay
          pinned={pinned}
          pinnedQuestion={pinnedQuestion}
          onDismiss={() => setPinDismissed(true)}
          onPressChat={() => setChatSheetOpen(true)}
          onPressQuestion={() => setQnaSheetOpen(true)}
        />
      ) : null}

      {statusBanner ? (
        <View style={styles.statusBanner}>
          <Text style={styles.statusBannerTxt}>{statusBanner}</Text>
        </View>
      ) : null}

      <View style={styles.flexSpacer} pointerEvents="none" />

      <PulseTapOverlay bursts={bursts} onBurstDone={dismissBurst} />

      <ViewerLiveBottomBar
        inputText={inputText}
        onChangeInput={onChangeInput}
        onSend={handleSendMessage}
        onOpenChatSheet={() => setChatSheetOpen(true)}
        onOpenGifts={handleGiftOpen}
        onPollQna={handlePollQna}
        onOpenMore={() => setMoreSheetOpen(true)}
        onOpenClipSheet={() => setClipSheetOpen(true)}
        clipSaving={clipMomentLoading}
        giftsEnabled={giftsEnabled}
        hasActivePoll={hasActivePoll}
        chatUnavailable={chatUnavailable}
        chatSending={chatSending}
        disabled={!streamIsLive}
        useSheetComposer={chatSheetOpen}
      />

      <PulseTapButton
        onPress={handlePulseTap}
        disabled={pulseDisabled}
        comboFlash={comboFlash}
      />

      {giftSentBanner ? (
        <LiveGiftSentBanner message={giftSentBanner} onDone={() => setGiftSentBanner(null)} />
      ) : null}

      <LiveGiftOverlay
        giftSlug={giftOverlay?.giftSlug ?? ''}
        giftName={giftOverlay?.giftName ?? ''}
        shopItem={giftOverlay?.shopItem ?? null}
        senderName={giftOverlay?.senderName}
        onDone={() => setGiftOverlay(null)}
      />

      <LiveBottomSheet
        visible={chatSheetOpen}
        onClose={() => setChatSheetOpen(false)}
        title="Live chat"
        maxHeightRatio={0.72}
        composerSheet
      >
        <LiveChatPanel
          messages={messages}
          pinned={pinned}
          currentUserId={viewerUserId}
          inputText={inputText}
          onChangeInput={onChangeInput}
          onSend={() => {
            handleSendMessage();
          }}
          onUnpin={() => {}}
          onMessageLongPress={onMessageLongPress}
          onPressUser={(msg) => {
            setChatSheetOpen(false);
            openPulsePage(router, msg.userId);
          }}
          chatBlocked={chatBlocked}
          chatSending={chatSending}
          fillAvailable
          inSheet
        />
      </LiveBottomSheet>

      <LiveBottomSheet visible={giftSheetOpen} onClose={() => setGiftSheetOpen(false)} title="Send a gift" maxHeightRatio={0.78} scrollable>
        {giftsEnabled && viewerUserId ? (
          <LiveGiftDrawer
            streamId={streamId}
            streamStatus={streamIsLive ? 'live' : 'ended'}
            broadcastLive={broadcastLive}
            creatorUserId={host.id}
            creatorDisplayName={host.displayName}
            creatorHandle={host.username ?? null}
            showToast={showToast}
            onClose={() => setGiftSheetOpen(false)}
            onSent={(payload) => {
              try {
                setGiftOverlay({
                  giftSlug: payload.giftSlug,
                  giftName: payload.giftName,
                  shopItem: payload.shopItem,
                  senderName: 'You',
                });
                setGiftSentBanner('Gift sent!');
                onGiftSent?.(payload);
                setGiftSheetOpen(false);
              } catch (err) {
                if (__DEV__) console.warn('[ViewerLivePlayer.onGiftSent]', err);
              }
            }}
          />
        ) : null}
      </LiveBottomSheet>

      <LiveBottomSheet
        visible={pollSheetOpen && !!activePoll}
        onClose={() => setPollSheetOpen(false)}
        title="Live poll"
        maxHeightRatio={0.68}
        scrollable
      >
        {activePoll ? (
          <PollWidget
            poll={activePoll}
            onVote={onPollVote}
            hasVoted={hasVotedPoll}
            votedOptionId={votedOptionId}
            votingDisabled={pollVoting}
          />
        ) : null}
      </LiveBottomSheet>

      <LiveBottomSheet visible={qnaSheetOpen} onClose={() => setQnaSheetOpen(false)} title="Q&A" maxHeightRatio={0.58} scrollable>
        <LiveQnaViewerPanel
          questions={questions}
          pinnedQuestion={pinnedQuestion ?? null}
          viewerUserId={viewerUserId}
          broadcastLive={broadcastLive}
          streamIsLive={streamIsLive}
          submitting={questionSubmitting}
          backendReady={qnaBackendReady}
          onSubmit={handleSubmitQuestion}
        />
      </LiveBottomSheet>

      <LiveBottomSheet
        visible={clipSheetOpen}
        onClose={() => setClipSheetOpen(false)}
        title="Clip moment"
        maxHeightRatio={0.52}
      >
        <ViewerClipMomentSheet
          signedIn={Boolean(viewerUserId)}
          clipsAllowed={viewerClipsAllowed}
          broadcastLive={broadcastLive}
          streamIsLive={streamIsLive}
          backendReady={clipMarkersBackendReady}
          saving={clipMomentLoading}
          onSave={handleSaveClipMoment}
        />
      </LiveBottomSheet>

      <LiveBottomSheet visible={moreSheetOpen} onClose={() => setMoreSheetOpen(false)} title="Stream info" maxHeightRatio={0.52} scrollable>
        <ViewerStreamInfoPanel
          host={host}
          streamTitle={streamTitle}
          viewerCount={viewerCount}
          welcomeMessage={welcomeMessage}
          isFollowing={isFollowing}
          canFollow={canFollow}
          onToggleFollow={onToggleFollow}
          onOpenHostProfile={() => {
            closeSheets();
            openPulsePage(router, host.id);
          }}
          onShare={() => {
            closeSheets();
            onShare();
          }}
          onOpenLeaderboard={
            showLeaderboard && onOpenLeaderboard
              ? () => {
                  closeSheets();
                  onOpenLeaderboard();
                }
              : undefined
          }
          onOpenQna={
            qnaBackendReady
              ? () => {
                  closeSheets();
                  setQnaSheetOpen(true);
                }
              : undefined
          }
          qnaAvailable={qnaBackendReady && streamIsLive}
          showLeaderboard={showLeaderboard}
          signedIn={Boolean(viewerUserId)}
          onReportStream={
            onReportStream
              ? () => {
                  closeSheets();
                  onReportStream();
                }
              : undefined
          }
          onBlockHost={
            onBlockHost
              ? () => {
                  closeSheets();
                  onBlockHost();
                }
              : undefined
          }
        />
      </LiveBottomSheet>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    paddingHorizontal: pulseSpacing.md,
    position: 'relative',
    zIndex: 20,
  },
  flexSpacer: { flex: 1, minHeight: 48 },
  statusBanner: {
    alignSelf: 'center',
    marginTop: pulseSpacing.sm,
    paddingHorizontal: pulseSpacing.md,
    paddingVertical: 6,
    borderRadius: pulseRadius.full,
    backgroundColor: pulseColors.glass,
    borderWidth: 1,
    borderColor: pulseColors.borderStrong,
  },
  statusBannerTxt: {
    ...pulseTypography.caption,
    fontWeight: '700',
    color: pulseColors.text,
  },
});
