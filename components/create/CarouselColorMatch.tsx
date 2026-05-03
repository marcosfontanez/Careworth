import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ScrollView } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '@/theme';
import { PALETTE_KEYS, paletteLabel, paletteSwatches, type PaletteKey } from '@/lib/colorAnalysis';

interface Props {
  enabled: boolean;
  palette: PaletteKey;
  onToggle: (next: boolean) => void;
  onPalette: (next: PaletteKey) => void;
}

export function CarouselColorMatch({ enabled, palette, onToggle, onPalette }: Props) {
  return (
    <View style={styles.wrap}>
      <TouchableOpacity
        style={[styles.row, enabled && styles.rowOn]}
        onPress={() => onToggle(!enabled)}
        activeOpacity={0.85}
      >
        <Ionicons
          name="color-palette-outline"
          size={20}
          color={enabled ? colors.primary.teal : colors.dark.textSecondary}
        />
        <View style={{ flex: 1 }}>
          <Text style={[styles.title, enabled && { color: colors.primary.teal }]}>Auto color match</Text>
          <Text style={styles.sub}>Tints every slide in the same family for a magazine feel.</Text>
        </View>
        <View style={[styles.switch, enabled && styles.switchOn]}>
          <View style={[styles.switchKnob, enabled && styles.switchKnobOn]} />
        </View>
      </TouchableOpacity>
      {enabled ? (
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.paletteRow}>
          {PALETTE_KEYS.map((p) => {
            const active = palette === p;
            const swatches = paletteSwatches(p);
            return (
              <TouchableOpacity
                key={p}
                style={[styles.paletteCard, active && styles.paletteCardOn]}
                onPress={() => onPalette(p)}
                activeOpacity={0.85}
              >
                <View style={styles.swatchRow}>
                  {swatches.map((sw, i) => (
                    <View key={i} style={[styles.swatch, { backgroundColor: sw }]} />
                  ))}
                </View>
                <Text style={[styles.paletteLabel, active && { color: colors.primary.teal }]}>
                  {paletteLabel(p)}
                </Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { gap: 8 },
  row: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    padding: 14, borderRadius: 14,
    backgroundColor: colors.dark.card,
    borderWidth: 1, borderColor: colors.dark.border,
  },
  rowOn: { borderColor: colors.primary.teal + '88', backgroundColor: colors.primary.teal + '14' },
  title: { fontSize: 14, fontWeight: '800', color: colors.dark.text },
  sub: { fontSize: 12, color: colors.dark.textMuted, marginTop: 2 },
  switch: {
    width: 38, height: 22, borderRadius: 12,
    backgroundColor: colors.dark.cardAlt,
    padding: 2, justifyContent: 'center',
  },
  switchOn: { backgroundColor: colors.primary.teal },
  switchKnob: { width: 18, height: 18, borderRadius: 9, backgroundColor: '#FFF' },
  switchKnobOn: { transform: [{ translateX: 16 }] },
  paletteRow: { gap: 10, paddingVertical: 4 },
  paletteCard: {
    padding: 10, borderRadius: 12,
    backgroundColor: colors.dark.card, borderWidth: 1, borderColor: colors.dark.border,
    alignItems: 'center', gap: 6, minWidth: 92,
  },
  paletteCardOn: { borderColor: colors.primary.teal },
  swatchRow: { flexDirection: 'row', gap: 4 },
  swatch: { width: 16, height: 16, borderRadius: 4 },
  paletteLabel: { fontSize: 11, fontWeight: '800', color: colors.dark.textSecondary },
});
