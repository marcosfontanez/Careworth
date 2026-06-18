import React from 'react';
import { TouchableOpacity, Text, StyleSheet, View, Platform } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { borderRadius, pulseverse } from '@/theme';

type Props = {
  joined: boolean;
  onToggle: () => void;
  compact?: boolean;
};

export function JoinButton({ joined, onToggle, compact }: Props) {
  return (
    <TouchableOpacity
      style={[styles.btn, joined && styles.btnJoined, compact && styles.btnCompact, joined && styles.btnJoinedGlow]}
      onPress={onToggle}
      activeOpacity={0.88}
    >
      {joined ? (
        <View style={styles.joinedInner}>
          <Ionicons name="checkmark-circle" size={16} color={pulseverse.electricSoft} />
          <Text style={styles.txtJoined}>Joined</Text>
        </View>
      ) : (
        <Text style={styles.txtJoin} numberOfLines={1}>
          Join Circle
        </Text>
      )}
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  btn: {
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: borderRadius.button,
    borderWidth: 1.5,
    borderColor: `${pulseverse.electric}99`,
    backgroundColor: 'transparent',
    maxWidth: '100%',
  },
  btnCompact: {
    paddingHorizontal: 14,
    paddingVertical: 8,
  },
  btnJoined: {
    borderColor: `${pulseverse.electric}BB`,
    backgroundColor: 'rgba(34,211,238,0.1)',
  },
  btnJoinedGlow: Platform.select({
    ios: {
      shadowColor: pulseverse.electric,
      shadowOffset: { width: 0, height: 0 },
      shadowOpacity: 0.22,
      shadowRadius: 8,
    },
    default: {},
  }),
  joinedInner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },
  txtJoin: {
    fontSize: 13,
    fontWeight: '800',
    color: pulseverse.electricSoft,
    letterSpacing: 0.2,
  },
  txtJoined: {
    fontSize: 13,
    fontWeight: '800',
    color: pulseverse.electricSoft,
    letterSpacing: 0.15,
  },
});
