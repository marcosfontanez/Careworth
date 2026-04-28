import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { borderRadius, roleColor } from '@/theme';
import type { Role } from '@/types';

export function RoleBadge({ role, size = 'sm', variant = 'solid' }: { role: Role; size?: 'sm' | 'md'; variant?: 'solid' | 'overlay' }) {
  const bg = roleColor(role);
  const isMd = size === 'md';
  const overlay = variant === 'overlay';

  return (
    <View
      style={[
        styles.badge,
        overlay
          ? { backgroundColor: 'rgba(255,255,255,0.12)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.22)' }
          : { backgroundColor: bg },
        isMd && styles.md,
      ]}
    >
      <Text style={[styles.text, isMd && styles.mdText, overlay && styles.textOverlay]}>{role}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: {
    paddingHorizontal: 9,
    paddingVertical: 3,
    borderRadius: borderRadius.chip,
    alignSelf: 'flex-start',
  },
  md: { paddingHorizontal: 11, paddingVertical: 4, borderRadius: borderRadius.chip },
  text: { color: '#FFF', fontSize: 10, fontWeight: '700', letterSpacing: 0.15 },
  textOverlay: { fontWeight: '600' },
  mdText: { fontSize: 12 },
});
