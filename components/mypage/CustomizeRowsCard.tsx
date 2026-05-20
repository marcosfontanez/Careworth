import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Switch,
  ActivityIndicator,
  Platform,
} from 'react-native';
import { Image } from 'expo-image';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { borderRadius, colors, shadows } from '@/theme';
import { pulseImageListThumbProps } from '@/lib/pulseImage';

/**
 * Premium "settings rows" card used at the top of the Customize → Look tab.
 *
 * Why this exists:
 *   The previous Customize layout was a long stack of section labels +
 *   inline inputs. Each field needed its own header, hint, and counter,
 *   which scrolled forever and never felt like a finished surface. The
 *   rows card collapses every field to a single tappable row (label, live
 *   preview, chevron) that opens its own focused editor — banner picker,
 *   text editor sheet, song picker, etc. The card itself stays one screen
 *   tall and matches the design mockup.
 */

type RowChromeProps = {
  iconName: keyof typeof Ionicons.glyphMap;
  iconColor: string;
  iconBgColor: string;
  iconBorderColor: string;
  label: string;
  sublabel?: string;
  /**
   * Optional right-side render slot. Use this for a thumbnail, value
   * preview, chip strip, or song mini-card. The chevron is added by the
   * row chrome itself; consumers shouldn't render their own.
   */
  rightSlot?: React.ReactNode;
  /** When true, hides the chevron (used for switch rows). */
  hideChevron?: boolean;
  /** Disables the press feedback (used for the switch row). */
  disabled?: boolean;
  onPress?: () => void;
};

function CustomizeRow({
  iconName,
  iconColor,
  iconBgColor,
  iconBorderColor,
  label,
  sublabel,
  rightSlot,
  hideChevron,
  disabled,
  onPress,
}: RowChromeProps) {
  const Container: any = onPress && !disabled ? TouchableOpacity : View;
  return (
    <Container
      style={styles.row}
      onPress={onPress}
      activeOpacity={0.85}
      accessibilityRole={onPress ? 'button' : undefined}
    >
      <View
        style={[
          styles.iconBubble,
          { backgroundColor: iconBgColor, borderColor: iconBorderColor },
        ]}
      >
        <Ionicons name={iconName} size={18} color={iconColor} />
      </View>
      <View style={styles.rowText}>
        <Text style={styles.rowLabel} numberOfLines={1}>
          {label}
        </Text>
        {sublabel ? (
          <Text style={styles.rowSublabel} numberOfLines={1}>
            {sublabel}
          </Text>
        ) : null}
      </View>
      {rightSlot ? <View style={styles.rowRight}>{rightSlot}</View> : null}
      {!hideChevron ? (
        <Ionicons
          name="chevron-forward"
          size={18}
          color="rgba(148,163,184,0.85)"
          style={styles.chevron}
        />
      ) : null}
    </Container>
  );
}

export type CustomizeRowsCardProps = {
  bannerPreview: string | null;
  avatarPreview: string | null;
  fallbackBannerUrl: string;
  fallbackAvatarUrl: string;
  /** Parsed pill labels for the Neon Tags row preview. */
  neonTags: string[];
  pageIntroValue: string;
  songTitle: string;
  songArtist: string;
  songArtworkUrl: string;
  hidePulseMusicPlayerOnMyPage: boolean;
  uploadingBanner: boolean;
  uploadingAvatar: boolean;
  onChangeBanner: () => void;
  onChangePhoto: () => void;
  onEditNeonTags: () => void;
  onEditPageIntro: () => void;
  onChangeVibe: () => void;
  onClearVibe: () => void;
  onToggleHidePulseMusicPlayer: (value: boolean) => void;
};

