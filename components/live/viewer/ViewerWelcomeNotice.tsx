import React, { useEffect } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors, borderRadius, typography } from '@/theme';

type Props = {
  visible: boolean;
  message: string;
  onDismiss: () => void;
  autoDismissMs?: number;
};

/** Brief community guideline notice — auto-dismisses. */
export function ViewerWelcomeNotice({ visible, message, onDismiss, autoDismissMs = 5000 }: Props) {
  useEffect(() => {
    if (!visible) return;
    const t = setTimeout(onDismiss, autoDismissMs);
    return () => clearTimeout(t);
  }, [visible, onDismiss, autoDismissMs]);

  if (!visible) return null;

  return (
    <View style={styles.wrap}>
      <Ionicons name="heart-outline" size={14} color={colors.primary.teal} />
      <Text style={styles.txt} numberOfLines={2}>
        {message}
      </Text>
      <Pressable onPress={onDismiss} hitSlop={8} accessibilityLabel="Dismiss">
        <Ionicons name="close" size={14} color={colors.dark.textMuted} />
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    alignSelf: 'center',
    maxWidth: '92%',
    marginTop: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: borderRadius.full,
    backgroundColor: 'rgba(12,18,32,0.72)',
    borderWidth: 1,
    borderColor: 'rgba(56,189,248,0.22)',
  },
  txt: {
    ...typography.caption,
    flex: 1,
    fontSize: 11,
    color: 'rgba(248,250,252,0.88)',
    lineHeight: 15,
  },
});
