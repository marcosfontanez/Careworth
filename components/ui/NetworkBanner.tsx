import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, Animated, Platform } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { colors, spacing, typography } from '@/theme';

let NetInfo: any = null;
try {
  NetInfo = require('@react-native-community/netinfo')?.default;
} catch {}

export function NetworkBanner() {
  const insets = useSafeAreaInsets();
  const [isConnected, setIsConnected] = useState(true);
  const opacity = useState(new Animated.Value(0))[0];

  useEffect(() => {
    if (!NetInfo) {
      if (Platform.OS === 'web') {
        const handleOnline = () => setIsConnected(true);
        const handleOffline = () => setIsConnected(false);
        window.addEventListener('online', handleOnline);
        window.addEventListener('offline', handleOffline);
        setIsConnected(navigator.onLine);
        return () => {
          window.removeEventListener('online', handleOnline);
          window.removeEventListener('offline', handleOffline);
        };
      }
      return;
    }

    const unsubscribe = NetInfo.addEventListener((state: any) => {
      setIsConnected(state.isConnected ?? true);
    });

    return () => unsubscribe();
  }, []);

  useEffect(() => {
    Animated.timing(opacity, {
      toValue: isConnected ? 0 : 1,
      duration: 300,
      useNativeDriver: Platform.OS !== 'web',
    }).start();
  }, [isConnected, opacity]);

  if (isConnected) return null;

  return (
    <Animated.View style={[styles.banner, { top: insets.top, opacity }]}>
      <Ionicons name="cloud-offline-outline" size={16} color={colors.dark.text} />
      <Text style={styles.text}>No internet connection</Text>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  banner: {
    position: 'absolute',
    left: 0,
    right: 0,
    zIndex: 100,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    paddingVertical: spacing.sm,
    backgroundColor: colors.status.error,
  },
  text: {
    ...typography.caption,
    fontSize: 13,
    fontWeight: '600',
    color: colors.dark.text,
    letterSpacing: 0.1,
  },
});