export function CustomizeRowsCard({
  bannerPreview,
  avatarPreview,
  fallbackBannerUrl,
  fallbackAvatarUrl,
  neonTags,
  pageIntroValue,
  songTitle,
  songArtist,
  songArtworkUrl,
  hidePulseMusicPlayerOnMyPage,
  uploadingBanner,
  uploadingAvatar,
  onChangeBanner,
  onChangePhoto,
  onEditNeonTags,
  onEditPageIntro,
  onChangeVibe,
  onClearVibe,
  onToggleHidePulseMusicPlayer,
}: CustomizeRowsCardProps) {
  const introTrim = pageIntroValue.trim();
  const tagsPreview = neonTags.slice(0, 3);
  const tagsOverflow = Math.max(0, neonTags.length - tagsPreview.length);
  const hasSong = Boolean(songTitle.trim() || songArtist.trim());

  return (
    <LinearGradient
      colors={['rgba(22,32,52,0.92)', 'rgba(12,18,32,0.96)']}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
      style={styles.card}
    >
      {/* Change Banner */}
      <CustomizeRow
        iconName="image-outline"
        iconColor="#67E8F9"
        iconBgColor="rgba(34,211,238,0.12)"
        iconBorderColor="rgba(34,211,238,0.32)"
        label="Change Banner"
        sublabel="Update your profile banner"
        onPress={uploadingBanner ? undefined : onChangeBanner}
        rightSlot={
          uploadingBanner ? (
            <View style={styles.bannerThumb}>
              <ActivityIndicator color={colors.primary.teal} />
            </View>
          ) : (
            <Image
              source={{ uri: bannerPreview ?? fallbackBannerUrl }}
              style={styles.bannerThumb}
              contentFit="cover"
              {...pulseImageListThumbProps}
            />
          )
        }
      />

      <RowDivider />

      {/* Change Profile Photo */}
      <CustomizeRow
        iconName="person-outline"
        iconColor="#A78BFA"
        iconBgColor="rgba(167,139,250,0.12)"
        iconBorderColor="rgba(167,139,250,0.32)"
        label="Change Profile Photo"
        sublabel="Choose your avatar"
        onPress={uploadingAvatar ? undefined : onChangePhoto}
        rightSlot={
          uploadingAvatar ? (
            <View style={styles.avatarThumb}>
              <ActivityIndicator color={colors.primary.teal} />
            </View>
          ) : (
            <Image
              source={{ uri: avatarPreview ?? fallbackAvatarUrl }}
              style={styles.avatarThumb}
              contentFit="cover"
              {...pulseImageListThumbProps}
            />
          )
        }
      />

      <RowDivider />

      {/* Neon Tags */}
      <CustomizeRow
        iconName="pricetag-outline"
        iconColor="#FBBF24"
        iconBgColor="rgba(251,191,36,0.12)"
        iconBorderColor="rgba(251,191,36,0.32)"
        label="Neon Tags"
        sublabel={tagsPreview.length === 0 ? 'Show off what you love' : undefined}
        onPress={onEditNeonTags}
        rightSlot={
          tagsPreview.length > 0 ? (
            <View style={styles.tagChipsRight}>
              {tagsPreview.map((t) => (
                <View key={t} style={styles.tagChip}>
                  <Text style={styles.tagChipText} numberOfLines={1}>
                    {t}
                  </Text>
                </View>
              ))}
              {tagsOverflow > 0 ? (
                <View style={[styles.tagChip, styles.tagChipMore]}>
                  <Text style={styles.tagChipText}>+{tagsOverflow}</Text>
                </View>
              ) : null}
            </View>
          ) : null
        }
      />

      <RowDivider />

      {/* Page Intro */}
      <CustomizeRow
        iconName="chatbubble-ellipses-outline"
        iconColor="#22D3EE"
        iconBgColor="rgba(34,211,238,0.12)"
        iconBorderColor="rgba(34,211,238,0.32)"
        label="Page Intro"
        sublabel={introTrim.length === 0 ? 'Your space. Your story.' : undefined}
        onPress={onEditPageIntro}
        rightSlot={
          introTrim.length > 0 ? (
            <Text style={styles.previewLine} numberOfLines={1}>
              {introTrim.length > 38 ? `${introTrim.slice(0, 36)}…` : introTrim}
            </Text>
          ) : null
        }
      />

      <RowDivider />

      {/* Current Vibe */}
      <CustomizeRow
        iconName="musical-notes-outline"
        iconColor="#F472B6"
        iconBgColor="rgba(244,114,182,0.12)"
        iconBorderColor="rgba(244,114,182,0.32)"
        label="Current Vibe"
        sublabel={hasSong ? undefined : 'Set your vibe with music'}
        onPress={onChangeVibe}
        rightSlot={
          hasSong ? (
            <View style={styles.songPreviewRow}>
              {songArtworkUrl ? (
                <Image
                  source={{ uri: songArtworkUrl }}
                  style={styles.songArtMini}
                  contentFit="cover"
                  {...pulseImageListThumbProps}
                />
              ) : (
                <View style={[styles.songArtMini, styles.songArtMiniFallback]}>
                  <Ionicons name="musical-notes" size={14} color="#FFF" />
                </View>
              )}
              <View style={styles.songPreviewMeta}>
                <Text style={styles.songPreviewTitle} numberOfLines={1}>
                  {songTitle || 'Untitled'}
                </Text>
                <Text style={styles.songPreviewArtist} numberOfLines={1}>
                  {songArtist || 'Unknown artist'}
                </Text>
              </View>
              <TouchableOpacity
                hitSlop={10}
                onPress={(e) => {
                  e.stopPropagation?.();
                  onClearVibe();
                }}
                style={styles.clearVibeBtn}
                accessibilityLabel="Remove song"
              >
                <Ionicons name="close" size={14} color="rgba(241,245,249,0.7)" />
              </TouchableOpacity>
            </View>
          ) : null
        }
      />

      <RowDivider />

      {/* Hide Current Vibe player — owner-only; visitors still hear your vibe. */}
      <CustomizeRow
        iconName="volume-mute-outline"
        iconColor="rgba(203,213,225,0.95)"
        iconBgColor="rgba(148,163,184,0.10)"
        iconBorderColor="rgba(148,163,184,0.28)"
        label="Hide Current Vibe player"
        sublabel="Only on your own My Pulse tab — visitors still see it"
        hideChevron
        disabled
        rightSlot={
          <Switch
            value={hidePulseMusicPlayerOnMyPage}
            onValueChange={onToggleHidePulseMusicPlayer}
            trackColor={{ false: 'rgba(148,163,184,0.35)', true: colors.primary.teal + 'AA' }}
            thumbColor={
              hidePulseMusicPlayerOnMyPage
                ? colors.primary.teal
                : Platform.OS === 'android'
                  ? 'rgba(241,245,249,0.95)'
                  : undefined
            }
            style={Platform.OS === 'ios' ? { transform: [{ scale: 0.85 }] } : undefined}
          />
        }
      />
    </LinearGradient>
  );
}

