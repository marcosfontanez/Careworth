import React, { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Modal, ScrollView, Alert } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { colors } from '@/theme';
import {
  VIDEO_MAX_SECONDS,
  VIDEO_MIN_SECONDS,
  normalizePickerVideoDurationSeconds,
  type MediaAsset,
} from '@/lib/media';

export type MultiClipStitchVariant = 'series' | 'broll';

interface Props {
  visible: boolean;
  onClose: () => void;
  primary: MediaAsset | null;
  /** series = episodic parts; broll = cutaways after main story (same queue semantics). */
  variant?: MultiClipStitchVariant;
  onConfirm: (clips: MediaAsset[]) => void;
}

const COPY: Record<
  MultiClipStitchVariant,
  { title: string; lede: string; mainLabel: string; extraLabel: (idx: number) => string; confirmCta: string }
> = {
  series: {
    title: 'Multi-part series',
    lede:
      'PulseVerse uploads each clip, creates one post, and combines them into a single video on the server (ffmpeg). Post once — wait for “Clips combined”. Requires the media worker running in your environment.',
    mainLabel: 'Main clip (Part 1)',
    extraLabel: (idx) => `Part ${idx + 2}`,
    confirmCta: 'Queue series',
  },
  broll: {
    title: 'B-roll cutaways',
    lede:
      'Queue your main story plus cutaways — PulseVerse creates one post and concatenates A-roll then B-roll into a single MP4 on the server. Tap Post once and wait for “Clips combined”; requires the media worker.',
    mainLabel: 'A-roll (main story)',
    extraLabel: (idx) => `B-roll ${idx + 1}`,
    confirmCta: 'Queue cutaways',
  },
};

/**
 * Picks extra clips for server-side concat (`creator_media_jobs` stitch/broll).
 */
