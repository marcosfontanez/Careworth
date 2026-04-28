import React from 'react';
import { Redirect, useLocalSearchParams } from 'expo-router';
import { useQuery } from '@tanstack/react-query';
import { Text, View, StyleSheet } from 'react-native';
import { userService } from '@/services/user';
import { LoadingState } from '@/components/ui/LoadingState';
import { colors } from '@/theme';

/** Resolves `@handle` from captions → `/profile/[id]`. */
export default function ProfileByUsernameScreen() {
  const { username } = useLocalSearchParams<{ username?: string | string[] }>();
  const raw = typeof username === 'string' ? username : username?.[0];
  const handle = raw?.replace(/^@/, '').trim().toLowerCase();

  const { data: profile, isLoading } = useQuery({
    queryKey: ['profileByUsername', handle],
    queryFn: () => userService.getUserByUsername(handle ?? ''),
    enabled: !!handle,
  });

  if (!handle) {
    return (
      <View style={styles.centered}>
        <Text style={styles.muted}>Invalid handle.</Text>
      </View>
    );
  }

  if (isLoading) return <LoadingState />;

  if (!profile) {
    return (
      <View style={styles.centered}>
        <Text style={styles.muted}>No profile for @{handle}</Text>
      </View>
    );
  }

  return <Redirect href={`/profile/${profile.id}`} />;
}

const styles = StyleSheet.create({
  centered: { flex: 1, backgroundColor: colors.dark.bg, alignItems: 'center', justifyContent: 'center', padding: 24 },
  muted: { color: colors.dark.textMuted, fontSize: 15 },
});
