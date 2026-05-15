import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '@/theme';

type Props = {
  /** Current timeline clip exists — required before picking cutaways. */
  hasPrimaryVideo: boolean;
  /** Number of gallery clips queued after the main upload (B-roll path only). */
  queuedCutaways: number;
  onOpenPicker: () => void;
};

/**
 * B-roll in Advanced tools: queues cutaway clips for sequential posting (same queue mechanism as multi-part series).
 * FFmpeg concat as one MP4 is a backend step after uploads (`creator_media_jobs` kinds stitch/broll — see scripts/creator-media-worker.mjs).
 */
export function BrollInsertCard({ hasPrimaryVideo, queuedCutaways, onOpenPicker }: Props) {
  return (
    <View style={styles.wrap}>
      <Ionicons name="film-outline" size={22} color={colors.primary.gold} />
      <View style={{ flex: 1 }}>
        <Text style={styles.title}>B-roll cutaways</Text>
        <Text style={styles.sub}>
          Post your main video first, then each cutaway in sequence — we move each clip into place so you can caption separate Pulse posts. One merged MP4 uses ffmpeg outside this flow after clips are uploaded to storage (see scripts/creator-media-worker.mjs for operators).
        </Text>
        {queuedCutaways > 0 ? (
          <Text style={styles.queued}>{queuedCutaways} cutaway{queuedCutaways === 1 ? '' : 's'} queued</Text>
        ) : null}
        <TouchableOpacity
          style={[styles.cta, !hasPrimaryVideo && styles.ctaDisabled]}
          onPress={onOpenPicker}
          activeOpacity={0.85}
          disabled={!hasPrimaryVideo}
        >
          <Ionicons name="add-circle-outline" size={18} color={hasPrimaryVideo ? '#fff' : colors.dark.textMuted} />
          <Text style={[styles.ctaText, !hasPrimaryVideo && styles.ctaTextDisabled]}>Pick B-roll clips</Text>
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
    backgroundColor: colors.primary.gold + '14',
    borderWidth: 1,
    borderColor: colors.primary.gold + '44',
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
