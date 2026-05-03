import React, { useState } from 'react';
import { TouchableOpacity, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '@/theme';
import { HealthcareLexiconModal } from '@/components/create/HealthcareLexiconModal';

export function HealthcareLexiconTip() {
  const [open, setOpen] = useState(false);
  return (
    <>
      <TouchableOpacity style={styles.row} onPress={() => setOpen(true)} activeOpacity={0.85}>
        <Ionicons name="medkit-outline" size={18} color={colors.primary.teal} />
        <Text style={styles.text}>Clinical caption lexicon</Text>
        <Ionicons name="chevron-forward" size={16} color={colors.dark.textMuted} />
      </TouchableOpacity>
      <HealthcareLexiconModal visible={open} onClose={() => setOpen(false)} />
    </>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 12,
    backgroundColor: colors.dark.cardAlt,
    borderWidth: 1,
    borderColor: colors.dark.border,
  },
  text: { flex: 1, fontSize: 13, fontWeight: '700', color: colors.dark.text },
});
