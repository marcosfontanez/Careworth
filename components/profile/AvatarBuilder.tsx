import React, { useState } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, ScrollView, Modal, TextInput,
} from 'react-native';
import { Image } from 'expo-image';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { colors } from '@/theme';
import { PulseAvatarRingCaption } from '@/components/profile/PulseAvatarRingCaption';
import { GoldFireworksBurst } from '@/components/profile/GoldFireworksBurst';
import {
  useProfileCustomization,
  DICEBEAR_STYLES, DICEBEAR_BG_COLORS, buildDiceBearUrl,
} from '@/store/useProfileCustomization';
import { rasterRingOuterBoxSide, resolvePulseRingRaster } from '@/lib/pulseRingRasterAssets';
import type { AvatarType, PulseAvatarFrame } from '@/types';
import type { PrizeFireworksTier } from './GoldFireworksBurst';

const AVATAR_TYPES: { key: AvatarType; label: string; icon: string }[] = [
  { key: 'illustrated', label: 'Illustrated', icon: 'sparkles' },
  { key: 'photo', label: 'Photo', icon: 'camera' },
  { key: 'gradient', label: 'Initials', icon: 'color-palette' },
];

const GRADIENT_PAIRS: [string, string][] = [
  ['#14B8A6', '#1E4ED8'],
  ['#EF4444', '#F59E0B'],
  ['#8B5CF6', '#EC4899'],
  ['#3B82F6', '#06B6D4'],
  ['#10B981', '#34D399'],
  ['#F97316', '#EF4444'],
  ['#6366F1', '#A78BFA'],
  ['#EC4899', '#F43F5E'],
];

const SEED_PRESETS = [
  'NurseHero', 'DrBrave', 'NightOwl', 'CodeBlue', 'HeartRN',
  'ICU-Warrior', 'TravelNurse', 'Scrubs4Life', 'Stethoscope',
  'MedLife', 'FirstResponder', 'CarePro', 'HealthHero',
  'PulseCheck', 'VitalSigns', 'ShiftLife', 'NursingSchool',
];

type PulsePrizeTier = PulseAvatarFrame['prizeTier'];

function prizeTierIsGoldLike(t: PulsePrizeTier | undefined): boolean {
  return t === 'gold' || t === 'exclusive' || t === 'legacy' || t === 'campaign';
}

function prizeTierToFireworksTier(t: PulsePrizeTier | undefined): PrizeFireworksTier | null {
  if (t === 'gold' || t === 'exclusive' || t === 'legacy' || t === 'campaign') return 'gold';
  if (t === 'silver') return 'silver';
  if (t === 'bronze') return 'bronze';
  return null;
}

export type PulseAvatarRingStyle = {
  ringColor: string;
  glowColor: string;
  borderWidth?: number;
  /** Curved text in the ring band around the photo; omit when null/empty. */
  ringCaption?: string | null;
  prizeTier?: PulsePrizeTier;
  /** When set, may select a bundled raster (e.g. beta-tester-border). */
  slug?: string | null;
};

/** Maps equipped catalog frame → ring props for {@link AvatarDisplay}. */
export function pulseFrameFromUser(frame: PulseAvatarFrame | null | undefined): PulseAvatarRingStyle | null {
  if (!frame) return null;
  return {
    ringColor: frame.ringColor,
    glowColor: frame.glowColor,
    borderWidth: prizeTierIsGoldLike(frame.prizeTier) ? 4 : 3,
    ringCaption: frame.ringCaption ?? null,
    prizeTier: frame.prizeTier,
    slug: frame.slug,
  };
}

interface AvatarDisplayProps {
  size?: number;
  avatarUrl?: string;
  showEdit?: boolean;
  onPress?: () => void;
  /** When set, overrides profile accent for the outer ring (e.g. brand teal on My Pulse). */
  ringColor?: string;
  /**
   * Exclusive monthly leaderboard frame — neon border + glow.
   * When set, overrides plain `ringColor` for the ring stroke.
   */
  pulseFrame?: PulseAvatarRingStyle | null;
  /** Small presence dot — e.g. “online” on own profile. */
  showOnlineDot?: boolean;
  /**
   * When true, show `avatarUrl` first if present (canonical profile photo).
   * Omit on avatar builder / previews so local DiceBear gradient choice still wins.
   */
  prioritizeRemoteAvatar?: boolean;
}

