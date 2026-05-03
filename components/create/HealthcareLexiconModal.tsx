import React, { useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Modal, ScrollView, Pressable } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as Clipboard from 'expo-clipboard';
import { colors } from '@/theme';
import { HEALTHCARE_LEXICON_TERMS, lexiconSnippetForCopy } from '@/lib/healthcareLexicon';

interface Props {
  visible: boolean;
  onClose: () => void;
}

export function HealthcareLexiconModal({ visible, onClose }: Props) {
  const [copied, setCopied] = useState(false);

  return (
    <Modal visible={visible} animationType="fade" transparent onRequestClose={onClose}>
      <Pressable style={styles.backdrop} onPress={onClose} />
      <View style={styles.sheet}>
        <View style={styles.head}>
          <Text style={styles.title}>Clinical lexicon</Text>
          <TouchableOpacity onPress={onClose} hitSlop={12}>
            <Ionicons name="close" size={22} color={colors.dark.text} />
          </TouchableOpacity>
        </View>
        <Text style={styles.lede}>
          Terms we’ll bias toward in future on-device captions. Copy the block into notes while you
          draft — avoids autocorrect mangling meds and frequencies.
        </Text>
        <TouchableOpacity
          style={styles.copyBtn}
          onPress={async () => {
            await Clipboard.setStringAsync(lexiconSnippetForCopy());
            setCopied(true);
            setTimeout(() => setCopied(false), 1800);
          }}
        >
          <Ionicons name="copy-outline" size={18} color={colors.primary.teal} />
          <Text style={styles.copyText}>{copied ? 'Copied' : 'Copy all terms'}</Text>
        </TouchableOpacity>
        <ScrollView style={styles.list} contentContainerStyle={{ paddingBottom: 16 }}>
          {HEALTHCARE_LEXICON_TERMS.map((t) => (
            <View key={t} style={styles.term}>
              <Text style={styles.termText}>{t}</Text>
            </View>
          ))}
        </ScrollView>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)' },
  sheet: {
    position: 'absolute',
    left: 16,
    right: 16,
    top: '12%',
    maxHeight: '78%',
    backgroundColor: colors.dark.card,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: colors.dark.border,
    padding: 14,
  },
  head: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  title: { fontSize: 17, fontWeight: '800', color: colors.dark.text },
  lede: { fontSize: 12, color: colors.dark.textMuted, marginTop: 10, lineHeight: 17 },
  copyBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 12,
    alignSelf: 'flex-start',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 12,
    backgroundColor: colors.primary.teal + '18',
  },
  copyText: { fontSize: 13, fontWeight: '700', color: colors.primary.teal },
  list: { marginTop: 12, maxHeight: 320 },
  term: {
    paddingVertical: 6,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.dark.border,
  },
  termText: { fontSize: 13, fontWeight: '600', color: colors.dark.text },
});
