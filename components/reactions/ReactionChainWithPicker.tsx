import React, { useCallback, useMemo, useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Modal,
  Pressable,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { formatCount } from '@/utils/format';
import { POST_REACTION_EMOJI, POST_REACTION_ORDER } from '@/lib/postReactions';
import { colors } from '@/theme';
import type { PostReactionCounts, PostReactionKind } from '@/types';

export interface ReactionChainWithPickerProps {
  counts: PostReactionCounts;
  viewerReaction: PostReactionKind | null;
  accentColor: string;
  onPick: (kind: PostReactionKind) => void;
}

/**
 * Collapsed reactions: only existing totals (+ viewer chip) as small pills and a
 * single “add” control. Full emoji set opens in a lightweight modal — avoids a
 * five-across strip on every comment/post row.
 */
export function ReactionChainWithPicker({
  counts,
  viewerReaction,
  accentColor,
  onPick,
}: ReactionChainWithPickerProps) {
  const [pickerOpen, setPickerOpen] = useState(false);

  const visibleKinds = useMemo(
    () =>
      POST_REACTION_ORDER.filter(
        (k) => (counts[k] ?? 0) > 0 || viewerReaction === k,
      ),
    [counts, viewerReaction],
  );

  const closePicker = useCallback(() => setPickerOpen(false), []);

  const handlePick = useCallback(
    (kind: PostReactionKind) => {
      onPick(kind);
      setPickerOpen(false);
    },
    [onPick],
  );

  return (
    <View style={styles.wrap}>
      <View style={styles.row}>
        {visibleKinds.map((kind) => {
          const n = counts[kind] ?? 0;
          const active = viewerReaction === kind;
          return (
            <TouchableOpacity
              key={kind}
              onPress={() => onPick(kind)}
              activeOpacity={0.75}
              style={[
                styles.chip,
                active && {
                  borderColor: accentColor,
                  backgroundColor: `${accentColor}22`,
                },
              ]}
              accessibilityRole="button"
              accessibilityLabel={`${POST_REACTION_EMOJI[kind]}${n > 0 ? `, ${n}` : ''}`}
            >
              <Text style={styles.chipEmoji} allowFontScaling>
                {POST_REACTION_EMOJI[kind]}
              </Text>
              {n > 0 ? (
                <Text
                  style={[styles.chipCount, active && { color: accentColor }]}
                  numberOfLines={1}
                >
                  {formatCount(n)}
                </Text>
              ) : null}
            </TouchableOpacity>
          );
        })}

        <TouchableOpacity
          onPress={() => setPickerOpen(true)}
          style={styles.addBtn}
          activeOpacity={0.75}
          accessibilityRole="button"
          accessibilityLabel="Add reaction"
          accessibilityHint="Choose an emoji reaction"
        >
          <Ionicons name="happy-outline" size={18} color={colors.dark.textSecondary} />
        </TouchableOpacity>
      </View>

      <Modal
        visible={pickerOpen}
        transparent
        animationType="fade"
        onRequestClose={closePicker}
      >
        <View style={styles.modalRoot} pointerEvents="box-none">
          <Pressable
            style={styles.modalBackdrop}
            onPress={closePicker}
            accessibilityRole="button"
            accessibilityLabel="Dismiss"
          />
          <View style={styles.modalCard} pointerEvents="auto">
            <Text style={styles.modalTitle}>React with</Text>
            <View style={styles.pickerRow}>
              {POST_REACTION_ORDER.map((kind) => {
                const active = viewerReaction === kind;
                return (
                  <TouchableOpacity
                    key={kind}
                    onPress={() => handlePick(kind)}
                    activeOpacity={0.75}
                    style={[
                      styles.pickerCell,
                      active && {
                        borderColor: accentColor,
                        backgroundColor: `${accentColor}18`,
                      },
                    ]}
                    accessibilityRole="button"
                    accessibilityLabel={`${POST_REACTION_EMOJI[kind]} reaction`}
                  >
                    <Text style={styles.pickerEmoji} allowFontScaling>
                      {POST_REACTION_EMOJI[kind]}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>
            <TouchableOpacity
              style={styles.modalCancel}
              onPress={closePicker}
              activeOpacity={0.7}
              accessibilityRole="button"
              accessibilityLabel="Cancel"
            >
              <Text style={styles.modalCancelText}>Cancel</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { alignSelf: 'flex-start', maxWidth: '100%' },
  row: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    gap: 6,
  },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingVertical: 4,
    paddingHorizontal: 8,
    borderRadius: 999,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.dark.border,
    backgroundColor: colors.dark.cardAlt,
  },
  chipEmoji: {
    fontSize: 15,
    lineHeight: 19,
  },
  chipCount: {
    fontSize: 11,
    fontWeight: '800',
    color: colors.dark.textMuted,
  },
  addBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.dark.border,
    backgroundColor: colors.dark.cardAlt,
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalRoot: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  modalBackdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.52)',
  },
  modalCard: {
    width: '100%',
    maxWidth: 340,
    backgroundColor: colors.dark.card,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.dark.border,
    paddingTop: 18,
    paddingHorizontal: 16,
    paddingBottom: 12,
    ...Platform.select({
      web: { boxShadow: '0 12px 40px rgba(0,0,0,0.45)' },
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 8 },
        shadowOpacity: 0.35,
        shadowRadius: 20,
      },
      android: { elevation: 12 },
      default: {},
    }),
  },
  modalTitle: {
    fontSize: 13,
    fontWeight: '800',
    color: colors.dark.textSecondary,
    textAlign: 'center',
    marginBottom: 14,
    letterSpacing: 0.3,
  },
  pickerRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    gap: 8,
  },
  pickerCell: {
    minWidth: 52,
    minHeight: 52,
    borderRadius: 14,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.dark.border,
    backgroundColor: colors.dark.cardAlt,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 8,
  },
  pickerEmoji: {
    fontSize: 30,
    lineHeight: 36,
  },
  modalCancel: {
    marginTop: 14,
    alignSelf: 'center',
    paddingVertical: 10,
    paddingHorizontal: 16,
  },
  modalCancelText: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.dark.textMuted,
  },
});
