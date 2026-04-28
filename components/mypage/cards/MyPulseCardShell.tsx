import React, { useCallback, useState } from 'react';
import {
  Alert,
  Pressable,
  Share,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { colors, borderRadius, shadows, spacing } from '@/theme';
import type { ProfileUpdateDisplayType } from '@/types';
import { CirclesOrbitIcon } from './icons/CirclesOrbitIcon';
import { withPulseVerseCta } from '@/lib/share';
import { EditPostCaptionModal } from '@/components/posts/EditPostCaptionModal';

export interface MyPulseTypeVisual {
  label: string;
  accent: string;
  fill: string;
  ring: string;
  /** Very soft gradient tint used on the card body for subtle type identity. */
  washStart: string;
  washEnd: string;
  icon: keyof typeof Ionicons.glyphMap;
  /**
   * Optional custom glyph component rendered in place of the Ionicon when
   * present. Takes `size` + `color` props so the same glyph scales cleanly
   * for the 11px pill badge, the 13px composer chip, and the 22px hub
   * tile without the Ionicons fallback ever being used.
   *
   * Used today by the `circle` type to render the custom Circles orbit
   * glyph instead of a stock chatbubbles icon.
   */
  glyph?: (props: { size: number; color: string }) => React.ReactElement;
}

/**
 * Canonical visual tokens for the four My Pulse display types. Every card
 * renders through the same shell and picks its chip/accent here so themes
 * stay perfectly consistent across the feed and composer.
 */
export const MY_PULSE_VISUALS: Record<ProfileUpdateDisplayType, MyPulseTypeVisual> = {
  thought: {
    label: 'Thought',
    accent: colors.primary.teal,
    fill: 'rgba(20,184,166,0.16)',
    ring: 'rgba(20,184,166,0.32)',
    washStart: 'rgba(20,184,166,0.12)',
    washEnd: 'rgba(20,184,166,0.00)',
    icon: 'chatbubble-ellipses',
  },
  clip: {
    label: 'Clip',
    accent: '#60A5FA',
    fill: 'rgba(96,165,250,0.16)',
    ring: 'rgba(96,165,250,0.32)',
    washStart: 'rgba(96,165,250,0.14)',
    washEnd: 'rgba(96,165,250,0.00)',
    icon: 'play-circle',
  },
  link: {
    label: 'Link',
    accent: '#C084FC',
    fill: 'rgba(192,132,252,0.16)',
    ring: 'rgba(192,132,252,0.32)',
    washStart: 'rgba(192,132,252,0.13)',
    washEnd: 'rgba(192,132,252,0.00)',
    icon: 'link',
  },
  pics: {
    label: 'Pics',
    accent: colors.primary.gold,
    fill: 'rgba(251,191,36,0.16)',
    ring: 'rgba(251,191,36,0.32)',
    washStart: 'rgba(251,191,36,0.14)',
    washEnd: 'rgba(251,191,36,0.00)',
    icon: 'images',
  },
  /**
   * `circle` = a Circles discussion the owner pinned to their Pulse. Distinct
   * warm rose/pink accent so it reads as "community conversation" and can't
   * be visually confused with the blue Clip accent (videos) or the gold Pics
   * accent. Label is intentionally longer ("Circle Discussion") because this
   * is a share-only type — not used in the composer — so the extra room on
   * the pill is fine and the full phrase tells visitors exactly what they're
   * looking at.
   */
  circle: {
    label: 'Circle Discussion',
    accent: '#F472B6',
    fill: 'rgba(244,114,182,0.16)',
    ring: 'rgba(244,114,182,0.36)',
    washStart: 'rgba(244,114,182,0.14)',
    washEnd: 'rgba(244,114,182,0.00)',
    // Fallback Ionicon if something bypasses `glyph` (e.g. very old callers
    // or tests that still read `icon` directly).
    icon: 'chatbubbles',
    /**
     * Custom orbit glyph mirroring the Circles wordmark. Inherits the rose
     * accent at the pill badge (solid color so it never competes with the
     * pill label) and falls back to the logo's blue→purple gradient when
     * rendered ambient (no color override passed).
     */
    glyph: ({ size, color }) => <CirclesOrbitIcon size={size} color={color} />,
  },
};

interface ShellProps {
  displayType: ProfileUpdateDisplayType;
  timeLabel: string;
  onPress?: () => void;
  onDelete?: () => Promise<void> | void;
  onShare?: () => Promise<void> | void;
  shareMessage?: string;
  readOnly?: boolean;
  onLike?: () => void;
  onComment?: () => void;
  likeCount?: number;
  commentCount?: number;
  liked?: boolean;
  /**
   * Pin state for this card. When true we render a "Pinned" badge in the
   * top row and flip the menu action to "Unpin". Tapping the action invokes
   * {@link onTogglePin} with no args — the parent owns the toggle logic
   * (state of the update, RPC dispatch, cache invalidation).
   */
  isPinned?: boolean;
  onTogglePin?: () => Promise<void> | void;
  /**
   * When set, the owner's action-sheet gains an "Edit" button that
   * opens {@link EditPostCaptionModal} pre-seeded with
   * {@link editContent}. `onEdit` gets the new body and is expected
   * to flush the server write + reconcile caches. Leave both undefined
   * on types where editing doesn't make sense (e.g. read-only circle
   * shares where the body lives on the linked thread).
   */
  editContent?: string;
  onEdit?: (nextContent: string) => Promise<void>;
  /**
   * True when the server has stamped `edited_at` on this update.
   * Renders a subtle "· edited" tag next to the time pill so viewers
   * can tell the body has been revised.
   */
  wasEdited?: boolean;
  children: React.ReactNode;
}

export function MyPulseCardShell({
  displayType,
  timeLabel,
  onPress,
  onDelete,
  onShare,
  shareMessage,
  readOnly,
  onLike,
  onComment,
  likeCount = 0,
  commentCount = 0,
  liked = false,
  isPinned = false,
  onTogglePin,
  editContent,
  onEdit,
  wasEdited = false,
  children,
}: ShellProps) {
  const vis = MY_PULSE_VISUALS[displayType];
  const [pressed, setPressed] = useState(false);
  const [editing, setEditing] = useState(false);

  const handleShare = useCallback(async () => {
    if (onShare) {
      await onShare();
      return;
    }
    if (shareMessage) {
      try {
        /**
         * Always suffix the external share with a "Get PulseVerse"
         * CTA so recipients who receive this via SMS / email / DMs
         * know where to install the app. withPulseVerseCta is
         * idempotent — safe to call even if the caller already
         * included the CTA upstream.
         */
        await Share.share({ message: withPulseVerseCta(shareMessage) });
      } catch {
        /* noop */
      }
    }
  }, [onShare, shareMessage]);

  const handleMenu = useCallback(() => {
    const buttons: { text: string; style?: 'cancel' | 'destructive'; onPress?: () => void }[] = [];

    /**
     * Pin / Unpin is the most commonly-used creator action on My Pulse
     * (keeps a "featured" post at the top permanently) so we lead the
     * menu with it when the owner is looking at their own card. The
     * label flips automatically based on current state.
     */
    if (!readOnly && onTogglePin) {
      buttons.push({
        text: isPinned ? 'Unpin from top' : 'Pin to top',
        onPress: () => {
          void onTogglePin();
        },
      });
    }

    /**
     * Edit shows up right after Pin so the "revise my own content"
     * path is the second-most-prominent owner action. We require both
     * `editContent` (seed text) and `onEdit` (mutation hook) so card
     * types that can't meaningfully be edited (e.g. clip/circle,
     * where the body lives on the linked resource) can simply omit
     * one and the affordance disappears without a version bump.
     */
    if (!readOnly && onEdit && typeof editContent === 'string') {
      buttons.push({
        text: 'Edit',
        onPress: () => setEditing(true),
      });
    }

    buttons.push({ text: 'Share', onPress: () => void handleShare() });

    if (!readOnly && onDelete) {
      buttons.push({
        text: 'Delete',
        style: 'destructive',
        onPress: () => {
          Alert.alert('Remove this update?', 'It will disappear from your My Pulse.', [
            { text: 'Cancel', style: 'cancel' },
            {
              text: 'Delete',
              style: 'destructive',
              onPress: () => {
                void onDelete();
              },
            },
          ]);
        },
      });
    }
    buttons.push({ text: 'Cancel', style: 'cancel' });
    Alert.alert('Update', undefined, buttons);
  }, [handleShare, onDelete, readOnly, onTogglePin, isPinned, onEdit, editContent]);

  /**
   * When pinned, we tighten the shell's border to a stronger teal so the
   * card reads as "featured" at a glance — a silent second signal on top
   * of the explicit PINNED pill. Kept subtle (alpha is only bumped, not
   * swapped to a loud color) so the effect is editorial rather than loud.
   */
  const shellBorderColor = isPinned ? 'rgba(20,184,166,0.55)' : vis.ring;

  return (
    <View style={[styles.shell, shadows.subtle, { borderColor: shellBorderColor }]}>
      {/* Accent rail on the left — the strongest type signal */}
      <LinearGradient
        colors={[vis.accent, vis.accent + '55']}
        start={{ x: 0, y: 0 }}
        end={{ x: 0, y: 1 }}
        style={styles.accentRail}
      />

      {/* Full-body tint — a deeper, type-aware wash (mock-accurate) */}
      <LinearGradient
        colors={[vis.washStart, 'rgba(11,19,32,0.0)']}
        start={{ x: 0, y: 0 }}
        end={{ x: 0.6, y: 1 }}
        style={styles.wash}
      />

      <View style={styles.body}>
        <Pressable
          onPress={onPress}
          onPressIn={() => setPressed(true)}
          onPressOut={() => setPressed(false)}
          style={[styles.tap, pressed && onPress ? styles.tapPressed : null]}
          accessibilityRole={onPress ? 'button' : undefined}
        >
          <View style={styles.topRow}>
            <View
              style={[
                styles.typePill,
                { backgroundColor: vis.fill, borderColor: vis.ring },
              ]}
            >
              {vis.glyph ? (
                vis.glyph({ size: 13, color: vis.accent })
              ) : (
                <Ionicons name={vis.icon} size={11} color={vis.accent} />
              )}
              <Text
                style={[styles.typePillLabel, { color: vis.accent }]}
                numberOfLines={1}
                allowFontScaling={false}
              >
                {vis.label}
              </Text>
            </View>
            {isPinned ? (
              <View style={styles.pinnedPill}>
                <Ionicons name="pin" size={10} color={colors.primary.teal} />
                <Text style={styles.pinnedPillLabel}>Pinned</Text>
              </View>
            ) : null}
            <View style={[styles.timeDotMark, { backgroundColor: vis.accent }]} />
            <Text style={styles.timeDot} numberOfLines={1}>
              {timeLabel}
              {wasEdited ? <Text style={styles.editedTag}> · edited</Text> : null}
            </Text>
            <View style={{ flex: 1 }} />
            {!readOnly && (onDelete || onShare || shareMessage || onTogglePin || onEdit) ? (
              <TouchableOpacity
                onPress={handleMenu}
                hitSlop={10}
                accessibilityLabel="More options"
                style={styles.menuBtn}
              >
                <Ionicons
                  name="ellipsis-horizontal"
                  size={14}
                  color={colors.dark.textMuted}
                />
              </TouchableOpacity>
            ) : null}
          </View>

          {children}
        </Pressable>

        <View style={styles.actionRow}>
          <ActionBtn
            icon={liked ? 'heart' : 'heart-outline'}
            color={liked ? '#FF2D92' : colors.dark.textMuted}
            label="Pulse"
            count={likeCount}
            onPress={onLike}
          />
          <View style={styles.actionDivider} />
          <ActionBtn
            icon="chatbubble-outline"
            color={colors.dark.textMuted}
            label="Comment"
            count={commentCount}
            onPress={onComment}
          />
          <View style={styles.actionDivider} />
          <ActionBtn
            icon="share-outline"
            color={colors.dark.textMuted}
            label="Share"
            onPress={() => void handleShare()}
          />
        </View>
      </View>

      {/**
       * Owner-only edit sheet. Mounted lazily when `onEdit` +
       * `editContent` are provided; the modal self-seeds its input
       * with the current body every time it opens so a cancelled edit
       * on one card never leaks a draft into another.
       */}
      {!readOnly && onEdit && typeof editContent === 'string' ? (
        <EditPostCaptionModal
          visible={editing}
          initialCaption={editContent}
          accent={vis.accent}
          title={editDialogTitle(displayType)}
          placeholder={editDialogPlaceholder(displayType)}
          hint="Your update is refreshed for everyone viewing your Pulse. A small “edited” tag will appear next to the time."
          /**
           * My Pulse rows all need a non-empty body (we use `content`
           * as the thought / caption / note for every display type).
           * Blocking empty saves matches the create-flow rule so edits
           * can't drop a card below the "needs a body" bar.
           */
          allowEmpty={false}
          onSave={async (next) => {
            await onEdit(next);
          }}
          onClose={() => setEditing(false)}
        />
      ) : null}
    </View>
  );
}

/**
 * Type-aware titles for the edit sheet so the sheet header matches
 * what the user actually wrote: a Thought is a "thought", a Link has
 * a "note", etc. We avoid the generic word "caption" here — it maps
 * to feed-post mental model that doesn't fit the My Pulse surfaces.
 */
function editDialogTitle(t: ProfileUpdateDisplayType): string {
  switch (t) {
    case 'thought':
      return 'Edit thought';
    case 'clip':
      return 'Edit clip note';
    case 'link':
      return 'Edit link note';
    case 'pics':
      return 'Edit caption';
    case 'circle':
      return 'Edit note';
    default:
      return 'Edit';
  }
}

function editDialogPlaceholder(t: ProfileUpdateDisplayType): string {
  switch (t) {
    case 'thought':
      return 'What’s on your mind?';
    case 'clip':
      return 'Say something about this clip…';
    case 'link':
      return 'Tell visitors why you’re sharing this link…';
    case 'pics':
      return 'Add a caption to your photos…';
    case 'circle':
      return 'Add context for visitors…';
    default:
      return 'Your update';
  }
}

function ActionBtn({
  icon,
  color,
  label,
  count,
  onPress,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  color: string;
  label: string;
  count?: number;
  onPress?: () => void;
}) {
  return (
    <TouchableOpacity
      style={styles.actionBtn}
      onPress={onPress}
      activeOpacity={0.7}
      accessibilityRole="button"
      accessibilityLabel={label}
    >
      <Ionicons name={icon} size={15} color={color} />
      <Text style={styles.actionLabel}>{label}</Text>
      {typeof count === 'number' && count > 0 ? (
        <Text style={styles.actionCount}>{formatCount(count)}</Text>
      ) : null}
    </TouchableOpacity>
  );
}

function formatCount(n: number): string {
  if (n < 1_000) return String(n);
  if (n < 10_000) return `${(n / 1_000).toFixed(1).replace(/\.0$/, '')}K`;
  if (n < 1_000_000) return `${Math.round(n / 1_000)}K`;
  return `${(n / 1_000_000).toFixed(1).replace(/\.0$/, '')}M`;
}

const styles = StyleSheet.create({
  shell: {
    flexDirection: 'row',
    backgroundColor: '#0D1524',
    borderRadius: borderRadius.xl,
    borderWidth: 1,
    overflow: 'hidden',
    marginBottom: spacing.md,
  },
  accentRail: {
    width: 4,
    alignSelf: 'stretch',
  },
  /** Deeper wash that wraps the full card — matches mock's tinted card body */
  wash: {
    position: 'absolute',
    left: 4,
    right: 0,
    top: 0,
    bottom: 0,
    pointerEvents: 'none',
  },
  body: {
    flex: 1,
    paddingHorizontal: 14,
    paddingTop: 12,
    paddingBottom: 6,
  },
  tap: {
    borderRadius: borderRadius.md,
  },
  tapPressed: {
    opacity: 0.9,
  },
  topRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 10,
  },
  typePill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: borderRadius.chip,
    borderWidth: 1,
  },
  typePillLabel: {
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 0.5,
    textTransform: 'uppercase',
  },
  /**
   * Compact teal "Pinned" pill that sits directly after the type label
   * when this card is pinned. Uses the app's canonical teal so it reads
   * as a PulseVerse system signal rather than part of the type's accent.
   */
  pinnedPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    paddingHorizontal: 7,
    paddingVertical: 3,
    borderRadius: borderRadius.chip,
    backgroundColor: 'rgba(20,184,166,0.14)',
    borderWidth: 1,
    borderColor: 'rgba(20,184,166,0.40)',
  },
  pinnedPillLabel: {
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 0.5,
    textTransform: 'uppercase',
    color: colors.primary.teal,
  },
  timeDotMark: {
    width: 3,
    height: 3,
    borderRadius: 1.5,
    opacity: 0.7,
  },
  editedTag: {
    fontSize: 11,
    fontWeight: '500',
    fontStyle: 'italic',
    color: colors.dark.textMuted,
  },
  timeDot: {
    fontSize: 11,
    fontWeight: '600',
    color: colors.dark.textMuted,
    letterSpacing: 0.1,
  },
  menuBtn: {
    padding: 4,
  },
  actionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 12,
    paddingTop: 10,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: 'rgba(255,255,255,0.08)',
  },
  actionBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 5,
    paddingVertical: 6,
  },
  actionDivider: {
    width: StyleSheet.hairlineWidth,
    height: 14,
    backgroundColor: 'rgba(255,255,255,0.08)',
  },
  actionLabel: {
    fontSize: 11.5,
    fontWeight: '700',
    color: colors.dark.textSecondary,
    letterSpacing: 0.15,
  },
  actionCount: {
    fontSize: 11,
    fontWeight: '800',
    color: colors.dark.textMuted,
    marginLeft: 2,
    fontVariant: ['tabular-nums'],
  },
});
