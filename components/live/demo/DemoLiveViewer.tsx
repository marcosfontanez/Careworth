/**
 * Demo / founder-preview live viewer for `demo-live-*` stream IDs.
 * Uses mock chat + hub metadata; gifts reuse {@link SendCreatorGiftTray} /
 * {@link GiftPicker} (real billing may reject unknown stream IDs — OK for demo).
 *
 * Clips: navigates to `/live/highlights` (placeholder screen). Full encoder + CDN TBD.
 *
 * Learn UI: `demoViewerLearn.tsx`. Shop UI: `demoViewerCommerce.tsx`.
 */
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  KeyboardAvoidingView,
  Platform,
  Share,
  Alert,
  Dimensions,
} from 'react-native';
import { Image } from 'expo-image';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import * as Haptics from 'expo-haptics';
import { useQuery } from '@tanstack/react-query';
import { useAuth } from '@/contexts/AuthContext';
import { useAppStore } from '@/store/useAppStore';
import { LoadingState } from '@/components/ui/LoadingState';
import { pulseImageFeedHeroProps } from '@/lib/pulseImage';
import { GiftPicker } from '@/components/live/GiftPicker';
import { SendCreatorGiftTray } from '@/components/shop/SendCreatorGiftTray';
import { LiveChatList } from '@/components/live/LiveChat';
import { colors, pulseverse } from '@/theme';
import { AccentComposerFrame } from '@/components/ui/AccentComposerFrame';
import { useToast } from '@/components/ui/Toast';
import { liveHighlightsHref } from '@/lib/navigation/liveRoutes';
import { getLiveHubStreamById } from '@/services/live/liveHubService';
import { getDemoComments, getDemoQuestions } from '@/services/live/mockLiveHubData';
import { liveShopService } from '@/services/live/liveShopService';
import { useSparkWallet, useSparkBalanceNumber } from '@/hooks/useShopEconomy';
import type { LiveProduct } from '@/types/liveHub';
import type { StreamMessage } from '@/types';
import { DemoLearnTabs, DemoLearnPanel, type LearnSeg } from '@/components/live/demo/demoViewerLearn';
import {
  DemoLiveViewerTopBar,
  DemoLiveSessionBlock,
} from '@/components/live/demo/demoViewerChrome';
import {
  DemoFlashDealBanner,
  DemoAffiliateDisclosurePill,
  DemoSellerTrustRow,
  DemoPinnedProductRow,
  DemoLiveProductTrayModal,
} from '@/components/live/demo/demoViewerCommerce';

const { height: SCREEN_H } = Dimensions.get('window');
const CHAT_MAX_H = SCREEN_H * 0.36;
const CHAT_LIST_H = CHAT_MAX_H - 52;