function RowDivider() {
  return <View style={styles.divider} pointerEvents="none" />;
}

const styles = StyleSheet.create({
  card: {
    borderRadius: borderRadius.xl,
    borderWidth: 1,
    borderColor: 'rgba(34,211,238,0.18)',
    paddingHorizontal: 4,
    paddingVertical: 4,
    overflow: 'hidden',
    ...shadows.premiumCard,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 12,
    gap: 12,
    minHeight: 64,
  },
  iconBubble: {
    width: 38,
    height: 38,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
  },
  rowText: { flex: 1, minWidth: 0 },
  rowLabel: {
    fontSize: 15.5,
    fontWeight: '800',
    color: colors.dark.text,
    letterSpacing: -0.2,
  },
  rowSublabel: {
    marginTop: 2,
    fontSize: 12,
    color: 'rgba(148,163,184,0.95)',
    fontWeight: '600',
  },
  rowRight: {
    flexShrink: 0,
    flexDirection: 'row',
    alignItems: 'center',
    maxWidth: 175,
  },
  chevron: { marginLeft: 6 },
  divider: {
    height: StyleSheet.hairlineWidth,
    backgroundColor: 'rgba(148,163,184,0.18)',
    marginHorizontal: 14,
  },
  bannerThumb: {
    width: 78,
    height: 38,
    borderRadius: 8,
    backgroundColor: colors.dark.cardAlt,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarThumb: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: colors.dark.cardAlt,
    borderWidth: 1.5,
    borderColor: 'rgba(167,139,250,0.45)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  tagChipsRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    flexShrink: 1,
    flexWrap: 'nowrap',
  },
  tagChip: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: 'rgba(251,191,36,0.4)',
    backgroundColor: 'rgba(251,191,36,0.10)',
    maxWidth: 90,
  },
  tagChipMore: {
    borderColor: 'rgba(148,163,184,0.4)',
    backgroundColor: 'rgba(148,163,184,0.12)',
  },
  tagChipText: {
    fontSize: 11,
    fontWeight: '800',
    color: '#FDE68A',
    letterSpacing: 0.1,
  },
  previewLine: {
    fontSize: 13,
    fontWeight: '600',
    color: '#67E8F9',
    maxWidth: 170,
    textAlign: 'right',
  },
  songPreviewRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingVertical: 4,
    paddingHorizontal: 6,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(244,114,182,0.32)',
    backgroundColor: 'rgba(244,114,182,0.08)',
    maxWidth: 180,
  },
  songArtMini: {
    width: 28,
    height: 28,
    borderRadius: 6,
    backgroundColor: colors.dark.cardAlt,
  },
  songArtMiniFallback: {
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(244,114,182,0.6)',
  },
  songPreviewMeta: { flexShrink: 1, minWidth: 0, maxWidth: 110 },
  songPreviewTitle: {
    fontSize: 12,
    fontWeight: '800',
    color: colors.dark.text,
  },
  songPreviewArtist: {
    fontSize: 10.5,
    color: 'rgba(203,213,225,0.85)',
    fontWeight: '600',
  },
  clearVibeBtn: {
    width: 22,
    height: 22,
    borderRadius: 11,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(15,23,42,0.85)',
  },
});
