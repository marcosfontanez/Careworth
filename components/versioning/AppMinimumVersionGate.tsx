import React, { useCallback, useEffect, useState } from 'react';
import {
  Modal,
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Platform,
  Linking,
  AppState,
} from 'react-native';
import Constants from 'expo-constants';
import { Ionicons } from '@expo/vector-icons';
import { fetchMinSupportedAppVersion } from '@/services/supabase/appClientConfig';
import { isVersionBelowMinimum } from '@/lib/versionCompare';
import { getStoreUrlForPlatform } from '@/constants/storeLinks';
import { colors, spacing, borderRadius, typography } from '@/theme';

function nativeAppVersion(): string {
  return (
    Constants.nativeApplicationVersion ||
    Constants.expoConfig?.version ||
    '0.0.0'
  );
}

/**
 * Blocks interaction when the running native build is older than `app_client_config.min_app_version`.
 * Fails open if the config row can’t be read (offline / migration not applied yet).
 */
export function AppMinimumVersionGate() {
  const [blocked, setBlocked] = useState(false);
  const [minimumRemote, setMinimumRemote] = useState<string | null>(null);

  const evaluate = useCallback(async () => {
    if (__DEV__ || Platform.OS === 'web') return;
    const current = nativeAppVersion();
    const minV = await fetchMinSupportedAppVersion();
    setMinimumRemote(minV);
    if (!minV) return;
    if (isVersionBelowMinimum(current, minV)) setBlocked(true);
    else setBlocked(false);
  }, []);

  useEffect(() => {
    void evaluate();
  }, [evaluate]);

  useEffect(() => {
    if (__DEV__ || Platform.OS === 'web') return;
    const sub = AppState.addEventListener('change', (s) => {
      if (s === 'active') void evaluate();
    });
    return () => sub.remove();
  }, [evaluate]);

  const openStore = useCallback(() => {
    void Linking.openURL(getStoreUrlForPlatform());
  }, []);

  if (!blocked || Platform.OS === 'web') return null;

  const current = nativeAppVersion();
  const min = minimumRemote ?? '?';

  return (
    <Modal
      visible
      transparent
      animationType="fade"
      statusBarTranslucent
      onRequestClose={openStore}
    >
      <View style={styles.scrim}>
        <View style={styles.card}>
          <Ionicons name="download-outline" size={40} color={pulseBlue} style={styles.icon} />
          <Text style={styles.title}>Update required</Text>
          <Text style={styles.body}>
            This version of PulseVerse ({current}) is no longer supported. Install the latest update ({min}+) from the
            store to continue.
          </Text>
          <TouchableOpacity style={styles.primaryBtn} onPress={openStore} activeOpacity={0.88}>
            <Text style={styles.primaryBtnText}>Download latest version</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
}

const pulseBlue = colors.primary.teal;

const styles = StyleSheet.create({
  scrim: {
    flex: 1,
    backgroundColor: 'rgba(2,6,23,0.94)',
    justifyContent: 'center',
    paddingHorizontal: spacing.xl,
  },
  card: {
    backgroundColor: colors.dark.card,
    borderRadius: borderRadius['2xl'],
    borderWidth: 1,
    borderColor: 'rgba(34,211,238,0.35)',
    padding: spacing.xl + 4,
    alignItems: 'center',
  },
  icon: { marginBottom: spacing.md },
  title: {
    ...typography.screenTitle,
    fontSize: 22,
    color: colors.dark.text,
    textAlign: 'center',
    marginBottom: spacing.sm,
  },
  body: {
    ...typography.body,
    color: colors.dark.textSecondary,
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: spacing.lg,
  },
  primaryBtn: {
    alignSelf: 'stretch',
    backgroundColor: pulseBlue,
    paddingVertical: spacing.md + 2,
    borderRadius: borderRadius.button,
    alignItems: 'center',
  },
  primaryBtnText: {
    ...typography.button,
    color: colors.dark.bg,
    fontWeight: '800',
    fontSize: 16,
  },
});