export function MultiClipStitchModal({
  visible,
  onClose,
  primary,
  variant = 'series',
  onConfirm,
}: Props) {
  const copy = COPY[variant];
  const [clips, setClips] = useState<MediaAsset[]>([]);

  useEffect(() => {
    if (!visible) setClips([]);
  }, [visible]);

  const addOne = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Need photo library access');
      return;
    }
    const r = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['videos'],
      videoMaxDuration: VIDEO_MAX_SECONDS,
      quality: 1,
    });
    if (r.canceled || !r.assets?.[0]) return;
    const a = r.assets[0];
    const durSec = normalizePickerVideoDurationSeconds(a.duration);
    if (durSec != null && durSec < VIDEO_MIN_SECONDS) {
      Alert.alert(
        'Clip too short',
        `Each queued clip must be at least ${VIDEO_MIN_SECONDS}s (same limit as the main composer).`,
      );
      return;
    }
    if (durSec != null && durSec > VIDEO_MAX_SECONDS) {
      Alert.alert(
        'Clip too long',
        `Each clip can be up to ${VIDEO_MAX_SECONDS / 60} minutes — trim or pick a shorter file.`,
      );
      return;
    }
    const ext = a.uri.split('.').pop()?.toLowerCase() ?? 'mp4';
    setClips((prev) => [
      ...prev,
      {
        uri: a.uri,
        type: 'video',
        mimeType: `video/${ext === 'mov' ? 'quicktime' : 'mp4'}`,
        fileName: `clip_${Date.now()}.${ext}`,
        duration: durSec,
        width: a.width,
        height: a.height,
      },
    ]);
  };

  const remove = (idx: number) => setClips((prev) => prev.filter((_, i) => i !== idx));
  const move = (from: number, delta: number) => {
    setClips((prev) => {
      const to = from + delta;
      if (to < 0 || to >= prev.length) return prev;
      const next = [...prev];
      const [it] = next.splice(from, 1);
      if (it) next.splice(to, 0, it);
      return next;
    });
  };

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View style={styles.backdrop}>
        <View style={styles.sheet}>
          <View style={styles.handle} />
          <View style={styles.headerRow}>
            <Text style={styles.title}>{copy.title}</Text>
            <TouchableOpacity onPress={onClose} hitSlop={10}>
              <Ionicons name="close" size={22} color={colors.dark.textMuted} />
            </TouchableOpacity>
          </View>
          <Text style={styles.lede}>{copy.lede}</Text>

          <ScrollView style={{ maxHeight: 320 }} contentContainerStyle={{ gap: 8 }}>
            <View style={styles.clipRow}>
              <View style={[styles.thumb, { backgroundColor: colors.primary.teal + '22' }]}>
                <Ionicons name="videocam" size={20} color={colors.primary.teal} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.clipText}>{copy.mainLabel}</Text>
                <Text style={styles.clipSub} numberOfLines={1}>{primary?.fileName ?? 'Your current upload'}</Text>
              </View>
            </View>
            {clips.map((c, idx) => (
              <View key={`${c.uri}_${idx}`} style={styles.clipRow}>
                <View style={[styles.thumb, { backgroundColor: colors.dark.cardAlt }]}>
                  <Text style={styles.thumbText}>{variant === 'broll' ? String(idx + 1) : String(idx + 2)}</Text>
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.clipText}>{copy.extraLabel(idx)}</Text>
                  <Text style={styles.clipSub} numberOfLines={1}>{c.fileName}</Text>
                </View>
                <TouchableOpacity onPress={() => move(idx, -1)} disabled={idx === 0} hitSlop={6}>
                  <Ionicons name="arrow-up" size={18} color={idx === 0 ? colors.dark.textMuted : colors.dark.text} />
                </TouchableOpacity>
                <TouchableOpacity onPress={() => move(idx, 1)} disabled={idx === clips.length - 1} hitSlop={6}>
                  <Ionicons name="arrow-down" size={18} color={idx === clips.length - 1 ? colors.dark.textMuted : colors.dark.text} />
                </TouchableOpacity>
                <TouchableOpacity onPress={() => remove(idx)} hitSlop={6}>
                  <Ionicons name="close" size={18} color="#EF4444" />
                </TouchableOpacity>
              </View>
            ))}
          </ScrollView>

          <TouchableOpacity
            style={[styles.addBtn, clips.length >= 4 && { opacity: 0.5 }]}
            onPress={addOne}
            disabled={clips.length >= 4}
            activeOpacity={0.85}
          >
            <Ionicons name="add" size={18} color={colors.primary.teal} />
            <Text style={styles.addText}>Add clip ({clips.length}/4)</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.primaryBtn, clips.length === 0 && { opacity: 0.5 }]}
            onPress={() => {
              if (clips.length === 0) return;
              onConfirm(clips);
              onClose();
            }}
            disabled={clips.length === 0}
            activeOpacity={0.85}
          >
            <Ionicons name="git-network" size={16} color="#FFF" />
            <Text style={styles.primaryText}>
              {copy.confirmCta} · {clips.length + 1} clip{clips.length + 1 === 1 ? '' : 's'}
            </Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
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
  lede: { fontSize: 12, color: colors.dark.textSecondary, lineHeight: 17 },
  clipRow: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    paddingHorizontal: 10, paddingVertical: 8, borderRadius: 12,
    backgroundColor: colors.dark.card,
    borderWidth: 1, borderColor: colors.dark.border,
  },
  thumb: {
    width: 44, height: 44, borderRadius: 10,
    alignItems: 'center', justifyContent: 'center',
  },
  thumbText: { fontSize: 16, fontWeight: '900', color: colors.dark.text },
  clipText: { fontSize: 13, fontWeight: '800', color: colors.dark.text },
  clipSub: { fontSize: 11, color: colors.dark.textMuted, marginTop: 2 },
  addBtn: {
    flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: 8,
    paddingVertical: 12, borderRadius: 12,
    borderWidth: 1, borderColor: colors.dark.border,
  },
  addText: { fontSize: 13, fontWeight: '800', color: colors.primary.teal },
  primaryBtn: {
    flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: 8,
    paddingVertical: 14, borderRadius: 14,
    backgroundColor: colors.primary.teal,
  },
  primaryText: { fontSize: 14, fontWeight: '900', color: '#FFF' },
});