export function AvatarDisplay({
  size = 90,
  avatarUrl,
  showEdit,
  onPress,
  ringColor,
  pulseFrame,
  showOnlineDot,
  prioritizeRemoteAvatar,
}: AvatarDisplayProps) {
  const { avatarType, gradientAvatar, illustratedAvatar, accentColor } = useProfileCustomization();
  const ring = ringColor ?? accentColor;
  const strokeColor = pulseFrame?.ringColor ?? ring;
  const glowColor = pulseFrame?.glowColor;
  const { source: rasterSource, innerOpeningFrac } = resolvePulseRingRaster(pulseFrame);
  const useRasterRing = rasterSource != null;
  const ringW = Math.min(
    (pulseFrame?.borderWidth ?? 3) + (prizeTierIsGoldLike(pulseFrame?.prizeTier) ? 1 : 0),
    5,
  );
  const effectiveBorderW = useRasterRing ? 0 : ringW;
  const capRaw = pulseFrame?.ringCaption?.trim();
  /** Curved band needs room — hide on tiny feed rails so text stays readable on profiles. Ornate PNG rings ship their own art. */
  const showRingCaption = Boolean(capRaw && size >= 42 && !useRasterRing);
  const cap = showRingCaption ? capRaw : undefined;
  const hasCaption = Boolean(cap);
  const outerPadLegacy = pulseFrame ? 8 : 6;
  const captionBand = hasCaption
    ? Math.max(36, Math.round(size * 0.38))
    : 0;
  const outerBox = useRasterRing
    ? rasterRingOuterBoxSide(size, innerOpeningFrac) + captionBand
    : size + outerPadLegacy + captionBand;
  const captionFont = Math.max(5, Math.min(9, Math.round(size * 0.092)));
  const burstTier: PrizeFireworksTier | null = prizeTierToFireworksTier(pulseFrame?.prizeTier);
  const showRasterGoldFireworks = Boolean(
    useRasterRing && size >= 22 && pulseFrame?.prizeTier === 'gold',
  );
  const showProceduralFireworks = Boolean(!useRasterRing && burstTier && size >= 22);
  const fireworksPalette =
    (showProceduralFireworks || showRasterGoldFireworks) && pulseFrame
      ? burstTier === 'gold' || pulseFrame.prizeTier === 'gold'
        ? [strokeColor, glowColor ?? '#FF9100', '#FFEA00', '#FFFEF0', '#FFD700', '#FFFFFF']
        : burstTier === 'silver'
          ? [strokeColor, glowColor ?? '#94A3B8', '#F1F5F9', '#E2E8F0', '#FFFFFF']
          : [strokeColor, glowColor ?? '#EA580C', '#FDBA74', '#FDE68A', '#FFF7ED']
      : undefined;

  const content = (() => {
    if (prioritizeRemoteAvatar && avatarUrl?.trim()) {
      return (
        <Image source={{ uri: avatarUrl.trim() }} style={{ width: size, height: size, borderRadius: size / 2 }} />
      );
    }
    if (avatarType === 'illustrated') {
      const url = buildDiceBearUrl(illustratedAvatar, size * 2);
      return (
        <Image
          source={{ uri: url }}
          style={{ width: size, height: size, borderRadius: size / 2 }}
          contentFit="cover"
          transition={300}
        />
      );
    }
    if (avatarType === 'photo' && avatarUrl) {
      return <Image source={{ uri: avatarUrl }} style={{ width: size, height: size, borderRadius: size / 2 }} />;
    }
    if (avatarType === 'gradient') {
      return (
        <LinearGradient
          colors={gradientAvatar.colors}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={{ width: size, height: size, borderRadius: size / 2, alignItems: 'center', justifyContent: 'center' }}
        >
          <Text style={{ fontSize: size * 0.35, fontWeight: '900', color: '#FFF' }}>{gradientAvatar.initials}</Text>
        </LinearGradient>
      );
    }
    return (
      <View style={[styles.fallbackCircle, { width: size, height: size, borderRadius: size / 2, backgroundColor: colors.dark.card }]}>
        <Ionicons name="person" size={size * 0.4} color={colors.dark.textMuted} />
      </View>
    );
  })();

  return (
    <TouchableOpacity
      onPress={onPress}
      activeOpacity={0.8}
      disabled={!onPress}
      style={styles.avatarTap}
    >
      <View
        style={[
          styles.avatarOuter,
          {
            width: outerBox,
            height: outerBox,
            borderRadius: outerBox / 2,
            borderColor: strokeColor,
            borderWidth: effectiveBorderW,
            overflow: 'visible',
            backgroundColor: useRasterRing ? 'transparent' : undefined,
            ...(pulseFrame && !useRasterRing
              ? {
                  shadowColor: glowColor,
                  shadowOpacity: prizeTierIsGoldLike(pulseFrame.prizeTier) ? 0.98 : 0.92,
                  shadowRadius: prizeTierIsGoldLike(pulseFrame.prizeTier) ? 14 : 10,
                  shadowOffset: { width: 0, height: 0 },
                  elevation: prizeTierIsGoldLike(pulseFrame.prizeTier) ? 11 : 8,
                }
              : null),
          },
        ]}
      >
        <View
          style={{
            width: outerBox,
            height: outerBox,
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 2,
            backgroundColor: 'transparent',
          }}
        >
          {hasCaption ? (
            <PulseAvatarRingCaption
              boxSize={outerBox}
              ringWidth={ringW}
              photoDiameter={size}
              text={cap!}
              textColor={strokeColor}
              fontSize={captionFont}
            />
          ) : null}
          {content}
        </View>
        {useRasterRing && rasterSource ? (
          <Image
            source={rasterSource}
            style={{
              position: 'absolute',
              left: 0,
              top: 0,
              width: outerBox,
              height: outerBox,
              zIndex: 4,
              backgroundColor: 'transparent',
            }}
            contentFit="contain"
            pointerEvents="none"
          />
        ) : null}
        {showRasterGoldFireworks && pulseFrame ? (
          <GoldFireworksBurst
            ringDiameter={outerBox}
            tier="gold"
            sparkColors={fireworksPalette}
          />
        ) : null}
        {showProceduralFireworks && burstTier ? (
          <GoldFireworksBurst
            ringDiameter={outerBox}
            tier={burstTier}
            sparkColors={fireworksPalette}
          />
        ) : null}
      </View>
      {showOnlineDot ? (
        <View style={styles.onlineDot} />
      ) : null}
      {showEdit && (
        <View style={[styles.editBadge, { backgroundColor: strokeColor }]}>
          <Ionicons name="camera" size={14} color="#FFF" />
        </View>
      )}
    </TouchableOpacity>
  );
}

