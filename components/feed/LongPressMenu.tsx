import React from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet, Modal, Pressable, Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { useQueryClient } from '@tanstack/react-query';
import { copyTextWithFallback } from '@/lib/copyLink';
import { colors } from '@/theme';
import { sharePost, shareToMyPulseAsClip } from '@/lib/share';
import { postHasDownloadableMedia, shareDownloadedPostMedia } from '@/lib/postMediaActions';
import { useToast } from '@/components/ui/Toast';
import type { Post } from '@/types';

interface Props {
  post: Post | null;
  onClose: () => void;
  onReport: () => void;
  onSave: () => void;
  isSaved: boolean;
  onNotInterested?: () => void;
  onHideCreator?: () => void;
}

const ACTIONS = (post: Post, isSaved: boolean) => {
  const download = postHasDownloadableMedia(post)
    ? [{ icon: 'download-outline' as const, label: 'Download', key: 'download' as const, color: '#FFF' }]
    : [];
  return [
    { icon: isSaved ? ('bookmark' as const) : ('bookmark-outline' as const), label: isSaved ? 'Unsave' : 'Save', key: 'save' as const, color: isSaved ? colors.primary.gold : '#FFF' },
    // Primary "pin to profile" action — surfaces the clip on the viewer's My Pulse 5.
    { icon: 'albums-outline' as const, label: 'Pin to My Pulse', key: 'pin' as const, color: colors.primary.teal },
    { icon: 'paper-plane-outline' as const, label: 'Share', key: 'share' as const, color: '#FFF' },
    ...download,
    { icon: 'link-outline' as const, label: 'Copy link', key: 'copy' as const, color: '#FFF' },
    { icon: 'eye-off-outline' as const, label: 'Not interested', key: 'hide' as const, color: '#FFF' },
    { icon: 'person-remove-outline' as const, label: 'Hide creator', key: 'hideCreator' as const, color: '#FFF' },
    { icon: 'flag-outline' as const, label: 'Report', key: 'report' as const, color: colors.status.error },
  ];
};

export function LongPressMenu({
  post, onClose, onReport, onSave, isSaved, onNotInterested, onHideCreator,
}: Props) {
  const queryClient = useQueryClient();
  const toast = useToast((s) => s.show);

  if (!post) return null;

  const handleAction = async (key: string) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    switch (key) {
      case 'save':
        onSave();
        break;
      case 'share':
        sharePost(post.id, post.caption, { anonymous: post.isAnonymous });
        onClose();
        break;
      case 'pin': {
        onClose();
        try {
          const ok = await shareToMyPulseAsClip(post, { queryClient });
          toast(ok ? 'Pinned to your My Pulse' : 'Sign in to pin to My Pulse', ok ? 'success' : 'info');
        } catch {
          toast('Couldn’t pin — try again', 'error');
        }
        break;
      }
      case 'download':
        onClose();
        void shareDownloadedPostMedia(post);
        break;
      case 'copy': {
        const url = `https://pulseverse.app/post/${post.id}`;
        await copyTextWithFallback(url);
        onClose();
        break;
      }
      case 'hide':
        onNotInterested?.();
        onClose();
        break;
      case 'hideCreator':
        onHideCreator?.();
        onClose();
        break;
      case 'report':
        onReport();
        break;
      default:
        onClose();
    }
  };

  return (
    <Modal visible transparent animationType="fade" onRequestClose={onClose}>
      <Pressable style={styles.backdrop} onPress={onClose}>
        <View style={styles.sheet}>
          <View style={styles.handle} />
          <Text style={styles.postPreview} numberOfLines={2}>
            {post.caption || `${post.type} post by @${post.creator.displayName}`}
          </Text>
          <View style={styles.grid}>
            {ACTIONS(post, isSaved).map((action) => (
              <TouchableOpacity
                key={action.key}
                style={styles.gridItem}
                onPress={() => void handleAction(action.key)}
                activeOpacity={0.7}
              >
                <View style={styles.iconCircle}>
                  <Ionicons name={action.icon as any} size={22} color={action.color} />
                </View>
                <Text style={[styles.actionLabel, action.key === 'report' && { color: colors.status.error }]}>
                  {action.label}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
          <TouchableOpacity style={styles.cancelBtn} onPress={onClose} activeOpacity={0.7}>
            <Text style={styles.cancelText}>Cancel</Text>
          </TouchableOpacity>
        </View>
      </Pressable>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.6)',
    justifyContent: 'flex-end',
  },
  sheet: {
    backgroundColor: colors.dark.card,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingBottom: Platform.OS === 'ios' ? 40 : 24,
    paddingTop: 12,
    paddingHorizontal: 20,
  },
  handle: {
    width: 36,
    height: 4,
    borderRadius: 2,
    backgroundColor: colors.dark.textMuted,
    alignSelf: 'center',
    marginBottom: 16,
  },
  postPreview: {
    color: colors.dark.textSecondary,
    fontSize: 13,
    fontWeight: '500',
    marginBottom: 20,
    textAlign: 'center',
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    marginBottom: 16,
  },
  gridItem: {
    width: '28%',
    alignItems: 'center',
    gap: 8,
    paddingVertical: 12,
  },
  iconCircle: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: colors.dark.cardAlt,
    alignItems: 'center',
    justifyContent: 'center',
  },
  actionLabel: {
    color: colors.dark.text,
    fontSize: 11,
    fontWeight: '600',
    textAlign: 'center',
  },
  cancelBtn: {
    backgroundColor: colors.dark.cardAlt,
    paddingVertical: 14,
    borderRadius: 14,
    alignItems: 'center',
    marginTop: 4,
  },
  cancelText: {
    color: colors.dark.text,
    fontSize: 15,
    fontWeight: '700',
  },
});
