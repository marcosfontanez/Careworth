import React, { useEffect, useRef, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  TextInput,
  Pressable,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { colors, borderRadius, layout, pulseverse, semantic, shadows, gradients, spacing } from '@/theme';
import { pulseImageListThumbProps } from '@/lib/pulseImage';
import type { ShopItemRow, GiftContext } from '@/lib/shop/types';
import { buildSparkPackStoreIdsForStaff } from '@/lib/shop/buildSparkPackStoreIdsForStaff';
import type { PurchaseOutcome } from '@/services/shop/purchaseService';
import type { IapPurchaseStage } from '@/lib/shop/iap';
import { useAuth } from '@/contexts/AuthContext';
import { useProfileByHandle } from '@/hooks/useShopEconomy';
import { profilesService } from '@/services/supabase/profiles';
import type { UserProfile } from '@/types';
import { shopErrorHint } from '@/lib/shop/shopErrors';
import { ringPreviewColor } from '@/lib/shop/catalogUtils';
import { BorderRarityBadge } from '@/components/shop/border/BorderRarityBadge';
import { BorderCompactMetaRow } from '@/components/shop/border/BorderCompactMetaRow';
import { BorderPreviewPlate } from '@/components/shop/border/BorderPreviewPlate';
import { useToast } from '@/components/ui/Toast';
import { CreatorGiftOrb } from '@/components/shop/CreatorGiftOrb';
import { CREATOR_GIFT_TIER_META, creatorGiftTierForItem } from '@/lib/shop/creatorGiftTiers';

function normalizeHandle(raw: string): string {
  return raw.replace(/^@/, '').trim().toLowerCase();
}

function formatGiftContexts(ctx: GiftContext[] | null | undefined): string {
  if (!ctx?.length) return 'Live, posts, and profiles';
  const parts = ctx.map((c) => (c === 'post' ? 'posts' : c === 'live' ? 'live streams' : 'profiles'));
  return parts.join(', ');
}

/**
 * Optional progress callback contract — `onPurchase` may accept an `opts`
 * argument with `onStage`. The modal will route stage transitions to that
 * callback so the button label reflects the real IAP state. The callback is
 * optional so any existing inline runner that ignores it still compiles.
 */
type PurchaseRunner = (opts?: { onStage?: (stage: IapPurchaseStage) => void }) => Promise<PurchaseOutcome>;

type BuyProps = {
  visible: boolean;
  onClose: () => void;
  borderName: string;
  onPurchase: PurchaseRunner;
  /** Fulfilled purchase payload from Edge/RPC (e.g. `purchase_receipt_id`). */
  onSuccess?: (data: Record<string, unknown>) => void;
  /** 'free' = RPC claim (migration 125); default = App Store / Play Billing */
  purchaseMode?: 'iap' | 'free';
};

/** Direct IAP confirmation, or one-tap free claim for metadata.free_in_shop borders. */
export function BorderBuyConfirmModal({
  visible,
  onClose,
  borderName,
  onPurchase,
  onSuccess,
  purchaseMode = 'iap',
}: BuyProps) {
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  /**
   * Stage label (Creator Hub audit issue #1).
   * Real stage transitions come from `purchaseService` → `purchaseSku` via the
   * `onStage` callback. The watchdog timer below is a safety net for the case
   * where the callback never fires (e.g. native event lag) — it advances the
   * label so the button never looks frozen after Apple auth.
   */
  const [realStage, setRealStage] = useState<IapPurchaseStage | null>(null);
  const [watchdogStage, setWatchdogStage] = useState<0 | 1 | 2 | 3>(0);

  useEffect(() => {
    if (!visible) {
      setBusy(false);
      setErr(null);
      setRealStage(null);
      setWatchdogStage(0);
    }
  }, [visible]);

  useEffect(() => {
    if (!busy) {
      setWatchdogStage(0);
      return;
    }
    const t1 = setTimeout(() => setWatchdogStage(1), 4_000);
    const t2 = setTimeout(() => setWatchdogStage(2), 12_000);
    const t3 = setTimeout(() => setWatchdogStage(3), 30_000);
    return () => {
      clearTimeout(t1);
      clearTimeout(t2);
      clearTimeout(t3);
    };
  }, [busy]);

  const realStageLabel: string | null =
    realStage === 'requesting'
      ? 'Opening App Store…'
      : realStage === 'awaiting_store'
        ? 'Waiting for Apple to confirm payment…'
        : realStage === 'validating'
          ? 'Verifying purchase…'
          : realStage === 'fulfilled'
            ? 'Almost done…'
            : realStage === 'pending'
              ? 'Purchase pending approval…'
              : null;

  const watchdogStageLabel =
    watchdogStage === 0
      ? null
      : watchdogStage === 1
        ? 'Connecting to App Store…'
        : watchdogStage === 2
          ? 'Verifying purchase…'
          : 'Still waiting on the store…';

  /** Real stage takes precedence — fall back to watchdog if real stage hasn't arrived. */
  const stageLabel = realStageLabel ?? watchdogStageLabel;

  const run = async () => {
    setErr(null);
    setBusy(true);
    setRealStage(null);
    try {
      const r = await onPurchase({ onStage: (s) => setRealStage(s) });
      if (!r.ok) {
        void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
        setErr(shopErrorHint(r.code) || r.message);
        return;
      }
      onSuccess?.(r.data);
      onClose();
    } finally {
      setBusy(false);
    }
  };

  return (
    <Modal visible={visible} animationType="fade" transparent statusBarTranslucent onRequestClose={onClose}>
      <Pressable style={styles.backdrop} onPress={busy ? undefined : onClose}>
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
          <Pressable onPress={(e) => e.stopPropagation()} style={styles.sheet}>
            <LinearGradient
              colors={[...gradients.economyIap]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={styles.sheetAccentStripe}
            />
            <View style={styles.modeRow}>
              {purchaseMode === 'free' ? (
                <View style={styles.modeBadgeFree}>
                  <Ionicons name="gift-outline" size={14} color="#86EFAC" />
                  <Text style={styles.modeBadgeFreeText}>Free</Text>
                </View>
              ) : (
                <View style={styles.modeBadgeIap}>
                  <Ionicons name="storefront-outline" size={14} color="#FDE68A" />
                  <Text style={styles.modeBadgeIapText}>Store purchase</Text>
                </View>
              )}
            </View>
            <Text style={styles.sheetTitle}>{purchaseMode === 'free' ? `Claim ${borderName}?` : `Buy ${borderName}?`}</Text>
            <Text style={styles.sheetBody}>
              {purchaseMode === 'free'
                ? 'This border is free — add it to your collection with one tap. No app store checkout.'
                : 'Borders are purchased directly through your app store. You’ll confirm price and payment on the next step.'}
            </Text>
            {err ? <Text style={styles.errorText}>{err}</Text> : null}
            {busy && stageLabel ? (
              <Text style={styles.stageLabel}>{stageLabel}</Text>
            ) : null}
            <View style={styles.sheetActions}>
              <TouchableOpacity style={styles.secondaryBtn} onPress={onClose} disabled={busy} activeOpacity={0.88}>
                <Text style={styles.secondaryBtnText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.primaryBtn, busy && styles.primaryBtnDisabled]}
                onPress={run}
                disabled={busy}
                activeOpacity={0.88}
              >
                {busy ? (
                  <ActivityIndicator color={pulseverse.onElectric} />
                ) : (
                  <Text style={styles.primaryBtnText}>{purchaseMode === 'free' ? 'Claim free' : 'Continue'}</Text>
                )}
              </TouchableOpacity>
            </View>
          </Pressable>
        </KeyboardAvoidingView>
      </Pressable>
    </Modal>
  );
}

type PurchaseChoiceProps = {
  visible: boolean;
  onClose: () => void;
  border: ShopItemRow;
  collectionName?: string | null;
  onChooseSelf: () => void;
  onChooseGift: () => void;
};

/** After tapping Purchase on a paid shop border — user picks self checkout vs gift checkout. */
export function BorderPurchaseChoiceModal({
  visible,
  onClose,
  border,
  collectionName,
  onChooseSelf,
  onChooseGift,
}: PurchaseChoiceProps) {
  const ring = ringPreviewColor(border);
  return (
    <Modal visible={visible} animationType="fade" transparent statusBarTranslucent onRequestClose={onClose}>
      <Pressable style={styles.backdrop} onPress={onClose}>
        <Pressable onPress={(e) => e.stopPropagation()} style={styles.sheet}>
          <LinearGradient
            colors={[...gradients.economyIap]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={styles.sheetAccentStripe}
          />
          <View style={styles.modeRow}>
            <View style={styles.modeBadgeIap}>
              <Ionicons name="storefront-outline" size={14} color="#FDE68A" />
              <Text style={styles.modeBadgeIapText}>Checkout</Text>
            </View>
          </View>
          <Text style={styles.sheetTitle}>Who gets this border?</Text>
          <Text style={styles.sheetBody}>
            Next step is your app store payment. Choose whether this border unlocks for you or a gift recipient.
          </Text>
          <View style={styles.borderGiftHero}>
            <BorderPreviewPlate
              ringColor={ring}
              size={56}
              rankPlace={border.rank_place}
              showMotionHint={
                border.visual_tier === 'animated' ||
                border.visual_tier === 'reactive' ||
                border.is_animated === true
              }
              shopItem={border}
            />
            <View style={styles.borderGiftHeroCopy}>
              <BorderRarityBadge item={border} compact />
              {collectionName ? (
                <Text style={styles.borderGiftCollection} numberOfLines={2}>
                  {collectionName}
                </Text>
              ) : null}
              <BorderCompactMetaRow item={border} compact />
            </View>
          </View>
          <View style={styles.purchaseChoiceStack}>
            <TouchableOpacity
              style={styles.purchaseChoicePrimary}
              onPress={() => {
                void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                onChooseSelf();
              }}
              activeOpacity={0.88}
              accessibilityLabel="Keep border for myself"
            >
              <Ionicons name="person-outline" size={18} color={pulseverse.onElectric} style={{ marginRight: 8 }} />
              <Text style={styles.purchaseChoicePrimaryText}>Keep for myself</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.purchaseChoiceGift}
              onPress={() => {
                void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
                onChooseGift();
              }}
              activeOpacity={0.88}
              accessibilityLabel="Gift border to someone"
            >
              <Ionicons name="gift-outline" size={18} color="#FDE68A" style={{ marginRight: 8 }} />
              <Text style={styles.purchaseChoiceGiftText}>Gift to someone</Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={onClose} style={styles.purchaseChoiceCancel} activeOpacity={0.88}>
              <Text style={styles.purchaseChoiceCancelText}>Cancel</Text>
            </TouchableOpacity>
          </View>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

type GiftBorderProps = {
  visible: boolean;
  onClose: () => void;
  border: ShopItemRow;
  collectionName?: string | null;
  onPurchaseGift: (handle: string, note: string | null) => Promise<PurchaseOutcome>;
  onSuccess?: (recipientHandle: string) => void;
};

/**
 * Enter @handle → confirm recipient (resolved via Supabase) → optional note → IAP + fulfillment.
 */
export function BorderGiftRecipientModal({
  visible,
  onClose,
  border,
  collectionName,
  onPurchaseGift,
  onSuccess,
}: GiftBorderProps) {
  const { user: authUser } = useAuth();
  const [handle, setHandle] = useState('');
  const [note, setNote] = useState('');
  const [step, setStep] = useState<0 | 1>(0);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  /**
   * Handle autocomplete (recipient picker). Suggests matching @handles as the
   * user types so they don't have to remember the exact spelling. Backed by
   * `profilesService.searchByHandle` (same source as @mention autocomplete),
   * which orders by follower_count desc so high-signal creators surface first.
   * The picker is dismissed once the user advances to the review step or
   * explicitly picks a suggestion.
   */
  const [suggestions, setSuggestions] = useState<UserProfile[]>([]);
  const [suggestionsLoading, setSuggestionsLoading] = useState(false);
  const suppressNextSearch = useRef(false);

  const normalized = normalizeHandle(handle);
  const profileQ = useProfileByHandle(normalized, step === 1 && normalized.length > 0);

  useEffect(() => {
    if (!visible) {
      setHandle('');
      setNote('');
      setStep(0);
      setError(null);
      setBusy(false);
      setSuggestions([]);
      setSuggestionsLoading(false);
      suppressNextSearch.current = false;
    }
  }, [visible]);

  /** Debounced handle suggestion fetch — only while typing on step 0. */
  useEffect(() => {
    if (!visible || step !== 0) {
      setSuggestions([]);
      setSuggestionsLoading(false);
      return;
    }
    if (suppressNextSearch.current) {
      suppressNextSearch.current = false;
      setSuggestions([]);
      setSuggestionsLoading(false);
      return;
    }
    const frag = normalizeHandle(handle);
    if (frag.length < 2) {
      setSuggestions([]);
      setSuggestionsLoading(false);
      return;
    }
    let cancelled = false;
    setSuggestionsLoading(true);
    const t = setTimeout(async () => {
      try {
        const res = await profilesService.searchByHandle(frag, 6);
        if (cancelled) return;
        const filtered = res.filter((u) => !authUser?.id || u.id !== authUser.id);
        setSuggestions(filtered);
      } catch {
        if (!cancelled) setSuggestions([]);
      } finally {
        if (!cancelled) setSuggestionsLoading(false);
      }
    }, 220);
    return () => {
      cancelled = true;
      clearTimeout(t);
    };
  }, [handle, step, visible, authUser?.id]);

  const pickSuggestion = (u: UserProfile) => {
    suppressNextSearch.current = true;
    setHandle(u.username ? `@${u.username}` : '');
    setSuggestions([]);
    setSuggestionsLoading(false);
    setError(null);
  };

  const disp = normalized ? `@${normalized}` : '';

  const goReview = () => {
    setError(null);
    if (!normalized) {
      setError('Enter a PulseVerse @handle.');
      return;
    }
    if (profileQ.data?.id && authUser?.id && profileQ.data.id === authUser.id) {
      setError('You can’t gift a border to yourself.');
      return;
    }
    setStep(1);
  };

  const runGift = async () => {
    setError(null);
    if (!profileQ.data?.id) {
      setError('We couldn’t find that @handle.');
      return;
    }
    if (authUser?.id && profileQ.data.id === authUser.id) {
      setError('You can’t gift a border to yourself.');
      return;
    }
    setBusy(true);
    try {
      const r = await onPurchaseGift(normalized, note.trim() || null);
      if (!r.ok) {
        void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
        setError(shopErrorHint(r.code, true) || r.message);
        return;
      }
      onSuccess?.(disp);
      onClose();
    } finally {
      setBusy(false);
    }
  };

  const preview = profileQ.data;
  const ring = ringPreviewColor(border);

  return (
    <Modal visible={visible} animationType="fade" transparent statusBarTranslucent onRequestClose={onClose}>
      <Pressable style={styles.backdrop} onPress={busy ? undefined : onClose}>
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
          <Pressable onPress={(e) => e.stopPropagation()} style={styles.sheet}>
            <LinearGradient
              colors={['#D4A63A', '#6366F1']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={styles.sheetAccentStripe}
            />
            <View style={styles.modeRow}>
              <View style={styles.modeBadgeIap}>
                <Ionicons name="gift-outline" size={14} color="#FDE68A" />
                <Text style={styles.modeBadgeIapText}>Store gift · recipient gets the border</Text>
              </View>
            </View>
            <Text style={styles.sheetTitle}>Gift {border.name}</Text>
            <View style={styles.borderGiftHero}>
              <BorderPreviewPlate
                ringColor={ring}
                size={56}
                rankPlace={border.rank_place}
                showMotionHint={
                  border.visual_tier === 'animated' ||
                  border.visual_tier === 'reactive' ||
                  border.is_animated === true
                }
                shopItem={border}
              />
              <View style={styles.borderGiftHeroCopy}>
                <BorderRarityBadge item={border} compact />
                {collectionName ? (
                  <Text style={styles.borderGiftCollection} numberOfLines={2}>
                    {collectionName}
                  </Text>
                ) : null}
                <BorderCompactMetaRow item={border} compact />
                {border.is_giftable ? (
                  <View style={styles.giftableCapsule}>
                    <Text style={styles.giftableCapsuleText}>Giftable</Text>
                  </View>
                ) : null}
              </View>
            </View>
            {step === 0 ? (
              <>
                <Text style={styles.sheetBody}>
                  Enter the creator’s @handle. We’ll look up their profile before you pay in the app store.
                </Text>
                <TextInput
                  value={handle}
                  onChangeText={setHandle}
                  placeholder="@handle"
                  placeholderTextColor={colors.dark.textQuiet}
                  autoCapitalize="none"
                  autoCorrect={false}
                  underlineColorAndroid="transparent"
                  style={styles.input}
                />
                {(suggestionsLoading || suggestions.length > 0) ? (
                  <View style={styles.handleSuggestionsPanel}>
                    {suggestionsLoading ? (
                      <View style={styles.handleSuggestionLoadingRow}>
                        <ActivityIndicator size="small" color={colors.dark.textMuted} />
                        <Text style={styles.handleSuggestionLoadingText}>Searching creators…</Text>
                      </View>
                    ) : (
                      suggestions.map((u, idx) => (
                        <TouchableOpacity
                          key={u.id}
                          activeOpacity={0.7}
                          onPress={() => pickSuggestion(u)}
                          style={[
                            styles.handleSuggestionRow,
                            idx === suggestions.length - 1 && styles.handleSuggestionRowLast,
                          ]}
                        >
                          {u.avatarUrl ? (
                            <Image
                              source={{ uri: u.avatarUrl }}
                              style={styles.handleSuggestionAvatarImg}
                              {...pulseImageListThumbProps}
                            />
                          ) : (
                            <View style={styles.handleSuggestionAvatarFallback}>
                              <Ionicons name="person" size={16} color={colors.dark.textMuted} />
                            </View>
                          )}
                          <View style={{ flex: 1, minWidth: 0 }}>
                            <Text style={styles.handleSuggestionName} numberOfLines={1}>
                              {(u.displayName ?? '').trim() || u.username || 'Pulse creator'}
                            </Text>
                            <Text style={styles.handleSuggestionHandle} numberOfLines={1}>
                              {u.username ? `@${u.username}` : ''}
                            </Text>
                          </View>
                          <Ionicons
                            name="chevron-forward"
                            size={16}
                            color={colors.dark.textQuiet}
                          />
                        </TouchableOpacity>
                      ))
                    )}
                  </View>
                ) : null}
                <Text style={styles.fieldLabel}>Optional note</Text>
                <TextInput
                  value={note}
                  onChangeText={setNote}
                  placeholder="Congrats on the launch 🎉"
                  placeholderTextColor={colors.dark.textQuiet}
                  underlineColorAndroid="transparent"
                  style={[styles.input, styles.inputMultiline]}
                  multiline
                />
                {error ? <Text style={styles.errorText}>{error}</Text> : null}
                <View style={styles.sheetActions}>
                  <TouchableOpacity style={styles.secondaryBtn} onPress={onClose} activeOpacity={0.88}>
                    <Text style={styles.secondaryBtnText}>Cancel</Text>
                  </TouchableOpacity>
                  <TouchableOpacity style={styles.primaryBtn} onPress={goReview} activeOpacity={0.88}>
                    <Text style={styles.primaryBtnText}>Review</Text>
                  </TouchableOpacity>
                </View>
              </>
            ) : (
              <>
                <View style={styles.recipientCard}>
                  {preview?.avatar_url ? (
                    <Image
                      source={{ uri: preview.avatar_url }}
                      style={[styles.recipientAvatarImg, { borderColor: ring }]}
                      {...pulseImageListThumbProps}
                    />
                  ) : (
                    <View style={[styles.recipientAvatar, { borderColor: ring }]}>
                      <Ionicons name="person" size={28} color={colors.dark.textMuted} />
                    </View>
                  )}
                  <View style={{ flex: 1, minWidth: 0 }}>
                    <Text style={styles.recipientName} numberOfLines={1}>
                      {preview?.display_name?.trim() || preview?.username || 'Pulse creator'}
                    </Text>
                    <Text style={styles.recipientHandle}>{disp}</Text>
                  </View>
                </View>
                {profileQ.isFetching ? (
                  <Text style={styles.sheetFine}>Loading profile…</Text>
                ) : !preview ? (
                  <Text style={styles.errorText}>We couldn’t find that @handle. Go back and try again.</Text>
                ) : (
                  <Text style={styles.sheetFine}>
                    You’re about to buy <Text style={{ fontWeight: '800' }}>{border.name}</Text> as a gift for{' '}
                    {disp}. Payment runs through your app store.
                  </Text>
                )}
                {error ? <Text style={styles.errorText}>{error}</Text> : null}
                <View style={styles.sheetActions}>
                  <TouchableOpacity
                    style={styles.secondaryBtn}
                    onPress={() => setStep(0)}
                    disabled={busy}
                    activeOpacity={0.88}
                  >
                    <Text style={styles.secondaryBtnText}>Back</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[styles.primaryBtn, (!preview || busy) && styles.primaryBtnDisabled]}
                    onPress={runGift}
                    disabled={!preview || busy}
                    activeOpacity={0.88}
                  >
                    {busy ? (
                      <ActivityIndicator color={pulseverse.onElectric} />
                    ) : (
                      <Text style={styles.primaryBtnText}>Confirm gift</Text>
                    )}
                  </TouchableOpacity>
                </View>
              </>
            )}
          </Pressable>
        </KeyboardAvoidingView>
      </Pressable>
    </Modal>
  );
}

type GiftPreviewProps = {
  visible: boolean;
  onClose: () => void;
  gift: ShopItemRow | null;
  sparkBalance: number;
};

/** Catalog preview for gift items (send flows live on creator surfaces). */
export function SparkGiftPreviewModal({ visible, onClose, gift, sparkBalance }: GiftPreviewProps) {
  if (!gift) return null;
  const price = gift.spark_price ?? 0;
  const short = sparkBalance < price;
  const ring = ringPreviewColor(gift);
  const tier = creatorGiftTierForItem(gift);
  const tierMeta = CREATOR_GIFT_TIER_META[tier];

  return (
    <Modal visible={visible} animationType="fade" transparent statusBarTranslucent onRequestClose={onClose}>
      <Pressable style={styles.backdrop} onPress={onClose}>
        <Pressable onPress={(e) => e.stopPropagation()} style={styles.sheet}>
          <LinearGradient
            colors={['#22D3EE', '#A78BFA']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={styles.sheetAccentStripe}
          />
          <View style={styles.modeRow}>
            <View style={styles.modeBadgeSparks}>
              <Ionicons name="flash" size={14} color="#A5F3FC" />
              <Text style={styles.modeBadgeSparksText}>Sparks · for creator gifts</Text>
            </View>
          </View>
          <View style={[styles.giftOrbLarge, { borderColor: ring + '55' }]}>
            <CreatorGiftOrb item={gift} size={72} />
          </View>
          <Text style={styles.giftTierPill}>
            {tierMeta.label} · {tierMeta.tagline}
          </Text>
          <Text style={styles.sheetTitle}>{gift.name}</Text>
          <Text style={styles.sheetBody}>{gift.description || 'Support a creator with this gift.'}</Text>
          <Text style={styles.sheetBody}>
            Costs{' '}
            <Text style={{ fontWeight: '800', color: '#22D3EE' }}>{price.toLocaleString()} Sparks</Text>. Works on{' '}
            {formatGiftContexts(gift.gift_contexts)}.
          </Text>
          <View style={styles.balanceRow}>
            <Text style={styles.balanceLabel}>Your balance</Text>
            <Text style={styles.balanceValue}>{sparkBalance.toLocaleString()} Sparks</Text>
          </View>
          {short ? (
            <Text style={styles.errorText}>Not enough Sparks. Open the Sparks tab to top up.</Text>
          ) : (
            <Text style={styles.sheetFine}>
              To send this gift, open a creator’s profile, a post, or a live stream and choose Send gift.
            </Text>
          )}
          <View style={styles.sheetActions}>
            <TouchableOpacity style={styles.primaryBtn} onPress={onClose} activeOpacity={0.88}>
              <Text style={styles.primaryBtnText}>Got it</Text>
            </TouchableOpacity>
          </View>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

type CreditPackProps = {
  visible: boolean;
  onClose: () => void;
  packLabel: string;
  sparksAmount: number;
  tag?: string;
  /**
   * `purchase` — App Store / Play flow (native).
   * `web_info` — web catalog browse: explains mobile IAP + same celebration UX when signed in on app.
   */
  mode?: 'purchase' | 'web_info';
  onPurchase?: PurchaseRunner;
  /** Fulfilled purchase payload from Edge/RPC (e.g. `purchase_receipt_id`). Not used for `web_info`. */
  onSuccess?: (data: Record<string, unknown>) => void;
  /** When set (e.g. `profiles.role_admin`), show a staff-only link to copy spark-pack IAP IDs from catalog. */
  staffSparkPackCatalog?: ShopItemRow[] | null;
};

export function CreditPackConfirmModal({
  visible,
  onClose,
  packLabel,
  sparksAmount,
  tag,
  mode = 'purchase',
  onPurchase,
  onSuccess,
  staffSparkPackCatalog,
}: CreditPackProps) {
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [realStage, setRealStage] = useState<IapPurchaseStage | null>(null);
  const [watchdogStage, setWatchdogStage] = useState<0 | 1 | 2 | 3>(0);
  const toast = useToast((s) => s.show);

  const webInfo = mode === 'web_info';
  const showStaffIds =
    Array.isArray(staffSparkPackCatalog) && staffSparkPackCatalog.length > 0;

  useEffect(() => {
    if (!visible) {
      setBusy(false);
      setErr(null);
      setRealStage(null);
      setWatchdogStage(0);
    }
  }, [visible]);

  /** Watchdog timer mirrors BorderBuyConfirmModal — safety net behind real `onStage` updates. */
  useEffect(() => {
    if (!busy) {
      setWatchdogStage(0);
      return;
    }
    const t1 = setTimeout(() => setWatchdogStage(1), 4_000);
    const t2 = setTimeout(() => setWatchdogStage(2), 12_000);
    const t3 = setTimeout(() => setWatchdogStage(3), 30_000);
    return () => {
      clearTimeout(t1);
      clearTimeout(t2);
      clearTimeout(t3);
    };
  }, [busy]);

  const realStageLabel: string | null =
    realStage === 'requesting'
      ? 'Opening App Store…'
      : realStage === 'awaiting_store'
        ? 'Waiting for Apple to confirm payment…'
        : realStage === 'validating'
          ? 'Crediting Sparks to your wallet…'
          : realStage === 'fulfilled'
            ? 'Almost done…'
            : realStage === 'pending'
              ? 'Purchase pending approval…'
              : null;

  const watchdogStageLabel =
    watchdogStage === 0
      ? null
      : watchdogStage === 1
        ? 'Connecting to App Store…'
        : watchdogStage === 2
          ? 'Verifying purchase…'
          : 'Still waiting on the store…';

  const stageLabel = realStageLabel ?? watchdogStageLabel;

  const run = async () => {
    if (!onPurchase) return;
    setErr(null);
    setBusy(true);
    setRealStage(null);
    try {
      const r = await onPurchase({ onStage: (s) => setRealStage(s) });
      if (!r.ok) {
        void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
        setErr(shopErrorHint(r.code) || r.message);
        return;
      }
      onSuccess?.(r.data);
      onClose();
    } finally {
      setBusy(false);
    }
  };

  return (
    <Modal visible={visible} animationType="fade" transparent statusBarTranslucent onRequestClose={onClose}>
      <Pressable style={styles.backdrop} onPress={busy ? undefined : onClose}>
        <Pressable onPress={(e) => e.stopPropagation()} style={styles.sheet}>
          <LinearGradient
            colors={[...gradients.economySparks]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={styles.sheetAccentStripe}
          />
          <View style={styles.modeRow}>
            <View style={styles.modeBadgeSparks}>
              <Ionicons name="wallet-outline" size={14} color="#A5F3FC" />
              <Text style={styles.modeBadgeSparksText}>
                {webInfo ? 'Sparks top-up · mobile app purchase' : 'Store top-up · adds to your Sparks balance'}
              </Text>
            </View>
          </View>
          <Text style={styles.sheetTitle}>{packLabel}</Text>
          {webInfo ? (
            <Text style={styles.sheetBody}>
              Spark packs are purchased through the{' '}
              <Text style={{ fontWeight: '800' }}>iOS or Android app</Text> (App Store / Google Play). After you buy on
              mobile while signed in as the same account, your balance updates everywhere — and you’ll get the same{' '}
              <Text style={{ fontWeight: '800' }}>reward celebration</Text> (toast → gift reveal) as on native.
              {tag ? ` Pack highlight: ${tag}.` : ''}
            </Text>
          ) : (
            <Text style={styles.sheetBody}>
              Spark packs are billed through the App Store or Google Play. You’ll see localized pricing on the
              next step{tag ? ` · ${tag}` : ''}.
            </Text>
          )}
          {err ? <Text style={styles.errorText}>{err}</Text> : null}
          {busy && stageLabel ? (
            <Text style={styles.stageLabel}>{stageLabel}</Text>
          ) : null}
          {showStaffIds ? (
            <TouchableOpacity
              onPress={() => {
                if (!staffSparkPackCatalog?.length) return;
                const text = buildSparkPackStoreIdsForStaff(staffSparkPackCatalog);
                Alert.alert('Spark pack IAP IDs', text, [
                  {
                    text: 'Copy all',
                    onPress: () =>
                      void (async () => {
                        try {
                          const { setStringAsync } = await import('expo-clipboard');
                          await setStringAsync(text);
                          toast('Copied IAP IDs to clipboard', 'success');
                        } catch {
                          toast('Could not copy', 'error');
                        }
                      })(),
                  },
                  { text: 'Close', style: 'cancel' },
                ]);
              }}
              activeOpacity={0.85}
              accessibilityRole="button"
              accessibilityLabel="Staff: view store product IDs for spark packs"
              style={styles.staffIdsLinkWrap}
            >
              <Ionicons name="key-outline" size={14} color={colors.primary.teal} />
              <Text style={styles.staffIdsLinkText}>Staff: view store product IDs</Text>
            </TouchableOpacity>
          ) : null}
          <View style={styles.sheetActions}>
            {webInfo ? (
              <TouchableOpacity style={styles.primaryBtn} onPress={onClose} disabled={busy} activeOpacity={0.88}>
                <Text style={styles.primaryBtnText}>Got it</Text>
              </TouchableOpacity>
            ) : (
              <>
                <TouchableOpacity style={styles.secondaryBtn} onPress={onClose} disabled={busy} activeOpacity={0.88}>
                  <Text style={styles.secondaryBtnText}>Cancel</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.primaryBtn, busy && styles.primaryBtnDisabled]}
                  disabled={busy}
                  onPress={run}
                  activeOpacity={0.88}
                >
                  {busy ? (
                    <ActivityIndicator color={pulseverse.onElectric} />
                  ) : (
                    <Text style={styles.primaryBtnText}>Continue</Text>
                  )}
                </TouchableOpacity>
              </>
            )}
          </View>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: semantic.modalScrim,
    justifyContent: 'center',
    paddingHorizontal: layout.screenPadding,
  },
  sheet: {
    backgroundColor: colors.dark.card,
    borderRadius: borderRadius.card,
    padding: spacing.lg + 4,
    paddingTop: spacing.lg,
    borderWidth: 1,
    borderColor: colors.dark.borderInner,
    overflow: 'hidden',
  },
  sheetAccentStripe: { height: 3, width: '100%', marginHorizontal: -20, marginTop: -16, marginBottom: 12 },
  modeRow: { marginBottom: 6 },
  modeBadgeIap: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: borderRadius.chip,
    backgroundColor: 'rgba(212,166,58,0.12)',
    borderWidth: 1,
    borderColor: 'rgba(212,166,58,0.26)',
  },
  modeBadgeIapText: { fontSize: 11, fontWeight: '800', color: '#FDE68A' },
  modeBadgeFree: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: borderRadius.chip,
    backgroundColor: 'rgba(34,197,94,0.12)',
    borderWidth: 1,
    borderColor: 'rgba(74,222,128,0.28)',
  },
  modeBadgeFreeText: { fontSize: 11, fontWeight: '800', color: '#86EFAC' },
  modeBadgeSparks: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: borderRadius.chip,
    backgroundColor: 'rgba(34,211,238,0.08)',
    borderWidth: 1,
    borderColor: 'rgba(34,211,238,0.22)',
  },
  modeBadgeSparksText: { fontSize: 11, fontWeight: '800', color: '#A5F3FC' },
  staffIdsLinkWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    gap: 8,
    marginTop: 12,
    paddingVertical: 6,
    paddingHorizontal: 2,
  },
  staffIdsLinkText: {
    fontSize: 12.5,
    fontWeight: '700',
    color: colors.primary.teal,
    textDecorationLine: 'underline',
  },
  sheetTitle: {
    fontSize: 19,
    fontWeight: '900',
    color: colors.dark.text,
    letterSpacing: -0.35,
    lineHeight: 24,
  },
  borderGiftHero: {
    marginTop: 12,
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
    padding: 12,
    borderRadius: borderRadius.lg,
    backgroundColor: 'rgba(15,23,42,0.55)',
    borderWidth: 1,
    borderColor: colors.dark.borderSubtle,
  },
  borderGiftHeroCopy: { flex: 1, minWidth: 0, gap: 6 },
  borderGiftCollection: { fontSize: 12, fontWeight: '700', color: colors.dark.textMuted },
  giftableCapsule: {
    alignSelf: 'flex-start',
    marginTop: 4,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: borderRadius.sm,
    backgroundColor: 'rgba(129,140,248,0.12)',
    borderWidth: 1,
    borderColor: 'rgba(165,180,252,0.28)',
  },
  giftableCapsuleText: { fontSize: 10, fontWeight: '900', color: '#A5B4FC', letterSpacing: 0.4 },
  sheetBody: {
    marginTop: 12,
    fontSize: 14,
    lineHeight: 21,
    color: colors.dark.textSecondary,
    fontWeight: '500',
  },
  sheetFine: {
    marginTop: 12,
    fontSize: 13,
    lineHeight: 19,
    color: colors.dark.textMuted,
  },
  recipientCard: {
    marginTop: 14,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: 12,
    borderRadius: borderRadius.lg,
    backgroundColor: colors.dark.cardAlt,
    borderWidth: 1,
    borderColor: colors.dark.borderSubtle,
  },
  recipientAvatar: {
    width: 52,
    height: 52,
    borderRadius: 26,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.dark.card,
  },
  recipientAvatarImg: {
    width: 52,
    height: 52,
    borderRadius: 26,
    borderWidth: 2,
    backgroundColor: colors.dark.card,
  },
  recipientName: { fontSize: 15, fontWeight: '800', color: colors.dark.text },
  recipientHandle: { fontSize: 13, color: pulseverse.electric, fontWeight: '700', marginTop: 2 },
  handleSuggestionsPanel: {
    marginTop: 8,
    borderRadius: borderRadius.lg,
    borderWidth: 1,
    borderColor: colors.dark.borderSubtle,
    backgroundColor: 'rgba(12,18,32,0.92)',
    overflow: 'hidden',
  },
  handleSuggestionLoadingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingHorizontal: 14,
    paddingVertical: 14,
  },
  handleSuggestionLoadingText: {
    fontSize: 13,
    color: colors.dark.textMuted,
    fontWeight: '600',
  },
  handleSuggestionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(56,189,248,0.10)',
  },
  handleSuggestionRowLast: {
    borderBottomWidth: 0,
  },
  handleSuggestionAvatarImg: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: colors.dark.card,
  },
  handleSuggestionAvatarFallback: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: colors.dark.card,
    alignItems: 'center',
    justifyContent: 'center',
  },
  handleSuggestionName: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.dark.text,
  },
  handleSuggestionHandle: {
    fontSize: 12,
    color: pulseverse.electric,
    fontWeight: '700',
    marginTop: 1,
  },
  fieldLabel: {
    marginTop: 12,
    fontSize: 12,
    fontWeight: '700',
    color: colors.dark.textMuted,
  },
  input: {
    marginTop: 8,
    borderRadius: borderRadius.lg,
    borderWidth: 1,
    borderColor: colors.dark.borderSubtle,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 16,
    color: colors.dark.text,
    backgroundColor: 'transparent',
  },
  inputMultiline: { minHeight: 72, textAlignVertical: 'top' },
  errorText: {
    marginTop: 10,
    fontSize: 13,
    fontWeight: '600',
    color: colors.status.error,
  },
  stageLabel: {
    marginTop: 10,
    fontSize: 12,
    fontWeight: '700',
    color: colors.dark.textSecondary,
    letterSpacing: 0.1,
  },
  balanceRow: {
    marginTop: 14,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: borderRadius.md,
    backgroundColor: 'rgba(56,189,248,0.08)',
    borderWidth: 1,
    borderColor: 'rgba(56,189,248,0.25)',
  },
  balanceLabel: { fontSize: 13, color: colors.dark.textMuted, fontWeight: '600' },
  balanceValue: { fontSize: 14, fontWeight: '900', color: colors.dark.text },
  sheetActions: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 20,
  },
  secondaryBtn: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: borderRadius.lg,
    borderWidth: 1,
    borderColor: colors.dark.border,
    alignItems: 'center',
  },
  secondaryBtnText: { fontSize: 15, fontWeight: '800', color: colors.dark.textSecondary },
  primaryBtn: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: borderRadius.lg,
    backgroundColor: pulseverse.electric,
    alignItems: 'center',
    justifyContent: 'center',
    ...shadows.ctaSoft,
  },
  primaryBtnDisabled: { opacity: 0.45 },
  primaryBtnText: { fontSize: 15, fontWeight: '900', color: pulseverse.onElectric },
  giftOrbLarge: {
    width: 72,
    height: 72,
    borderRadius: borderRadius.full,
    borderWidth: 1.5,
    alignSelf: 'center',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
    overflow: 'hidden',
    backgroundColor: 'rgba(56,189,248,0.06)',
  },
  giftTierPill: {
    alignSelf: 'center',
    fontSize: 11,
    fontWeight: '800',
    color: colors.dark.textMuted,
    textAlign: 'center',
    marginBottom: 6,
    letterSpacing: 0.2,
  },
  purchaseChoiceStack: {
    marginTop: 18,
    gap: 10,
  },
  purchaseChoicePrimary: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    borderRadius: borderRadius.lg,
    backgroundColor: pulseverse.electric,
    ...shadows.ctaSoft,
  },
  purchaseChoicePrimaryText: { fontSize: 15, fontWeight: '900', color: pulseverse.onElectric },
  purchaseChoiceGift: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    borderRadius: borderRadius.lg,
    borderWidth: 1,
    borderColor: 'rgba(212,166,58,0.45)',
    backgroundColor: 'rgba(212,166,58,0.08)',
  },
  purchaseChoiceGiftText: { fontSize: 15, fontWeight: '900', color: '#FDE68A' },
  purchaseChoiceCancel: {
    alignItems: 'center',
    paddingVertical: 8,
    marginTop: 4,
  },
  purchaseChoiceCancelText: { fontSize: 14, fontWeight: '700', color: colors.dark.textMuted },
});