interface AvatarBuilderModalProps {
  visible: boolean;
  onClose: () => void;
  avatarUrl?: string;
  onPickPhoto: () => void;
}

export function AvatarBuilderModal({ visible, onClose, avatarUrl, onPickPhoto }: AvatarBuilderModalProps) {
  const {
    avatarType, setAvatarType,
    gradientAvatar, setGradientAvatar,
    illustratedAvatar, setIllustratedAvatar, randomizeSeed,
  } = useProfileCustomization();

  const [customSeed, setCustomSeed] = useState(illustratedAvatar.seed);

  return (
    <Modal visible={visible} animationType="slide" transparent>
      <View style={styles.modalOverlay}>
        <View style={styles.modalContent}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Customize Avatar</Text>
            <TouchableOpacity onPress={onClose}>
              <Ionicons name="close" size={24} color={colors.dark.text} />
            </TouchableOpacity>
          </View>

          {/* Avatar Preview */}
          <View style={styles.previewWrap}>
            <AvatarDisplay size={130} avatarUrl={avatarUrl} />
          </View>

          {/* Type Selector */}
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.typeRow}>
            {AVATAR_TYPES.map((t) => (
              <TouchableOpacity
                key={t.key}
                style={[styles.typeBtn, avatarType === t.key && styles.typeBtnActive]}
                onPress={() => {
                  setAvatarType(t.key);
                  if (t.key === 'photo') onPickPhoto();
                }}
                activeOpacity={0.7}
              >
                <Ionicons name={t.icon as any} size={18} color={avatarType === t.key ? '#FFF' : colors.dark.textMuted} />
                <Text style={[styles.typeLabel, avatarType === t.key && styles.typeLabelActive]}>{t.label}</Text>
              </TouchableOpacity>
            ))}
          </ScrollView>

          <ScrollView style={styles.optionsScroll} showsVerticalScrollIndicator={false}>
            {/* ---- ILLUSTRATED (DiceBear) ---- */}
            {avatarType === 'illustrated' && (
              <>
                <Text style={styles.optionTitle}>Art Style</Text>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.styleRow}>
                  {DICEBEAR_STYLES.map((s) => {
                    const previewUrl = buildDiceBearUrl(
                      { ...illustratedAvatar, style: s.key },
                      80,
                    );
                    return (
                      <TouchableOpacity
                        key={s.key}
                        style={[styles.styleCard, illustratedAvatar.style === s.key && styles.styleCardActive]}
                        onPress={() => setIllustratedAvatar({ style: s.key })}
                        activeOpacity={0.7}
                      >
                        <Image source={{ uri: previewUrl }} style={styles.stylePreview} contentFit="cover" transition={200} />
                        <Text style={[styles.styleLabel, illustratedAvatar.style === s.key && styles.styleLabelActive]}>
                          {s.label}
                        </Text>
                      </TouchableOpacity>
                    );
                  })}
                </ScrollView>

                <Text style={styles.optionTitle}>Character Seed</Text>
                <Text style={styles.optionSub}>Different seeds generate different characters</Text>

                {/* Randomize + Custom Input */}
                <View style={styles.seedRow}>
                  <TextInput
                    style={styles.seedInput}
                    value={customSeed}
                    onChangeText={(text) => {
                      setCustomSeed(text);
                      if (text.length > 0) setIllustratedAvatar({ seed: text });
                    }}
                    placeholder="Type a name or word..."
                    placeholderTextColor={colors.dark.textMuted}
                  />
                  <TouchableOpacity
                    style={styles.randomBtn}
                    onPress={() => {
                      randomizeSeed();
                      setCustomSeed(`PV-${Date.now().toString(36)}`);
                    }}
                    activeOpacity={0.7}
                  >
                    <Ionicons name="shuffle" size={20} color="#FFF" />
                  </TouchableOpacity>
                </View>

                {/* Seed Presets */}
                <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.presetRow}>
                  {SEED_PRESETS.map((seed) => (
                    <TouchableOpacity
                      key={seed}
                      style={[styles.presetChip, illustratedAvatar.seed === seed && styles.presetChipActive]}
                      onPress={() => { setIllustratedAvatar({ seed }); setCustomSeed(seed); }}
                      activeOpacity={0.7}
                    >
                      <Text style={[styles.presetText, illustratedAvatar.seed === seed && styles.presetTextActive]}>
                        {seed}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </ScrollView>

                <Text style={styles.optionTitle}>Background</Text>
                <View style={styles.colorRow}>
                  {DICEBEAR_BG_COLORS.map((c) => (
                    <TouchableOpacity
                      key={c}
                      onPress={() => setIllustratedAvatar({ backgroundColor: c })}
                      activeOpacity={0.7}
                    >
                      <View
                        style={[
                          styles.colorDot,
                          { backgroundColor: c === 'transparent' ? colors.dark.cardAlt : `#${c}` },
                          illustratedAvatar.backgroundColor === c && styles.colorDotActive,
                        ]}
                      >
                        {c === 'transparent' && <Ionicons name="close" size={14} color={colors.dark.textMuted} />}
                      </View>
                    </TouchableOpacity>
                  ))}
                </View>

                <TouchableOpacity
                  style={styles.flipRow}
                  onPress={() => setIllustratedAvatar({ flip: !illustratedAvatar.flip })}
                  activeOpacity={0.7}
                >
                  <Ionicons name="swap-horizontal" size={18} color={colors.dark.textSecondary} />
                  <Text style={styles.flipText}>Mirror / Flip</Text>
                  <View style={[styles.flipToggle, illustratedAvatar.flip && styles.flipToggleActive]}>
                    {illustratedAvatar.flip && <Ionicons name="checkmark" size={14} color="#FFF" />}
                  </View>
                </TouchableOpacity>
              </>
            )}

            {/* ---- GRADIENT / INITIALS ---- */}
            {avatarType === 'gradient' && (
              <>
                <Text style={styles.optionTitle}>Choose Gradient</Text>
                <View style={styles.gradientGrid}>
                  {GRADIENT_PAIRS.map((pair, i) => (
                    <TouchableOpacity key={i} onPress={() => setGradientAvatar({ colors: pair })} activeOpacity={0.7}>
                      <LinearGradient
                        colors={pair}
                        start={{ x: 0, y: 0 }}
                        end={{ x: 1, y: 1 }}
                        style={[
                          styles.gradientSample,
                          gradientAvatar.colors[0] === pair[0] && gradientAvatar.colors[1] === pair[1] && styles.gradientSampleActive,
                        ]}
                      >
                        <Text style={styles.gradientInitials}>{gradientAvatar.initials}</Text>
                      </LinearGradient>
                    </TouchableOpacity>
                  ))}
                </View>

                <Text style={styles.optionTitle}>Your Initials</Text>
                <TextInput
                  style={styles.initialsInput}
                  value={gradientAvatar.initials}
                  onChangeText={(text) => setGradientAvatar({ initials: text.toUpperCase().slice(0, 3) })}
                  maxLength={3}
                  placeholder="AB"
                  placeholderTextColor={colors.dark.textMuted}
                />
              </>
            )}

            {/* ---- PHOTO ---- */}
            {avatarType === 'photo' && (
              <View style={styles.photoHint}>
                <View style={styles.photoHintIcon}>
                  <Ionicons name="image-outline" size={40} color={colors.primary.teal} />
                </View>
                <Text style={styles.photoHintTitle}>Upload a Photo</Text>
                <Text style={styles.photoHintText}>Choose a photo from your gallery to use as your avatar</Text>
                <TouchableOpacity style={styles.photoPickBtn} onPress={onPickPhoto} activeOpacity={0.7}>
                  <Ionicons name="images-outline" size={18} color="#FFF" />
                  <Text style={styles.photoPickBtnText}>Choose from Gallery</Text>
                </TouchableOpacity>
              </View>
            )}

            <View style={{ height: 20 }} />
          </ScrollView>

          <TouchableOpacity style={styles.doneBtn} onPress={onClose} activeOpacity={0.7}>
            <Text style={styles.doneBtnText}>Done</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  avatarTap: { position: 'relative' },
  avatarOuter: {
    borderWidth: 3, alignItems: 'center', justifyContent: 'center',
  },
  fallbackCircle: { alignItems: 'center', justifyContent: 'center' },
  onlineDot: {
    position: 'absolute',
    top: 2,
    left: 2,
    width: 14,
    height: 14,
    borderRadius: 7,
    backgroundColor: '#22C55E',
    borderWidth: 2,
    borderColor: colors.dark.bg,
  },
  editBadge: {
    position: 'absolute', bottom: 0, right: 0,
    width: 32, height: 32, borderRadius: 16,
    alignItems: 'center', justifyContent: 'center',
    borderWidth: 3, borderColor: colors.dark.bg,
  },

  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.7)', justifyContent: 'flex-end' },
  modalContent: {
    backgroundColor: colors.dark.bg,
    borderTopLeftRadius: 24, borderTopRightRadius: 24,
    maxHeight: '90%', paddingBottom: 40,
  },
  modalHeader: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingHorizontal: 20, paddingVertical: 16,
    borderBottomWidth: 1, borderBottomColor: colors.dark.border,
  },
  modalTitle: { fontSize: 18, fontWeight: '800', color: colors.dark.text },
  previewWrap: { alignItems: 'center', paddingVertical: 20 },

  typeRow: { paddingHorizontal: 16, gap: 8, marginBottom: 16 },
  typeBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    paddingHorizontal: 16, paddingVertical: 10, borderRadius: 14,
    backgroundColor: colors.dark.card, borderWidth: 1, borderColor: colors.dark.border,
  },
  typeBtnActive: { backgroundColor: colors.primary.royal, borderColor: colors.primary.royal },
  typeLabel: { fontSize: 13, fontWeight: '600', color: colors.dark.textMuted },
  typeLabelActive: { color: '#FFF' },

  optionsScroll: { paddingHorizontal: 20, maxHeight: 380 },
  optionTitle: {
    fontSize: 13, fontWeight: '700', color: colors.dark.textSecondary,
    textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 8, marginTop: 12,
  },
  optionSub: { fontSize: 12, color: colors.dark.textMuted, marginBottom: 8, marginTop: -4 },

  styleRow: { gap: 10, paddingBottom: 4 },
  styleCard: {
    width: 90, alignItems: 'center', padding: 8, borderRadius: 14,
    backgroundColor: colors.dark.card, borderWidth: 2, borderColor: 'transparent',
  },
  styleCardActive: { borderColor: colors.primary.teal },
  stylePreview: { width: 60, height: 60, borderRadius: 30, backgroundColor: colors.dark.cardAlt },
  styleLabel: { fontSize: 10, fontWeight: '700', color: colors.dark.textMuted, marginTop: 6, textAlign: 'center' },
  styleLabelActive: { color: colors.primary.teal },

  seedRow: { flexDirection: 'row', gap: 8, marginBottom: 10 },
  seedInput: {
    flex: 1, backgroundColor: colors.dark.card, borderRadius: 12,
    paddingHorizontal: 14, paddingVertical: 10, fontSize: 14, color: colors.dark.text,
    borderWidth: 1, borderColor: colors.dark.border,
  },
  randomBtn: {
    width: 44, height: 44, borderRadius: 12,
    backgroundColor: colors.primary.royal, alignItems: 'center', justifyContent: 'center',
  },

  presetRow: { gap: 6, paddingBottom: 4 },
  presetChip: {
    paddingHorizontal: 12, paddingVertical: 6, borderRadius: 10,
    backgroundColor: colors.dark.card, borderWidth: 1, borderColor: colors.dark.border,
  },
  presetChipActive: { backgroundColor: colors.primary.teal + '20', borderColor: colors.primary.teal },
  presetText: { fontSize: 12, fontWeight: '600', color: colors.dark.textMuted },
  presetTextActive: { color: colors.primary.teal },

  colorRow: { flexDirection: 'row', gap: 8, flexWrap: 'wrap', marginBottom: 8 },
  colorDot: {
    width: 36, height: 36, borderRadius: 18,
    borderWidth: 3, borderColor: 'transparent',
    alignItems: 'center', justifyContent: 'center',
  },
  colorDotActive: { borderColor: '#FFF' },

  flipRow: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    backgroundColor: colors.dark.card, borderRadius: 12, padding: 12,
    marginTop: 8, borderWidth: 1, borderColor: colors.dark.border,
  },
  flipText: { flex: 1, fontSize: 14, fontWeight: '600', color: colors.dark.text },
  flipToggle: {
    width: 28, height: 28, borderRadius: 8,
    backgroundColor: colors.dark.cardAlt, alignItems: 'center', justifyContent: 'center',
    borderWidth: 1, borderColor: colors.dark.border,
  },
  flipToggleActive: { backgroundColor: colors.primary.teal, borderColor: colors.primary.teal },

  optionGridRow: { gap: 10, paddingBottom: 8 },
  optionItem: {
    width: 52, height: 52, borderRadius: 16,
    backgroundColor: colors.dark.card, alignItems: 'center', justifyContent: 'center',
    borderWidth: 2, borderColor: 'transparent',
  },
  optionItemActive: { borderColor: colors.primary.teal },

  gradientGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12 },
  gradientSample: {
    width: 70, height: 70, borderRadius: 35,
    alignItems: 'center', justifyContent: 'center',
    borderWidth: 3, borderColor: 'transparent',
  },
  gradientSampleActive: { borderColor: '#FFF' },
  gradientInitials: { fontSize: 22, fontWeight: '900', color: '#FFF' },
  initialsInput: {
    backgroundColor: colors.dark.card, borderRadius: 12,
    paddingHorizontal: 14, paddingVertical: 12, fontSize: 20,
    color: colors.dark.text, fontWeight: '800', textAlign: 'center',
    borderWidth: 1, borderColor: colors.dark.border, width: 100,
  },

  photoHint: { alignItems: 'center', paddingVertical: 30, gap: 10 },
  photoHintIcon: {
    width: 72, height: 72, borderRadius: 36,
    backgroundColor: colors.primary.teal + '15',
    alignItems: 'center', justifyContent: 'center', marginBottom: 8,
  },
  photoHintTitle: { fontSize: 16, fontWeight: '700', color: colors.dark.text },
  photoHintText: { fontSize: 13, color: colors.dark.textMuted, textAlign: 'center', paddingHorizontal: 30 },
  photoPickBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    backgroundColor: colors.primary.royal, paddingHorizontal: 24, paddingVertical: 12, borderRadius: 14,
    marginTop: 12,
  },
  photoPickBtnText: { fontSize: 14, fontWeight: '700', color: '#FFF' },

  doneBtn: {
    marginHorizontal: 20, marginTop: 16,
    backgroundColor: colors.primary.royal,
    paddingVertical: 14, borderRadius: 14, alignItems: 'center',
  },
  doneBtnText: { fontSize: 16, fontWeight: '700', color: '#FFF' },
});
