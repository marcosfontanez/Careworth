import { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ActivityIndicator } from 'react-native';
import { Stack, useRouter } from 'expo-router';
import { supabase } from '@/lib/supabase';
import { resetRootIndexRedirectDedupe } from '@/lib/rootIndexRedirect';
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
          resetRootIndexRedirectDedupe();
          router.replace('/auth/login');
          return;
        }
        const { data: isAdmin } = await supabase.rpc('current_user_role_admin');

        if (isAdmin === true) {
          setAuthorized(true);
        } else {
          if (router.canGoBack()) router.back();
          else router.replace('/(tabs)/feed');
        }
      } catch {
        if (router.canGoBack()) router.back();
        else router.replace('/(tabs)/feed');
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
      <Stack.Screen name="border-catalog" />
    </Stack>
  );
}

const styles = StyleSheet.create({
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.dark.bg },
  denied: { fontSize: 18, fontWeight: '700', color: colors.status.error },
});
