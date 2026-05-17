import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  Pressable,
  TouchableOpacity,
  ActivityIndicator,
  Platform,
  ScrollView,
} from 'react-native';
import { BlurView } from 'expo-blur';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { colors, borderRadius, layout, pulseverse, gradients, semantic, rarity } from '@/theme';
import type { ShopItemRow } from '@/lib/shop/types';
import { ringPreviewColor } from '@/lib/shop/catalogUtils';
import { BorderPreviewPlate } from '@/components/shop/border/BorderPreviewPlate';
import { BorderRarityBadge } from '@/components/shop/border/BorderRarityBadge';
import { useRouter } from 'expo-router';
import { analytics } from '@/lib/analytics';

/** Premium success layouts for Pulse Shop purchase flows (reference UI). */
export type PulseShopCelebrationPayload =
  | { kind: 'border_purchase'; borderItem: ShopItemRow; equipInventoryId?: string }
  | { kind: 'spark_pack'; sparksAmount: number }
  /** `sentKind` defaults to border IAP gift; creator Sparks gifts use `creator_sparks`. */
  | {
      kind: 'gift_sent';
      recipient: string;
      sentKind?: 'border' | 'creator_sparks';
      /** Return to post / profile / live after closing sender celebration */
      contextNavigate?: { label: string; href: string } | null;
    };

type Props = {
  visible: boolean;
  variant: 'success' | 'pending' | 'error';
  /** Legacy layout — ignored when `pulseCelebration` is set (success only). */
  title: string;
  message?: string;
  primaryLabel?: string;
  onPrimary?: () => void | Promise<void>;
  secondaryLabel?: string;
  onSecondary?: () => void;
  tertiaryLabel?: string;
  onTertiary?: () => void;
  onClose: () => void;
  pulseCelebration?: PulseShopCelebrationPayload | null;
  /** Spark celebration — left CTA in the paired button row. */
  onSparkSendGift?: () => void;
};

const RIM_PREMIUM = [
  'rgba(34,211,238,0.95)',
  'rgba(168,85,247,0.65)',
  'rgba(236,72,153,0.72)',
  'rgba(56,189,248,0.85)',
] as const;

function formatSeasonHint(item: ShopItemRow): string | null {
  const code = item.season_code?.trim();
  if (code) return code;
  const raw = item.release_at?.trim();
  if (!raw) return null;
  try {
    const d = new Date(raw);
    if (Number.isNaN(d.getTime())) return null;
    return d.toLocaleString('en-US', { month: 'long', year: 'numeric' });
  } catch {
    return null;
  }
}

function PulsePremiumBackdrop({ children }: { children: React.ReactNode }) {
  const starLayout = [
    { top: 12, left: '12%', opacity: 0.14 },
    { top: 28, left: '72%', opacity: 0.18 },
    { top: 44, left: '44%', opacity: 0.11 },
    { top: 56, left: '18%', opacity: 0.15 },
    { top: 72, left: '84%', opacity: 0.12 },
    { top: 88, left: '52%', opacity: 0.16 },
  ] as const;
  return (
    <>
      <View style={styles.starField} pointerEvents="none">
        {starLayout.map((s) => (
          <View
            key={`${s.top}-${s.left}`}
            style={[
              styles.starDot,
              {
                top: s.top,
                left: s.left,
                opacity: s.opacity,
              },
            ]}
          />
        ))}
      </View>
      <LinearGradient colors={[...RIM_PREMIUM]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.cardGlow}>
        <View style={styles.cardInnerPremium}>{children}</View>
      </LinearGradient>
    </>
  );
}

