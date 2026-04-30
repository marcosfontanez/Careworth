import { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ActivityIndicator } from 'react-native';
import { Stack, useRouter } from 'expo-router';
import { supabase } from '@/lib/supabase';
import { colors } from '@/theme';

export default function AdminLayout() {
  const router = useRouter();
  const [checking, setChecking] = useState(true);
  const [authorized, setAuthorized] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) {
          router.replace('/auth/login');
          return;
        }
        const { data: profile } = await supabase
          .from('profiles')
          .select('role_admin')
          .eq('id', user.id)
          .single() as { data: { role_admin: boolean } | null };

        if (profile?.role_admin) {
          setAuthorized(true);
        } else {
          router.back();
        }
      } catch {
        router.back();
      } finally {
        setChecking(false);
      }
    })();
  }, [router]);

  if (checking) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color={colors.primary.teal} />
      </View>
    );
  }

  if (!authorized) {
    return (
      <View style={styles.center}>
        <Text style={styles.denied}>Access Denied</Text>
      </View>
    );
  }

  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="index" />
      <Stack.Screen name="sound-catalog" />
    </Stack>
  );
}

const styles = StyleSheet.create({
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.dark.bg },
  denied: { fontSize: 18, fontWeight: '700', color: colors.status.error },
});
