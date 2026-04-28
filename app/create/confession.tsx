import React, { useState } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet,
  ScrollView, ActivityIndicator, Alert,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import * as Haptics from 'expo-haptics';
import { borderRadius, colors, iconSize, layout, spacing, typography } from '@/theme';
import { useAuth } from '@/contexts/AuthContext';
import { postsService } from '@/services/supabase';
import { checkRateLimit } from '@/lib/rateLimit';
import { analytics } from '@/lib/analytics';

export default function CreateConfessionScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { user } = useAuth();
  const [content, setContent] = useState('');
  const [posting, setPosting] = useState(false);

  const handlePost = async () => {
    if (!content.trim()) {
      Alert.alert('Add content', 'Please write your confession before posting.');
      return;
    }
    if (!checkRateLimit('post')) return;

    setPosting(true);
    try {
      if (user) {
        await postsService.create({
          creator_id: user.id,
          type: 'confession',
          caption: content.trim(),
          is_anonymous: true,
          privacy_mode: 'alias',
          communities: ['shift-confessions'],
          feed_type_eligible: ['forYou'],
        });
      }

      analytics.track('post_created', { type: 'confession' });
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      router.replace('/(tabs)/feed');
    } catch (err: any) {
      Alert.alert('Post failed', err.message ?? 'Something went wrong.');
    } finally {
      setPosting(false);
    }
  };

  return (
    <View style={styles.container}>
      <LinearGradient colors={['#1a0a2e', '#2d1654']} style={styles.gradient}>
        <View style={[styles.header, { paddingTop: insets.top + 8 }]}>
          <TouchableOpacity onPress={() => router.back()} activeOpacity={0.7}>
            <Ionicons name="close" size={iconSize.lg} color={colors.dark.text} />
          </TouchableOpacity>
          <Text style={styles.title}>Shift Confession</Text>
          <TouchableOpacity onPress={handlePost} activeOpacity={0.7} disabled={posting}>
            {posting ? (
              <ActivityIndicator size="small" color={colors.primary.gold} />
            ) : (
              <Text style={styles.postBtn}>Post</Text>
            )}
          </TouchableOpacity>
        </View>

        <ScrollView contentContainerStyle={styles.content}>
          <View style={styles.anonBadge}>
            <Ionicons name="eye-off" size={iconSize.sm} color={colors.dark.text} />
            <Text style={styles.anonText}>This will be posted anonymously</Text>
          </View>

          <TextInput
            style={styles.mainInput}
            value={content}
            onChangeText={setContent}
            placeholder="What's your confession? This is a safe, anonymous space..."
            placeholderTextColor={colors.form.placeholder}
            multiline
            autoFocus
            editable={!posting}
          />

          <View style={styles.footer}>
            <Ionicons name="shield-checkmark" size={iconSize.sm} color={colors.form.iconMuted} />
            <Text style={styles.footerText}>
              Your identity is protected. Only the content will be visible to others.
            </Text>
          </View>
        </ScrollView>
      </LinearGradient>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  gradient: { flex: 1 },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: layout.screenPadding,
    paddingVertical: spacing.md,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.form.glassBorderInner,
  },
  title: { ...typography.sectionTitle, fontSize: 16, color: colors.dark.text },
  postBtn: { ...typography.button, fontSize: 15, fontWeight: '800', color: colors.primary.gold },
  content: { padding: layout.screenPadding },
  anonBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    backgroundColor: colors.form.glassSurface,
    paddingHorizontal: spacing.md - 2,
    paddingVertical: spacing.sm + 2,
    borderRadius: borderRadius.md,
    alignSelf: 'flex-start',
    marginBottom: spacing.xl,
  },
  anonText: { color: colors.form.subtitle, fontSize: 13, fontWeight: '600' },
  mainInput: {
    ...typography.body,
    fontSize: 18,
    color: colors.dark.text,
    lineHeight: 28,
    minHeight: 200,
    textAlignVertical: 'top',
  },
  footer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginTop: spacing['3xl'],
    paddingTop: spacing.lg,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.form.glassBorderInner,
  },
  footerText: { flex: 1, color: colors.form.hint, fontSize: 12, lineHeight: 18 },
});
