import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Alert, StyleSheet, Text, View } from 'react-native';
import { LiveBottomSheet } from '@/components/live/LiveBottomSheet';
import { PollWidget } from '@/components/live/PollWidget';
import { ViewerChatRail } from '@/components/live/viewer/ViewerChatRail';
import { ViewerGiftBurst } from '@/components/live/viewer/ViewerGiftBurst';
import { ViewerHostChip } from '@/components/live/viewer/ViewerHostChip';
import { ViewerLiveHud } from '@/components/live/viewer/ViewerLiveHud';
import { ViewerPollPill } from '@/components/live/viewer/ViewerPollPill';
import { ViewerSideActions } from '@/components/live/viewer/ViewerSideActions';
import { ViewerWelcomeNotice } from '@/components/live/viewer/ViewerWelcomeNotice';
import { colors, typography } from '@/theme';
import type { CreatorSummary, LiveGift, StreamMessage, StreamPinnedMessage, StreamPoll } from '@/types';

type GiftBurst = { gift: LiveGift; senderName: string; quantity: number } | null;

type Props = {
  host: CreatorSummary;
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
  onMore: () => void;
  onOpenGifts: () => void;
  onOpenSparkGift?: () => void;
  onOpenLeaderboard?: () => void;
  showLeaderboard?: boolean;
  messages: StreamMessage[];
  pinned: StreamPinnedMessage | null;
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
};

/** Immersive viewer live player — video-first with tucked-away interactions. */
export function ViewerLivePlayer({
  host,
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
  onMore,
  onOpenGifts,
  onOpenLeaderboard,
  showLeaderboard,
  messages,
  pinned,
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
}: Props) {
  const [pollSheetOpen, setPollSheetOpen] = useState(false);
  const [showWelcome, setShowWelcome] = useState(true);
  const [giftBurst, setGiftBurst] = useState<GiftBurst>(null);
  const lastGiftIdRef = React.useRef<string | null>(null);

  const liveLabel = streamConnecting ? 'CONNECTING' : streamIsLive ? 'LIVE' : 'OFFLINE';
  const canFollow = Boolean(viewerUserId && viewerUserId !== host.id);
  const chatUnavailable = !broadcastLive || Boolean(chatBlocked);

  useEffect(() => {
    try {
      const latestGift = [...messages].reverse().find((m) => m.messageType === 'gift' && m.giftData?.gift);
      if (!latestGift?.giftData?.gift || latestGift.id === lastGiftIdRef.current) return;
      lastGiftIdRef.current = latestGift.id;
      setGiftBurst({
        gift: latestGift.giftData.gift,
        senderName: latestGift.displayName,
        quantity: latestGift.giftData.quantity ?? 1,
      });
    } catch (err) {
      if (__DEV__) console.warn('[ViewerLivePlayer.giftBurst]', err);
    }
  }, [messages]);

  const handleGiftPress = useCallback(() => {
    if (!viewerUserId) {
      showToast('Sign in to send gifts', 'info');
      return;
    }
    if (!broadcastLive) {
      showToast('Gifts unlock once the host is broadcasting.', 'info');
      return;
    }
    onOpenGifts();
  }, [viewerUserId, broadcastLive, onOpenGifts, showToast]);

  const handlePollOpen = useCallback(() => {
    if (pollUnavailable) {
      showToast('Poll unavailable right now.', 'error');
      return;
    }
    if (!activePoll) {
      showToast('No active poll.', 'info');
      return;
    }
    if (!broadcastLive) {
      showToast('Polls unlock once the host is broadcasting.', 'info');
      return;
    }
    setPollSheetOpen(true);
  }, [activePoll, broadcastLive, pollUnavailable, showToast]);

  const handleInfoPress = useCallback(() => {
    Alert.alert('Community guidelines', welcomeMessage, [{ text: 'Got it', style: 'default' }]);
  }, [welcomeMessage]);

  const statusBanner = useMemo(() => {
    if (streamVideoError) {
      return streamVideoError;
    }
    if (audioUnavailable && !viewerAudioMuted) {
      return 'Audio may be unavailable — tap the speaker to retry.';
    }
    if (streamConnecting) {
      return 'Host is connecting…';
    }
    return null;
  }, [audioUnavailable, viewerAudioMuted, streamConnecting, streamVideoError]);

  return (
    <View style={styles.root} pointerEvents="box-none">
      <ViewerLiveHud
        liveLabel={liveLabel}
        viewerCount={viewerCount}
        audioMuted={viewerAudioMuted}
        onBack={onBack}
        onShare={onShare}
        onToggleAudio={onToggleAudio}
        onMore={onMore}
        showMore={Boolean(viewerUserId)}
      />

      <ViewerHostChip
        host={host}
        isFollowing={isFollowing}
        canFollow={canFollow}
        onToggleFollow={onToggleFollow}
      />

      <ViewerWelcomeNotice
        visible={showWelcome}
        message={welcomeMessage}
        onDismiss={() => setShowWelcome(false)}
      />

      {statusBanner ? (
        <View style={styles.statusBanner}>
          <Text style={styles.statusBannerTxt}>{statusBanner}</Text>
        </View>
      ) : null}

      <View style={styles.flexSpacer} pointerEvents="none" />

      <View style={styles.bottomRow}>
        <View style={styles.chatCol}>
          {activePoll ? <ViewerPollPill onPress={handlePollOpen} /> : null}
          <ViewerChatRail
            messages={messages}
            pinned={pinned}
            currentUserId={viewerUserId}
            inputText={inputText}
            onChangeInput={onChangeInput}
            onSend={onSendMessage}
            onMessageLongPress={onMessageLongPress}
            chatBlocked={chatBlocked}
            chatSending={chatSending}
            chatUnavailable={!broadcastLive}
            placeholder={broadcastLive ? 'Say something…' : 'Chat opens when live…'}
          />
        </View>
      </View>

      <ViewerSideActions
        giftsEnabled={giftsEnabled}
        onGiftPress={handleGiftPress}
        onInfoPress={handleInfoPress}
        onLeaderboardPress={onOpenLeaderboard}
        showLeaderboard={showLeaderboard}
      />

      <ViewerGiftBurst
        gift={giftBurst?.gift ?? null}
        senderName={giftBurst?.senderName}
        quantity={giftBurst?.quantity}
        onDone={() => setGiftBurst(null)}
      />

      <LiveBottomSheet
        visible={pollSheetOpen && !!activePoll}
        onClose={() => setPollSheetOpen(false)}
        title="Live poll"
        maxHeightRatio={0.42}
      >
        {activePoll ? (
          <PollWidget
            poll={activePoll}
            onVote={onPollVote}
            hasVoted={hasVotedPoll}
            votedOptionId={votedOptionId}
            votingDisabled={pollVoting}
            compact
          />
        ) : null}
      </LiveBottomSheet>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    paddingHorizontal: 12,
    zIndex: 20,
  },
  flexSpacer: { flex: 1, minHeight: 80 },
  bottomRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: 8,
    paddingBottom: 4,
  },
  chatCol: {
    flex: 1,
    minWidth: 0,
    maxWidth: '88%',
  },
  statusBanner: {
    alignSelf: 'center',
    marginTop: 8,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 999,
    backgroundColor: 'rgba(15,28,48,0.72)',
    borderWidth: 1,
    borderColor: 'rgba(56,189,248,0.22)',
  },
  statusBannerTxt: {
    ...typography.caption,
    fontSize: 11,
    fontWeight: '700',
    color: colors.neutral.white,
  },
});