function BorderPurchaseCelebration({
  item,
  equipInventoryId,
  onEquip,
  onMyBorders,
  onKeepBrowsing,
}: {
  item: ShopItemRow;
  equipInventoryId?: string;
  onEquip?: () => void | Promise<void>;
  onMyBorders?: () => void;
  onKeepBrowsing: () => void;
}) {
  const ring = ringPreviewColor(item);
  const metaMonth = formatSeasonHint(item);

  return (
    <>
      <View style={styles.successBadgeWrap}>
        <LinearGradient
          colors={['rgba(45,212,191,0.95)', 'rgba(34,211,238,0.85)']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.successBadge}
        >
          <Ionicons name="checkmark" size={26} color="#fff" />
        </LinearGradient>
      </View>

      <Text style={styles.premiumTitle}>Purchase Complete</Text>
      <Text style={styles.premiumSubtitle}>
        <Text style={styles.premiumSubtitleMuted}>{item.name} has been added to your </Text>
        <Text style={styles.vaultHighlight}>Border Vault</Text>
        <Text style={styles.premiumSubtitleMuted}>.</Text>
      </Text>

      <View style={styles.heroPreview}>
        <BorderPreviewPlate shopItem={item} ringColor={ring} size={132} frame="podium" showMotionHint />
      </View>

      <View style={styles.rarityRow}>
        <BorderRarityBadge item={item} compact emphasized align="center" />
      </View>
      <Text style={styles.borderHeroName}>{item.name}</Text>
      {metaMonth ? <Text style={styles.borderHeroMeta}>{metaMonth}</Text> : null}

      <View style={styles.infoStrip}>
        <View style={styles.infoStripItem}>
          <Ionicons name="archive-outline" size={18} color={pulseverse.electricSoft} />
          <Text style={styles.infoStripText}>Added to Border Vault</Text>
        </View>
        <View style={styles.infoStripItem}>
          <Ionicons name="flash-outline" size={18} color={pulseverse.hubTileBlue} />
          <Text style={styles.infoStripText}>Creator supported — thank you!</Text>
        </View>
        <View style={styles.infoStripItem}>
          <Ionicons name="shield-checkmark-outline" size={18} color={pulseverse.electricMuted} />
          <Text style={styles.infoStripText}>Secure purchase verified</Text>
        </View>
      </View>

      {equipInventoryId && onEquip ? (
        <TouchableOpacity style={styles.primaryBtnPremium} onPress={() => void onEquip()} activeOpacity={0.88}>
          <LinearGradient colors={[...gradients.ctaSheet]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={styles.primaryGradPremium}>
            <View style={styles.ctaRow}>
              <View style={styles.pMini}>
                <Text style={styles.pMiniText}>P</Text>
              </View>
              <Text style={styles.primaryBtnTextPremium}>Equip now</Text>
            </View>
          </LinearGradient>
        </TouchableOpacity>
      ) : null}

      {onMyBorders ? (
        <TouchableOpacity style={styles.outlineGoldBtn} onPress={onMyBorders} activeOpacity={0.88}>
          <Text style={styles.outlineGoldBtnText}>My borders</Text>
        </TouchableOpacity>
      ) : null}

      <TouchableOpacity onPress={onKeepBrowsing} style={styles.linkBtn} activeOpacity={0.88}>
        <Text style={styles.linkBtnText}>Keep browsing</Text>
      </TouchableOpacity>
    </>
  );
}

function SparkPackCelebration({
  sparksAmount,
  onDone,
  onSendGift,
}: {
  sparksAmount: number;
  onDone: () => void;
  onSendGift?: () => void;
}) {
  const formatted = sparksAmount.toLocaleString();
  return (
    <>
      <View style={styles.sparkBurstWrap}>
        <LinearGradient
          colors={['rgba(251,191,36,0.45)', 'rgba(34,211,238,0.28)', 'rgba(251,191,36,0.2)']}
          style={styles.sparkBurstRing}
        >
          <LinearGradient colors={['rgba(12,18,32,0.9)', 'rgba(8,14,28,0.96)']} style={styles.sparkOrbInner}>
            <Ionicons name="flash" size={44} color="#FDE68A" />
          </LinearGradient>
        </LinearGradient>
      </View>

      <Text style={styles.premiumTitle}>Sparks added</Text>
      <Text style={styles.sparkBody}>
        <Text style={styles.premiumSubtitleMuted}>You now have </Text>
        <Text style={styles.sparkAccent}>{formatted} Sparks</Text>
        <Text style={styles.premiumSubtitleMuted}> in your wallet.</Text>
      </Text>

      <View style={styles.pulseDivider} />
      <Text style={styles.sparkFoot}>Ready to send gifts or support creators.</Text>

      <View style={[styles.sparkActions, !onSendGift && styles.sparkActionsSingle]}>
        {onSendGift ? (
          <TouchableOpacity style={styles.sparkSecondaryBtn} onPress={onSendGift} activeOpacity={0.88}>
            <Ionicons name="gift-outline" size={18} color={pulseverse.electricSoft} style={{ marginRight: 8 }} />
            <Text style={styles.sparkSecondaryBtnText}>Send a gift</Text>
          </TouchableOpacity>
        ) : null}
        <TouchableOpacity
          style={[styles.sparkPrimaryWrap, !onSendGift && styles.sparkPrimaryFull]}
          onPress={onDone}
          activeOpacity={0.88}
        >
          <LinearGradient colors={[...gradients.ctaSheet]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={styles.sparkPrimaryGrad}>
            <Text style={styles.sparkPrimaryText}>Done</Text>
          </LinearGradient>
        </TouchableOpacity>
      </View>
    </>
  );
}

function GiftSentCelebration({
  recipient,
  sentKind = 'border',
  contextNavigate,
  onClose,
}: {
  recipient: string;
  sentKind?: 'border' | 'creator_sparks';
  contextNavigate?: { label: string; href: string } | null;
  onClose: () => void;
}) {
  const router = useRouter();
  const subtitle =
    sentKind === 'creator_sparks' ? (
      <>
        <Text style={styles.premiumSubtitleMuted}>Your Sparks gift reached </Text>
        <Text style={styles.vaultHighlight}>{recipient}</Text>
        <Text style={styles.premiumSubtitleMuted}>
          . They’ll see the celebration in-app when online — your balance is already updated.
        </Text>
      </>
    ) : (
      <>
        <Text style={styles.premiumSubtitleMuted}>Your border is on its way to </Text>
        <Text style={styles.vaultHighlight}>{recipient}</Text>
        <Text style={styles.premiumSubtitleMuted}>.</Text>
      </>
    );

  const onContext = () => {
    if (!contextNavigate?.href) return;
    analytics.track('gift_sender_return_nav', { href: contextNavigate.href });
    router.push(contextNavigate.href as any);
    onClose();
  };

  return (
    <>
      <View style={styles.sparkBurstWrap}>
        <LinearGradient colors={['rgba(34,211,238,0.35)', 'rgba(168,85,247,0.25)']} style={styles.sparkBurstRing}>
          <LinearGradient colors={['rgba(12,18,32,0.92)', 'rgba(8,14,28,0.96)']} style={styles.sparkOrbInner}>
            <Ionicons name="gift" size={44} color="#FDE68A" />
          </LinearGradient>
        </LinearGradient>
      </View>
      <Text style={styles.premiumTitle}>Gift sent</Text>
      <Text style={styles.premiumSubtitle}>{subtitle}</Text>
      {contextNavigate ? (
        <TouchableOpacity style={styles.giftContextNavBtn} onPress={onContext} activeOpacity={0.88}>
          <Ionicons name="arrow-forward-circle-outline" size={18} color={pulseverse.electricSoft} style={{ marginRight: 8 }} />
          <Text style={styles.giftContextNavTxt}>{contextNavigate.label}</Text>
        </TouchableOpacity>
      ) : null}
      <TouchableOpacity style={[styles.primaryBtnPremium, { marginTop: contextNavigate ? 14 : 26 }]} onPress={onClose} activeOpacity={0.88}>
        <LinearGradient colors={[...gradients.ctaSheet]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={styles.primaryGradPremium}>
          <Text style={styles.primaryBtnTextPremium}>Done</Text>
        </LinearGradient>
      </TouchableOpacity>
    </>
  );
}

export function ShopResultModal({
  visible,
  variant,
  title,
  message,
  primaryLabel,
  onPrimary,
  secondaryLabel = 'Close',
  onSecondary,
  tertiaryLabel,
  onTertiary,
  onClose,
  pulseCelebration,
  onSparkSendGift,
}: Props) {
  const premiumSuccess = variant === 'success' && pulseCelebration != null;

  const icon =
    variant === 'success' ? 'checkmark-circle' : variant === 'pending' ? 'sync-outline' : 'alert-circle';
  const iconColor =
    variant === 'success' ? '#4ADE80' : variant === 'pending' ? semantic.warning : semantic.danger;
  const accentColors =
    variant === 'success'
      ? (['rgba(74,222,128,0.4)', 'rgba(34,211,238,0.2)'] as const)
      : variant === 'pending'
        ? (['rgba(251,191,36,0.45)', 'rgba(56,189,248,0.18)'] as const)
        : (['rgba(251,113,133,0.45)', 'rgba(99,102,241,0.18)'] as const);

  return (
    <Modal visible={visible} animationType="fade" transparent statusBarTranslucent onRequestClose={onClose}>
      <Pressable style={styles.fill} onPress={variant === 'pending' ? undefined : premiumSuccess ? undefined : onClose}>
        {Platform.OS === 'ios' ? (
          <BlurView intensity={36} tint="dark" style={StyleSheet.absoluteFill} />
        ) : (
          <View style={[StyleSheet.absoluteFill, styles.androidDim]} />
        )}
        <LinearGradient
          pointerEvents="none"
          colors={['rgba(5,10,22,0.92)', 'rgba(5,10,22,0.78)', 'rgba(8,15,32,0.88)']}
          style={StyleSheet.absoluteFill}
        />
        <View style={styles.center} pointerEvents="box-none">
          <Pressable onPress={(e) => e.stopPropagation()} style={styles.cardOuter}>
            {premiumSuccess ? (
              <PulsePremiumBackdrop>
                <ScrollView
                  showsVerticalScrollIndicator={false}
                  contentContainerStyle={styles.premiumScroll}
                  bounces={false}
                >
                  <TouchableOpacity
                    hitSlop={14}
                    style={styles.closeX}
                    onPress={onClose}
                    accessibilityRole="button"
                    accessibilityLabel="Close"
                  >
                    <Ionicons name="close" size={22} color="rgba(255,255,255,0.72)" />
                  </TouchableOpacity>

                  {pulseCelebration.kind === 'border_purchase' ? (
                    <BorderPurchaseCelebration
                      item={pulseCelebration.borderItem}
                      equipInventoryId={pulseCelebration.equipInventoryId}
                      onEquip={onPrimary}
                      onMyBorders={onTertiary}
                      onKeepBrowsing={onClose}
                    />
                  ) : pulseCelebration.kind === 'spark_pack' ? (
                    <SparkPackCelebration
                      sparksAmount={pulseCelebration.sparksAmount}
                      onDone={onClose}
                      onSendGift={onSparkSendGift}
                    />
                  ) : (
                    <GiftSentCelebration
                      recipient={pulseCelebration.recipient}
                      sentKind={pulseCelebration.sentKind}
                      contextNavigate={'contextNavigate' in pulseCelebration ? pulseCelebration.contextNavigate : null}
                      onClose={onClose}
                    />
                  )}
                </ScrollView>
              </PulsePremiumBackdrop>
            ) : (
              <LinearGradient colors={accentColors} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.cardGlowLegacy}>
                <View style={styles.cardInner}>
                  {variant === 'pending' ? (
                    <>
                      <ActivityIndicator size="large" color={pulseverse.electric} style={{ marginBottom: 14 }} />
                      <Text style={styles.pendingHint}>Securing your purchase…</Text>
                    </>
                  ) : (
                    <View style={[styles.iconWrap, { borderColor: iconColor + '44' }]}>
                      <Ionicons name={icon} size={40} color={iconColor} />
                    </View>
                  )}
                  <Text style={styles.title}>{title}</Text>
                  {message ? <Text style={styles.body}>{message}</Text> : null}
                  {primaryLabel && onPrimary ? (
                    <TouchableOpacity
                      style={styles.primaryBtn}
                      onPress={() => void onPrimary()}
                      activeOpacity={0.88}
                    >
                      <LinearGradient
                        colors={[...gradients.ctaSheet]}
                        start={{ x: 0, y: 0 }}
                        end={{ x: 1, y: 0 }}
                        style={styles.primaryGrad}
                      >
                        <Text style={styles.primaryBtnText}>{primaryLabel}</Text>
                      </LinearGradient>
                    </TouchableOpacity>
                  ) : null}
                  <TouchableOpacity
                    style={styles.secondaryBtn}
                    onPress={onSecondary ?? onClose}
                    activeOpacity={0.88}
                  >
                    <Text style={styles.secondaryBtnText}>{secondaryLabel}</Text>
                  </TouchableOpacity>
                  {tertiaryLabel && onTertiary ? (
                    <TouchableOpacity style={styles.tertiaryBtn} onPress={onTertiary} activeOpacity={0.88}>
                      <Text style={styles.tertiaryBtnText}>{tertiaryLabel}</Text>
                    </TouchableOpacity>
                  ) : null}
                </View>
              </LinearGradient>
            )}
          </Pressable>
        </View>
      </Pressable>
    </Modal>
  );
}

const styles = StyleSheet.create({
  fill: { flex: 1 },
  androidDim: { backgroundColor: semantic.modalScrim },
  center: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'center',
    paddingHorizontal: layout.screenPadding,
  },
  cardOuter: {
    borderRadius: borderRadius.sheet,
    overflow: 'hidden',
    maxHeight: '92%',
  },
  cardGlowLegacy: {
    padding: 2,
    borderRadius: borderRadius.sheet,
  },
  cardGlow: {
    padding: 2,
    borderRadius: 26,
  },
  cardInner: {
    backgroundColor: 'rgba(12,20,36,0.94)',
    borderRadius: borderRadius.xl,
    paddingVertical: 26,
    paddingHorizontal: 22,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
  },
  cardInnerPremium: {
    backgroundColor: 'rgba(12,18,32,0.94)',
    borderRadius: 24,
    borderWidth: 1,
    borderColor: 'rgba(34,211,238,0.14)',
    overflow: 'hidden',
    shadowColor: '#22D3EE',
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.18,
    shadowRadius: 28,
    elevation: 14,
  },
  premiumScroll: {
    paddingTop: 36,
    paddingBottom: 28,
    paddingHorizontal: 22,
    alignItems: 'center',
  },
  starField: {
    ...StyleSheet.absoluteFillObject,
    borderRadius: 26,
    overflow: 'hidden',
  },
  starDot: {
    position: 'absolute',
    width: 3,
    height: 3,
    borderRadius: 2,
    backgroundColor: '#fff',
  },
  closeX: {
    position: 'absolute',
    top: 12,
    right: 12,
    zIndex: 4,
    padding: 6,
  },
  iconWrap: {
    width: 72,
    height: 72,
    borderRadius: borderRadius.full,
    borderWidth: 1.5,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 14,
    backgroundColor: 'rgba(255,255,255,0.04)',
  },
  pendingHint: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.dark.textMuted,
    marginBottom: 4,
  },
  title: {
    fontSize: 19,
    fontWeight: '900',
    color: colors.dark.text,
    textAlign: 'center',
    letterSpacing: -0.3,
  },
  body: {
    marginTop: 12,
    fontSize: 14,
    lineHeight: 21,
    color: colors.dark.textSecondary,
    textAlign: 'center',
    fontWeight: '500',
  },
  primaryBtn: {
    marginTop: 22,
    alignSelf: 'stretch',
    borderRadius: borderRadius.lg,
    overflow: 'hidden',
  },
  primaryGrad: {
    paddingVertical: 15,
    alignItems: 'center',
  },
  primaryBtnText: { fontSize: 15, fontWeight: '900', color: pulseverse.onElectric },
  secondaryBtn: {
    marginTop: 12,
    alignSelf: 'stretch',
    paddingVertical: 14,
    alignItems: 'center',
  },
  secondaryBtnText: { fontSize: 14, fontWeight: '700', color: colors.dark.textMuted },
  tertiaryBtn: {
    marginTop: 8,
    alignSelf: 'stretch',
    paddingVertical: 12,
    alignItems: 'center',
    borderRadius: borderRadius.lg,
    borderWidth: 1,
    borderColor: 'rgba(34,211,238,0.35)',
  },
  tertiaryBtnText: { fontSize: 14, fontWeight: '800', color: pulseverse.electric },

  successBadgeWrap: {
    marginTop: -8,
    marginBottom: 10,
    alignItems: 'center',
  },
  successBadge: {
    width: 56,
    height: 56,
    borderRadius: 28,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.35)',
    shadowColor: '#2DD4BF',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.55,
    shadowRadius: 16,
    elevation: 12,
  },
  premiumTitle: {
    fontSize: 22,
    fontWeight: '900',
    color: colors.dark.text,
    textAlign: 'center',
    letterSpacing: -0.4,
  },
  premiumSubtitle: {
    marginTop: 10,
    textAlign: 'center',
    paddingHorizontal: 4,
    lineHeight: 22,
  },
  premiumSubtitleMuted: {
    fontSize: 15,
    fontWeight: '600',
    color: colors.dark.textSecondary,
  },
  vaultHighlight: {
    fontSize: 15,
    fontWeight: '900',
    color: pulseverse.electricSoft,
  },
  heroPreview: {
    marginTop: 20,
    marginBottom: 8,
    alignItems: 'center',
  },
  rarityRow: {
    marginBottom: 6,
  },
  borderHeroName: {
    fontSize: 17,
    fontWeight: '900',
    color: colors.dark.text,
    textAlign: 'center',
  },
  borderHeroMeta: {
    marginTop: 4,
    fontSize: 13,
    fontWeight: '600',
    color: colors.dark.textMuted,
    textAlign: 'center',
  },
  infoStrip: {
    marginTop: 18,
    alignSelf: 'stretch',
    gap: 10,
    paddingVertical: 12,
    paddingHorizontal: 12,
    borderRadius: borderRadius.lg,
    backgroundColor: 'rgba(8,14,28,0.65)',
    borderWidth: 1,
    borderColor: 'rgba(34,211,238,0.12)',
  },
  infoStripItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  infoStripText: {
    flex: 1,
    fontSize: 12,
    fontWeight: '700',
    color: pulseverse.electricMuted,
  },
  giftContextNavBtn: {
    marginTop: 20,
    alignSelf: 'stretch',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
    paddingVertical: 13,
    paddingHorizontal: 14,
    borderRadius: borderRadius.lg,
    borderWidth: 1,
    borderColor: 'rgba(56,189,248,0.38)',
    backgroundColor: 'rgba(8,14,28,0.72)',
  },
  giftContextNavTxt: {
    fontSize: 15,
    fontWeight: '800',
    color: pulseverse.electricSoft,
  },
  primaryBtnPremium: {
    marginTop: 22,
    alignSelf: 'stretch',
    borderRadius: borderRadius.lg,
    overflow: 'hidden',
    shadowColor: '#22D3EE',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.35,
    shadowRadius: 18,
    elevation: 10,
  },
  primaryGradPremium: {
    paddingVertical: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  primaryBtnTextPremium: {
    fontSize: 16,
    fontWeight: '900',
    color: '#fff',
    letterSpacing: 0.2,
  },
  ctaRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  pMini: {
    width: 26,
    height: 26,
    borderRadius: 13,
    backgroundColor: 'rgba(255,255,255,0.2)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  pMiniText: { fontWeight: '900', fontSize: 14, color: '#fff' },
  outlineGoldBtn: {
    marginTop: 12,
    alignSelf: 'stretch',
    paddingVertical: 14,
    borderRadius: borderRadius.lg,
    borderWidth: 1,
    borderColor: 'rgba(231,201,117,0.45)',
    alignItems: 'center',
    backgroundColor: 'rgba(231,201,117,0.06)',
  },
  outlineGoldBtnText: {
    fontSize: 14,
    fontWeight: '800',
    color: rarity.legendary.text,
  },
  linkBtn: {
    marginTop: 14,
    paddingVertical: 8,
  },
  linkBtnText: {
    fontSize: 14,
    fontWeight: '800',
    color: pulseverse.electricSoft,
  },

  sparkBurstWrap: {
    marginBottom: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sparkBurstRing: {
    width: 120,
    height: 120,
    borderRadius: 60,
    padding: 3,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sparkOrbInner: {
    width: '100%',
    height: '100%',
    borderRadius: 57,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(251,191,36,0.35)',
  },
  sparkBody: {
    marginTop: 12,
    textAlign: 'center',
    lineHeight: 24,
  },
  sparkAccent: {
    fontSize: 17,
    fontWeight: '900',
    color: pulseverse.electricSoft,
  },
  pulseDivider: {
    marginTop: 18,
    height: 2,
    width: 56,
    borderRadius: 2,
    backgroundColor: 'rgba(34,211,238,0.35)',
  },
  sparkFoot: {
    marginTop: 14,
    fontSize: 13,
    fontWeight: '600',
    color: colors.dark.textMuted,
    textAlign: 'center',
    lineHeight: 19,
    paddingHorizontal: 8,
  },
  sparkActions: {
    marginTop: 22,
    flexDirection: 'row',
    alignSelf: 'stretch',
    gap: 10,
    alignItems: 'stretch',
  },
  sparkActionsSingle: {
    justifyContent: 'center',
  },
  sparkSecondaryBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    borderRadius: borderRadius.lg,
    borderWidth: 1,
    borderColor: 'rgba(34,211,238,0.35)',
    backgroundColor: 'rgba(8,14,28,0.88)',
  },
  sparkSecondaryBtnText: {
    fontSize: 14,
    fontWeight: '800',
    color: pulseverse.electricSoft,
  },
  sparkPrimaryWrap: {
    flex: 1,
    borderRadius: borderRadius.lg,
    overflow: 'hidden',
    shadowColor: '#22D3EE',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.3,
    shadowRadius: 14,
    elevation: 8,
  },
  sparkPrimaryFull: {
    flexGrow: 1,
    maxWidth: '100%',
  },
  sparkPrimaryGrad: {
    flex: 1,
    paddingVertical: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sparkPrimaryText: {
    fontSize: 15,
    fontWeight: '900',
    color: pulseverse.onElectric,
  },
});
