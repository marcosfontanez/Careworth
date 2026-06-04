import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '@/theme';

type Props = {
  /** Current timeline clip exists — required before queueing more clips. */
  hasPrimaryVideo: boolean;
  /** Number of gallery clips queued after the main upload. */
  queuedClips: number;
  onOpenPicker: () => void;
};

/**
 * Combine Clips (formerly mislabeled "B-roll"): queues extra clips after the main
 * clip for a single post + server concat (`creator_media_jobs`). This is sequential
 * joining, NOT true B-roll/cutaway compositing — that lives in B-roll Studio.
 */
export function CombineClipsCard({ hasPrimaryVideo, queuedClips, onOpenPicker }: Props) {
  return (
    <View style={styles.wrap}>
      <Ionicons name="git-merge-outline" size={22} color={colors.primary.teal} />
      <View style={{ flex: 1 }}>
        <Text style={styles.title}>Combine clips</Text>
        <Text style={styles.sub}>
          Join multiple clips into one video. Your main clip plays first, then the clips you add are
          joined onto the end and rendered into a single post on the server.
        </Text>
        {queuedClips > 0 ? (
          <Text style={styles.queued}>{queuedClips} clip{queuedClips === 1 ? '' : 's'} queued</Text>
        ) : null}
        <TouchableOpacity
          style={[styles.cta, !hasPrimaryVideo && styles.ctaDisabled]}
          onPress={onOpenPicker}
          activeOpacity={0.85}
          disabled={!hasPrimaryVideo}
        >
          <Ionicons name="add-circle-outline" size={18} color={hasPrimaryVideo ? '#fff' : colors.dark.textMuted} />
          <Text style={[styles.ctaText, !hasPrimaryVideo && styles.ctaTextDisabled]}>Pick clips to combine</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    flexDirection: 'row',
    gap: 12,
    padding: 12,
    borderRadius: 14,
    backgroundColor: colors.primary.teal + '14',
    borderWidth: 1,
    borderColor: colors.primary.teal + '44',
  },
  title: { fontSize: 13, fontWeight: '800', color: colors.dark.text },
  sub: { fontSize: 11, color: colors.dark.textMuted, marginTop: 4, lineHeight: 15 },
  queued: {
    marginTop: 8,
    fontSize: 11,
    fontWeight: '700',
    color: colors.primary.teal,
  },
  cta: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    marginTop: 10,
    paddingVertical: 11,
    borderRadius: 12,
    backgroundColor: colors.primary.teal,
  },
  ctaDisabled: {
    backgroundColor: colors.dark.cardAlt,
    borderWidth: 1,
    borderColor: colors.dark.border,
  },
  ctaText: { fontSize: 13, fontWeight: '800', color: '#fff' },
  ctaTextDisabled: { color: colors.dark.textMuted },
});
