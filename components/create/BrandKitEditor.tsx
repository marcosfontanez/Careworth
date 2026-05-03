import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, Modal, ScrollView } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '@/theme';
import { type BrandKit, DEFAULT_BRAND_KIT } from '@/lib/brandKit';

interface Props {
  visible: boolean;
  initial: BrandKit;
  onClose: () => void;
  onSave: (next: BrandKit) => void;
}

const PRESET_PRIMARIES: string[] = [
  '#14B8A6', '#0EA5E9', '#3B82F6', '#A855F7', '#EC4899', '#EF4444',
  '#F59E0B', '#22C55E', '#10B981', '#06B6D4', '#8B5CF6', '#F43F5E',
];

const PRESET_SCRUBS: Array<{ key: string; color: string; label: string }> = [
  { key: 'navy',     color: '#1E3A8A', label: 'Navy' },
  { key: 'ceil',     color: '#7DD3FC', label: 'Ceil blue' },
  { key: 'hunter',   color: '#15803D', label: 'Hunter green' },
  { key: 'royal',    color: '#1D4ED8', label: 'Royal' },
  { key: 'wine',     color: '#7F1D1D', label: 'Wine' },
  { key: 'pewter',   color: '#6B7280', label: 'Pewter' },
  { key: 'caribbean',color: '#0EA5E9', label: 'Caribbean' },
  { key: 'lilac',    color: '#C4B5FD', label: 'Lilac' },
  { key: 'plum',     color: '#7C2D12', label: 'Plum' },
];

export function BrandKitEditor({ visible, initial, onClose, onSave }: Props) {
  const [kit, setKit] = useState<BrandKit>({ ...DEFAULT_BRAND_KIT, ...initial });

  const update = (next: Partial<BrandKit>) => setKit((prev) => ({ ...prev, ...next }));

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View style={styles.backdrop}>
        <View style={styles.sheet}>
          <View style={styles.handle} />
          <View style={styles.headerRow}>
            <Text style={styles.title}>Your brand kit</Text>
            <TouchableOpacity onPress={onClose} hitSlop={10}>
              <Ionicons name="close" size={22} color={colors.dark.textMuted} />
            </TouchableOpacity>
          </View>
          <Text style={styles.lede}>Used across overlays, frames, and your end card.</Text>

          <ScrollView style={{ maxHeight: 460 }} contentContainerStyle={{ gap: 16 }}>
            <View>
              <Text style={styles.sectionLabel}>Primary color</Text>
              <View style={styles.swatchRow}>
                {PRESET_PRIMARIES.map((c) => (
                  <TouchableOpacity
                    key={c}
                    style={[styles.swatch, { backgroundColor: c }, kit.primary === c && styles.swatchOn]}
                    onPress={() => update({ primary: c })}
                  />
                ))}
              </View>
            </View>

            <View>
              <Text style={styles.sectionLabel}>Accent color</Text>
              <View style={styles.swatchRow}>
                {PRESET_PRIMARIES.map((c) => (
                  <TouchableOpacity
                    key={c}
                    style={[styles.swatch, { backgroundColor: c }, kit.accent === c && styles.swatchOn]}
                    onPress={() => update({ accent: c })}
                  />
                ))}
              </View>
            </View>

            <View>
              <Text style={styles.sectionLabel}>Scrubs color</Text>
              <View style={styles.swatchRow}>
                {PRESET_SCRUBS.map((s) => (
                  <TouchableOpacity
                    key={s.key}
                    style={[styles.swatchBig, { backgroundColor: s.color }, kit.scrubs === s.color && styles.swatchOn]}
                    onPress={() => update({ scrubs: s.color })}
                  >
                    <Text style={styles.scrubLabel}>{s.label}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            <View>
              <Text style={styles.sectionLabel}>Logo URL (optional)</Text>
              <TextInput
                style={styles.input}
                value={kit.logoUrl ?? ''}
                onChangeText={(t) => update({ logoUrl: t.trim() || null })}
                placeholder="https://example.com/your-logo.png"
                placeholderTextColor={colors.dark.textMuted}
                autoCapitalize="none"
                keyboardType="url"
              />
              <Text style={styles.helper}>Square PNG, transparent background. Renders in your end card.</Text>
            </View>
          </ScrollView>

          <View style={styles.actionRow}>
            <TouchableOpacity
              style={styles.cancelBtn}
              onPress={onClose}
              activeOpacity={0.85}
            >
              <Text style={styles.cancelText}>Cancel</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.saveBtn, { backgroundColor: kit.primary ?? colors.primary.teal }]}
              onPress={() => {
                onSave(kit);
                onClose();
              }}
              activeOpacity={0.85}
            >
              <Text style={styles.saveText}>Save brand kit</Text>
            </TouchableOpacity>
          </View>
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
  lede: { fontSize: 12, color: colors.dark.textSecondary, lineHeight: 16 },
  sectionLabel: { fontSize: 11, fontWeight: '800', color: colors.dark.textMuted, textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 8 },
  swatchRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  swatch: { width: 32, height: 32, borderRadius: 16, borderWidth: 2, borderColor: 'transparent' },
  swatchOn: { borderColor: '#FFF' },
  swatchBig: {
    paddingHorizontal: 14, paddingVertical: 10,
    borderRadius: 12, borderWidth: 2, borderColor: 'transparent',
  },
  scrubLabel: { color: '#FFF', fontSize: 11, fontWeight: '800' },
  input: {
    backgroundColor: colors.dark.card, borderRadius: 12,
    paddingHorizontal: 12, paddingVertical: 12, fontSize: 13,
    color: colors.dark.text, borderWidth: 1, borderColor: colors.dark.border,
  },
  helper: { fontSize: 11, color: colors.dark.textMuted, marginTop: 4 },
  actionRow: { flexDirection: 'row', gap: 10 },
  cancelBtn: {
    flex: 1, paddingVertical: 14, borderRadius: 14,
    borderWidth: 1, borderColor: colors.dark.border,
    alignItems: 'center',
  },
  cancelText: { fontSize: 14, fontWeight: '800', color: colors.dark.textSecondary },
  saveBtn: { flex: 2, paddingVertical: 14, borderRadius: 14, alignItems: 'center' },
  saveText: { fontSize: 14, fontWeight: '900', color: '#FFF' },
});
