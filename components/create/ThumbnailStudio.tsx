import React, { useEffect, useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Modal, Image, ActivityIndicator, ScrollView } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import Slider from '@react-native-community/slider';
import { colors } from '@/theme';
import type { MediaAsset } from '@/lib/media';
import { makeVideoThumbnail } from '@/lib/videoMetadata';

interface Props {
  visible: boolean;
  onClose: () => void;
  media: MediaAsset;
  onPick: (localUri: string, atSec: number) => void;
}

/**
 * Thumbnail studio — scrub through the video to pick the perfect cover frame.
 * Uses `expo-video-thumbnails` (via makeVideoThumbnail) at the chosen timestamp.
 */
export function ThumbnailStudio({ visible, onClose, media, onPick }: Props) {
  const duration = Math.max(0.1, media.duration ?? 0);
  const [t, setT] = useState(0);
  const [thumb, setThumb] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!visible) return;
    setT(0);
    let cancelled = false;
    setLoading(true);
    makeVideoThumbnail(media.uri, 0).then((u) => {
      if (!cancelled) {
        setThumb(u);
        setLoading(false);
      }
    });
    return () => {
      cancelled = true;
    };
  }, [visible, media.uri]);

  const refresh = async (atSec: number) => {
    setLoading(true);
    const u = await makeVideoThumbnail(media.uri, atSec);
    setThumb(u);
    setLoading(false);
  };

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View style={styles.backdrop}>
        <View style={styles.sheet}>
          <View style={styles.handle} />
          <View style={styles.headerRow}>
            <Text style={styles.title}>Thumbnail studio</Text>
            <TouchableOpacity onPress={onClose} hitSlop={10}>
              <Ionicons name="close" size={22} color={colors.dark.textMuted} />
            </TouchableOpacity>
          </View>
          <Text style={styles.lede}>Scrub to pick the exact frame for your cover.</Text>

          <View style={styles.previewWrap}>
            {thumb ? (
              <Image source={{ uri: thumb }} style={styles.previewImg} resizeMode="cover" />
            ) : (
              <View style={[styles.previewImg, { alignItems: 'center', justifyContent: 'center' }]}>
                <ActivityIndicator color={colors.primary.teal} />
              </View>
            )}
            {loading ? (
              <View style={styles.loadingPill}>
                <ActivityIndicator size="small" color="#FFF" />
                <Text style={styles.loadingText}>Capturing…</Text>
              </View>
            ) : null}
          </View>

          <View style={styles.scrubRow}>
            <Text style={styles.timeText}>{formatTime(t)}</Text>
            <Slider
              style={{ flex: 1 }}
              minimumValue={0}
              maximumValue={duration}
              value={t}
              minimumTrackTintColor={colors.primary.teal}
              maximumTrackTintColor={colors.dark.cardAlt}
              thumbTintColor={colors.primary.teal}
              onValueChange={setT}
              onSlidingComplete={(v) => refresh(v)}
            />
            <Text style={styles.timeText}>{formatTime(duration)}</Text>
          </View>

          <Text style={styles.label}>Quick frames</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.row}>
            {[0.1, 0.25, 0.5, 0.75, 0.9].map((p) => (
              <TouchableOpacity
                key={p}
                style={styles.quickChip}
                onPress={() => {
                  const at = duration * p;
                  setT(at);
                  refresh(at);
                }}
              >
                <Text style={styles.quickChipText}>{Math.round(p * 100)}%</Text>
              </TouchableOpacity>
            ))}
          </ScrollView>

          <TouchableOpacity
            style={[styles.useBtn, !thumb && { opacity: 0.5 }]}
            onPress={() => {
              if (!thumb) return;
              onPick(thumb, t);
              onClose();
            }}
            disabled={!thumb}
            activeOpacity={0.85}
          >
            <Ionicons name="image" size={16} color="#FFF" />
            <Text style={styles.useText}>Use this frame as cover</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
}

function formatTime(sec: number): string {
  const m = Math.floor(sec / 60);
  const s = Math.floor(sec % 60);
  return `${m}:${s.toString().padStart(2, '0')}`;
}

const styles = StyleSheet.create({
  backdrop: { flex: 1, justifyContent: 'flex-end', backgroundColor: '#0008' },
  sheet: {
    backgroundColor: colors.dark.bg,
    borderTopLeftRadius: 24, borderTopRightRadius: 24,
    paddingHorizontal: 16, paddingTop: 8, paddingBottom: 28,
    borderTopWidth: 1, borderColor: colors.dark.border, gap: 12,
  },
  handle: { width: 40, height: 4, borderRadius: 2, backgroundColor: colors.dark.cardAlt, alignSelf: 'center' },
  headerRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingTop: 8 },
  title: { fontSize: 16, fontWeight: '800', color: colors.dark.text },
  lede: { fontSize: 12, color: colors.dark.textSecondary },
  previewWrap: {
    aspectRatio: 9 / 16,
    maxHeight: 320,
    borderRadius: 16, overflow: 'hidden',
    alignSelf: 'center', width: '70%',
    backgroundColor: colors.dark.card,
  },
  previewImg: { width: '100%', height: '100%' },
  loadingPill: {
    position: 'absolute', top: 12, alignSelf: 'center',
    flexDirection: 'row', gap: 6, alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.6)',
    paddingHorizontal: 8, paddingVertical: 4, borderRadius: 8,
  },
  loadingText: { color: '#FFF', fontSize: 11, fontWeight: '700' },

  scrubRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  timeText: { fontSize: 11, fontWeight: '800', color: colors.dark.textMuted, minWidth: 38, textAlign: 'center' },

  label: { fontSize: 11, fontWeight: '800', color: colors.dark.textMuted, textTransform: 'uppercase', letterSpacing: 0.5 },
  row: { flexDirection: 'row', gap: 8 },
  quickChip: {
    paddingHorizontal: 12, paddingVertical: 8, borderRadius: 999,
    backgroundColor: colors.dark.card, borderWidth: 1, borderColor: colors.dark.border,
  },
  quickChipText: { fontSize: 12, fontWeight: '800', color: colors.dark.textSecondary },

  useBtn: {
    flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: 8,
    paddingVertical: 14, borderRadius: 14,
    backgroundColor: colors.primary.teal,
  },
  useText: { fontSize: 14, fontWeight: '900', color: '#FFF' },
});
