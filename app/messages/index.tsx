import React from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { colors, layout, spacing, typography } from '@/theme';
import { useAuth } from '@/contexts/AuthContext';
import { useMessengerInbox } from '@/hooks/useMessengerInbox';
import { MessengerInboxPanel } from '@/components/messenger/MessengerInboxPanel';

export default function MessagesScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { user } = useAuth();
  const {
    conversations,
    loading,
    refreshing,
    refresh,
    presenceOnline,
    removeConversationLocal,
  } = useMessengerInbox(user?.id);

  const onlineCount = conversations.filter((c) => presenceOnline.has(c.otherUser.id)).length;

  return (
    <View style={styles.container}>
      <View style={[styles.header, { paddingTop: insets.top + 8 }]}>
        <TouchableOpacity
          onPress={() => (router.canGoBack() ? router.back() : router.replace('/(tabs)/feed'))}
          activeOpacity={0.7}
        >
          <Ionicons name="arrow-back" size={24} color={colors.dark.text} />
        </TouchableOpacity>
        <View style={styles.titleWrap}>
          <Text style={styles.title}>Messages</Text>
          {onlineCount > 0 ? (
            <View style={styles.onlineHint}>
              <View style={styles.onlineDotSmall} />
              <Text style={styles.onlineHintText}>{onlineCount} online</Text>
            </View>
          ) : null}
        </View>
        <TouchableOpacity
          activeOpacity={0.7}
          onPress={() => router.push('/search' as any)}
          accessibilityLabel="Find people to message"
        >
          <Ionicons name="person-add-outline" size={22} color={colors.primary.teal} />
        </TouchableOpacity>
      </View>

      <MessengerInboxPanel
        conversations={conversations}
        loading={loading}
        refreshing={refreshing}
        onRefresh={refresh}
        presenceOnline={presenceOnline}
        onRemoved={removeConversationLocal}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.dark.bg },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: layout.screenPadding,
    paddingVertical: spacing.md,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.dark.borderSubtle,
  },
  titleWrap: { flex: 1, marginLeft: spacing.md },
  title: { ...typography.screenTitle, color: colors.dark.text },
  onlineHint: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs, marginTop: 2 },
  onlineDotSmall: { width: 6, height: 6, borderRadius: 3, backgroundColor: colors.status.online },
  onlineHintText: { ...typography.caption, fontSize: 11, fontWeight: '600', color: colors.status.online },
});
