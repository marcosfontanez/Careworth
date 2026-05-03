import React, { useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Modal, ScrollView, Alert } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { colors } from '@/theme';
import type { MediaAsset } from '@/lib/media';

interface Props {
  visible: boolean;
  onClose: () => void;
  primary: MediaAsset | null;
  onConfirm: (clips: MediaAsset[]) => void;
}

/**
 * Multi-clip stitch — picks 1-4 additional video clips from the gallery and
 * returns them as a queue. The actual stitching into a single mp4 needs
 * server-side ffmpeg; for v1 we hand back the queue and let the parent
 * stage each clip as a sequential draft post (linked to the same series_id).
 */
export function MultiClipStitchModal({ visible, onClose, primary, onConfirm }: Props) {
  const [clips, setClips] = useState<MediaAsset[]>([]);

  const addOne = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Need photo library access');
      return;
    }
    const r = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['videos'],
      videoMaxDuration: 60,
      quality: 1,
    });
    if (r.canceled || !r.assets?.[0]) return;
    const a = r.assets[0];
    const ext = a.uri.split('.').pop()?.toLowerCase() ?? 'mp4';
    setClips((prev) => [
      ...prev,
      {
        uri: a.uri,
        type: 'video',
        mimeType: `video/${ext === 'mov' ? 'quicktime' : 'mp4'}`,
        fileName: `clip_${Date.now()}.${ext}`,
        duration: a.duration ?? undefined,
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
            <Text style={styles.title}>Stitch clips</Text>
            <TouchableOpacity onPress={onClose} hitSlop={10}>
              <Ionicons name="close" size={22} color={colors.dark.textMuted} />
            </TouchableOpacity>
          </View>
          <Text style={styles.lede}>
            Pick up to 4 extra clips. Drag to reorder. We&apos;ll post them as a series after your main clip.
          </Text>

          <ScrollView style={{ maxHeight: 320 }} contentContainerStyle={{ gap: 8 }}>
            <View style={styles.clipRow}>
              <View style={[styles.thumb, { backgroundColor: colors.primary.teal + '22' }]}>
                <Ionicons name="videocam" size={20} color={colors.primary.teal} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.clipText}>Main clip (Part 1)</Text>
                <Text style={styles.clipSub} numberOfLines={1}>{primary?.fileName ?? 'Your current upload'}</Text>
              </View>
            </View>
            {clips.map((c, idx) => (
              <View key={`${c.uri}_${idx}`} style={styles.clipRow}>
                <View style={[styles.thumb, { backgroundColor: colors.dark.cardAlt }]}>
                  <Text style={styles.thumbText}>{idx + 2}</Text>
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.clipText}>Part {idx + 2}</Text>
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
            <Text style={styles.primaryText}>Stitch as {clips.length + 1}-part series</Text>
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