export function DemoLiveViewer({ streamId }: { streamId: string }) {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { user, profile } = useAuth();
  const showToast = useToast((s) => s.show);
  const walletQ = useSparkWallet(user?.id);
  const sparkBalance = useSparkBalanceNumber(walletQ.data);

  const q = useQuery({
    queryKey: ['liveHubStream', streamId],
    queryFn: () => getLiveHubStreamById(streamId),
  });

  const stream = q.data;

  const followedCreatorIds = useAppStore((s) => s.followedCreatorIds);
  const setCreatorFollowed = useAppStore((s) => s.setCreatorFollowed);
  const isFollowing = stream ? followedCreatorIds.has(stream.host.id) : false;

  const [viewerCount, setViewerCount] = useState(stream?.viewerCount ?? 0);
  useEffect(() => {
    if (stream) setViewerCount(stream.viewerCount);
  }, [stream]);

  const [messages, setMessages] = useState<StreamMessage[]>([]);
  useEffect(() => {
    const demo = getDemoComments(streamId).map(
      (c) =>
        ({
          id: c.id,
          streamId,
          userId: c.userId,
          displayName: c.userName,
          avatarUrl: c.avatar,
          content: c.message,
          isHost: !!c.isHost,
          isModerator: !!c.isModerator,
          createdAt: c.timestamp,
          messageType: 'chat',
        }) satisfies StreamMessage,
    );
    setMessages(demo.length ? demo : []);
  }, [streamId]);

  const [inputText, setInputText] = useState('');
  const [learnSeg, setLearnSeg] = useState<LearnSeg>('chat');
  const [productTrayOpen, setProductTrayOpen] = useState(false);
  const [sparkGiftOpen, setSparkGiftOpen] = useState(false);
  const [showGiftPicker, setShowGiftPicker] = useState(false);

  const questions = useMemo(() => getDemoQuestions(streamId), [streamId]);
  const [qVotes, setQVotes] = useState<Record<string, number>>({});

  const products = useMemo(() => {
    return stream?.products ?? [];
  }, [stream]);

  const pinnedProduct = useMemo(() => {
    if (!stream?.pinnedProductId) return products[0] ?? null;
    return products.find((p) => p.id === stream.pinnedProductId) ?? products[0] ?? null;
  }, [stream, products]);

  const sendDemoChat = useCallback(() => {
    const body = inputText.trim().slice(0, 280);
    if (!body) return;
    setInputText('');
    const optimistic: StreamMessage = {
      id: `demo-${Date.now()}`,
      streamId,
      userId: user?.id ?? 'guest',
      displayName: profile?.displayName ?? 'You',
      avatarUrl: profile?.avatarUrl,
      content: body,
      isHost: false,
      isModerator: false,
      createdAt: new Date().toISOString(),
      messageType: 'chat',
    };
    setMessages((prev) => [...prev.slice(-120), optimistic]);
  }, [inputText, streamId, user?.id, profile?.displayName, profile?.avatarUrl]);

  const toggleFollow = useCallback(() => {
    if (!stream || !user?.id || user.id === stream.host.id) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setCreatorFollowed(stream.host.id, !isFollowing);
    showToast(isFollowing ? 'Unfollowed (demo)' : 'Following (demo)', 'info');
  }, [stream, user?.id, isFollowing, setCreatorFollowed, showToast]);

  const handleShare = useCallback(async () => {
    if (!stream) return;
    try {
      await Share.share({
        message: `Watch ${stream.host.displayName} on PulseVerse Live: ${stream.title}`,
      });
    } catch {
      showToast('Share cancelled', 'info');
    }
  }, [stream, showToast]);

  const clipPlaceholder = useCallback(() => {
    router.push(liveHighlightsHref(streamId));
  }, [router, streamId]);

  const handleQuestionUpvote = useCallback((questionId: string, baseUpvotes: number) => {
    setQVotes((v) => ({
      ...v,
      [questionId]: (v[questionId] ?? baseUpvotes) + 1,
    }));
  }, []);

  const handleTrayViewProduct = useCallback(
    async (item: LiveProduct) => {
      if (!stream) return;
      const session = await liveShopService.requestCheckout({
        streamId,
        productId: item.id,
        quantity: 1,
        disclosureType: stream.disclosureType ?? undefined,
      });
      if (session?.checkoutUrl) {
        showToast('Opening checkout…', 'success');
      } else {
        showToast('Checkout pipeline TODO (Stripe / shop_orders)', 'info');
      }
    },
    [streamId, stream, showToast],
  );

  if (q.isLoading || !stream) return <LoadingState />;

  const mode = stream.liveType;
  const showShopLayer = mode === 'shop' && products.length > 0 && pinnedProduct;

  const gamingCaption =
    mode === 'gaming' && stream.gameTitle ? (
      <View style={styles.gameCap}>
        <Ionicons name="game-controller" size={14} color={pulseverse.electric} />
        <Text style={styles.gameCapTxt}>{stream.gameTitle}</Text>
      </View>
    ) : null;

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <Image
        source={{ uri: stream.thumbnailUrl }}
        style={styles.streamBg}
        contentFit="cover"
        {...pulseImageFeedHeroProps}
      />
      <LinearGradient
        colors={['rgba(6,14,26,0.75)', 'rgba(6,14,26,0.15)', 'rgba(6,14,26,0.92)']}
        locations={[0, 0.35, 1]}
        style={StyleSheet.absoluteFill}
      />

      <View style={[styles.shell, { paddingTop: insets.top }]}>
        <DemoLiveViewerTopBar
          viewerCount={viewerCount}
          onClose={() => router.back()}
          onClip={clipPlaceholder}
        />

        <View style={styles.flexSpacer} />

        {stream.flashDealEndsAt && mode === 'shop' ? (
          <View style={{ paddingHorizontal: 14 }}>
            <DemoFlashDealBanner endsAt={stream.flashDealEndsAt} />
          </View>
        ) : null}

        {stream.disclosureType ? (
          <View style={{ paddingHorizontal: 14, marginTop: 8 }}>
            <DemoAffiliateDisclosurePill type={stream.disclosureType} />
          </View>
        ) : null}

        {stream.sellerVerified ? <DemoSellerTrustRow /> : null}

        <DemoLiveSessionBlock
          mode={mode}
          title={stream.title}
          host={stream.host}
          viewerUserId={user?.id}
          isFollowing={isFollowing}
          onToggleFollow={toggleFollow}
          gamingCaption={gamingCaption}
        />

        {mode === 'learn' ? <DemoLearnTabs learnSeg={learnSeg} onChange={setLearnSeg} /> : null}
        {mode === 'learn' ? (
          <DemoLearnPanel
            learnSeg={learnSeg}
            questions={questions}
            qVotes={qVotes}
            onUpvote={handleQuestionUpvote}
          />
        ) : null}

        {showShopLayer && pinnedProduct ? (
          <DemoPinnedProductRow
            product={pinnedProduct}
            onOpen={() => setProductTrayOpen(true)}
            onBag={() => setProductTrayOpen(true)}
            onQuickAdd={() =>
              showToast(`Quick add: ${pinnedProduct.title} (demo — checkout later)`, 'success')
            }
          />
        ) : null}

        <View style={[styles.actionRail, { bottom: insets.bottom + 88 }]}>
          <TouchableOpacity style={styles.railBtn} onPress={() => showToast('Liked', 'success')}>
            <Ionicons name="heart-outline" size={24} color="#FFF" />
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.railBtn}
            onPress={() => {
              if (!user?.id) {
                showToast('Sign in to send gifts', 'error');
                return;
              }
              setSparkGiftOpen(true);
            }}
          >
            <Ionicons name="gift-outline" size={24} color={colors.primary.gold} />
          </TouchableOpacity>
          <TouchableOpacity style={styles.railBtn} onPress={handleShare}>
            <Ionicons name="share-social-outline" size={22} color="#FFF" />
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.railBtn}
            onPress={() =>
              Alert.alert('More', undefined, [
                {
                  text: 'Create clip',
                  onPress: clipPlaceholder,
                },
                { text: 'Report (demo)', onPress: () => {} },
                { text: 'Quality', onPress: () => {} },
                { text: 'Cancel', style: 'cancel' },
              ])
            }
          >
            <Ionicons name="ellipsis-horizontal" size={22} color="#FFF" />
          </TouchableOpacity>
        </View>

        {learnSeg === 'chat' || mode !== 'learn' ? (
          <View style={[styles.chatColumn, { paddingBottom: insets.bottom + 8, maxHeight: CHAT_MAX_H }]}>
            <View style={{ height: CHAT_LIST_H }}>
              <LiveChatList messages={messages} pinned={null} isHost={false} />
            </View>
            <View style={styles.chatInputRow}>
              <View style={styles.viewerGiftBtns}>
                <TouchableOpacity
                  style={styles.giftBtn}
                  onPress={() => {
                    if (!user?.id) {
                      showToast('Sign in to send gifts', 'error');
                      return;
                    }
                    setSparkGiftOpen(true);
                  }}
                >
                  <Ionicons name="gift-outline" size={18} color={colors.primary.teal} />
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.giftBtn}
                  onPress={() => {
                    if (!user?.id) {
                      showToast('Sign in to send gifts', 'error');
                      return;
                    }
                    setShowGiftPicker(true);
                  }}
                >
                  <Ionicons name="flash" size={18} color={colors.status.premium} />
                </TouchableOpacity>
              </View>
              <AccentComposerFrame accentColor={colors.primary.teal} compact noShadow style={{ flex: 1 }}>
                <TextInput
                  style={styles.input}
                  placeholder="Send a message…"
                  placeholderTextColor={colors.dark.textMuted}
                  value={inputText}
                  onChangeText={setInputText}
                  onSubmitEditing={sendDemoChat}
                  returnKeyType="send"
                />
              </AccentComposerFrame>
            </View>
          </View>
        ) : null}
      </View>

      <GiftPicker
        visible={showGiftPicker}
        sparkBalance={sparkBalance}
        onClose={() => setShowGiftPicker(false)}
        onSendGift={(_gift, _quantity) => {
          showToast('Sticker gifts require a live_streams row (demo uses mock id).', 'info');
          setShowGiftPicker(false);
        }}
      />

      <SendCreatorGiftTray
        visible={sparkGiftOpen}
        onClose={() => setSparkGiftOpen(false)}
        creatorUserId={stream.host.id}
        creatorDisplayName={stream.host.displayName}
        creatorAvatarUrl={stream.host.avatarUrl}
        contextType="live"
        contextId={streamId}
      />

      <DemoLiveProductTrayModal
        visible={productTrayOpen}
        onClose={() => setProductTrayOpen(false)}
        products={products}
        bottomInset={insets.bottom}
        onQuickAdd={(item) => showToast(`Added ${item.title} (demo cart)`, 'success')}
        onViewProduct={handleTrayViewProduct}
      />
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.dark.bg },
  streamBg: { ...StyleSheet.absoluteFillObject },
  shell: { flex: 1 },
  flexSpacer: { flex: 1 },

  gameCap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 999,
    backgroundColor: 'rgba(15,23,42,0.55)',
  },
  gameCapTxt: { fontSize: 12, fontWeight: '700', color: colors.dark.textSecondary },

  actionRail: {
    position: 'absolute',
    right: 10,
    gap: 14,
  },
  railBtn: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(0,0,0,0.35)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.12)',
  },

  chatColumn: {},
  chatInputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 10,
    paddingTop: 8,
  },
  viewerGiftBtns: { flexDirection: 'row', gap: 6 },
  giftBtn: {
    width: 40,
    height: 40,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(0,0,0,0.35)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
  },
  input: {
    paddingHorizontal: 12,
    paddingVertical: Platform.OS === 'ios' ? 10 : 8,
    color: '#FFF',
    fontSize: 15,
  },
});
