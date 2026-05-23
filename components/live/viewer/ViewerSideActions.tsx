import React from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors, borderRadius } from '@/theme';

type Props = {
  giftsEnabled: boolean;
  onGiftPress: () => void;
  onInfoPress: () => void;
  onLeaderboardPress?: () => void;
  showLeaderboard?: boolean;
};

export function ViewerSideActions({
  giftsEnabled,
  onGiftPress,
  onInfoPress,
  onLeaderboardPress,
  showLeaderboard,
}: Props) {
  return (
    <View style={styles.wrap}>
      {showLeaderboard && onLeaderboardPress ? (
        <Pressable onPress={onLeaderboardPress} style={styles.btn} accessibilityLabel="Top supporters">
          <Ionicons name="ribbon-outline" size={20} color="#FFF" />
        </Pressable>
      ) : null}
      {giftsEnabled ? (
        <Pressable onPress={onGiftPress} style={[styles.btn, styles.giftBtn]} accessibilityLabel="Send gift">
          <Ionicons name="gift-outline" size={21} color={colors.primary.gold} />
        </Pressable>
      ) : null}
      <Pressable onPress={onInfoPress} style={styles.btn} accessibilityLabel="Community guidelines">
        <Ionicons name="information-circle-outline" size={20} color="#FFF" />
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    position: 'absolute',
    right: 12,
    bottom: 96,
    alignItems: 'center',
    gap: 10,
    zIndex: 25,
  },
  btn: {
    width: 44,
    height: 44,
    borderRadius: borderRadius.full,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(12,18,32,0.62)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
  },
  giftBtn: {
    borderColor: 'rgba(250,204,21,0.35)',
    backgroundColor: 'rgba(12,18,32,0.78)',
  },
});
