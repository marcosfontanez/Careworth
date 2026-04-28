import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors, borderRadius } from '@/theme';
import { formatCount } from '@/utils/format';

type Props = {
  circleIcon: string;
  circleAccent: string;
  memberCount: number;
  onlineCount: number;
  etiquette: string;
};

/**
 * Premium footer card for the create flow. Sits above the bottom CTA bar
 * and reminds the user (a) where they're posting and (b) the room's tone.
 *
 * Design intent: this is what makes the composer feel like part of a living
 * room rather than a generic form — a small but meaningful "you're posting
 * to 1.8K members in this room" cue that the old Reddit-style screen lacked.
 */
export function CircleContextFooter({
  circleIcon,
  circleAccent,
  memberCount,
  onlineCount,
  etiquette,
}: Props) {
  return (
    <View style={styles.wrap}>
      <View style={[styles.row, { borderColor: `${circleAccent}40` }]}>
        <View style={[styles.iconWrap, { backgroundColor: `${circleAccent}26`, borderColor: `${circleAccent}55` }]}>
          <Text style={{ fontSize: 18 }}>{circleIcon}</Text>
        </View>
        <View style={styles.copy}>
          <Text style={styles.title}>Visible to circle members</Text>
          <View style={styles.metaRow}>
            <Ionicons name="people" size={11} color={colors.dark.textMuted} />
            <Text style={styles.meta}>{formatCount(memberCount)} members</Text>
            {onlineCount > 0 ? (
              <>
                <View style={styles.dot} />
                <View style={styles.onlineDot} />
                <Text style={styles.meta}>{formatCount(onlineCount)} online</Text>
              </>
            ) : null}
          </View>
        </View>
      </View>

      {/* Etiquette line — tightened so it reads as a quiet community
          motto, not a banner. The heart icon sits inline with the text
          and the color softly leans into the room's accent. */}
      <View style={styles.etiquetteRow}>
        <Ionicons name="heart" size={11} color={`${circleAccent}DD`} />
        <Text style={[styles.etiquette, { color: `${circleAccent}DD` }]} numberOfLines={1}>
          {etiquette}
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { gap: 10 },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 10,
    paddingHorizontal: 12,
    backgroundColor: colors.dark.card,
    borderRadius: borderRadius.card ?? 14,
    borderWidth: 1,
  },
  iconWrap: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
  },
  copy: { flex: 1, minWidth: 0 },
  title: { fontSize: 13.5, fontWeight: '800', color: colors.dark.text },
  metaRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 2 },
  meta: { fontSize: 12, fontWeight: '600', color: colors.dark.textMuted },
  dot: { width: 3, height: 3, borderRadius: 1.5, backgroundColor: colors.dark.textMuted },
  /** Live-online dot — small green pulse next to the count so the room
   *  feels active rather than static. */
  onlineDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#22C55E',
  },
  etiquetteRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 5,
    paddingHorizontal: 12,
  },
  etiquette: {
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 0.1,
  },
});
