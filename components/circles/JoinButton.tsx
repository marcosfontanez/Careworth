import React from 'react';
import { TouchableOpacity, Text, StyleSheet } from 'react-native';
import { colors, borderRadius } from '@/theme';

type Props = {
  joined: boolean;
  onToggle: () => void;
  compact?: boolean;
};

export function JoinButton({ joined, onToggle, compact }: Props) {
  return (
    <TouchableOpacity
      style={[styles.btn, joined && styles.btnOn, compact && styles.btnCompact]}
      onPress={onToggle}
      activeOpacity={0.85}
    >
      <Text style={[styles.txt, joined && styles.txtOn]}>{joined ? 'Joined' : 'Join'}</Text>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  btn: {
    paddingHorizontal: 16,
    paddingVertical: 9,
    borderRadius: borderRadius.button,
    borderWidth: 1,
    borderColor: colors.primary.teal + 'AA',
    backgroundColor: 'transparent',
  },
  btnCompact: {
    paddingHorizontal: 12,
    paddingVertical: 7,
  },
  btnOn: {
    borderColor: colors.dark.border,
    backgroundColor: colors.dark.cardAlt,
  },
  txt: {
    fontSize: 13,
    fontWeight: '800',
    color: colors.primary.teal,
  },
  txtOn: {
    color: colors.dark.textMuted,
  },
});
