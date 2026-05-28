import React from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet, Modal, Pressable, Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import * as Haptics from 'expo-haptics';
import { useRouter } from 'expo-router';
import { useQueryClient } from '@tanstack/react-query';
import { copyTextWithFallback } from '@/lib/copyLink';
import { buildPostShareUrl, sharePost, shareToMyPulseAsClip } from '@/lib/share';
import { postHasDownloadableMedia, shareDownloadedPostMedia } from '@/lib/postMediaActions';
import { useToast } from '@/components/ui/Toast';
import { pulseColors, pulseRadius, pulseTypography } from '@/lib/theme/pulseTheme';
import type { Post } from '@/types';
import { canRemixVideoPost, pushVideoRemixRoute } from '@/lib/videoRemixNavigation';
import { canClipFeedPost, canDownloadFeedPost } from '@/lib/feedClipPermissions';
import { pushFeedClipRoute } from '@/lib/feedClipNavigation';
import { useFeatureFlags } from '@/lib/featureFlags';
import { useAuth } from '@/contexts/AuthContext';
import { useAppStore } from '@/store/useAppStore';

interface Props {
  post: Post | null;
  onClose: () => void;
  onReport: () => void;
  onSave: () => void;
  isSaved: boolean;
  onNotInterested?: () => void;
  onHideCreatorFromFeed?: () => void;
  onBlockCreator?: () => void;
  /** When false, omit block action (e.g. viewing own post). */
  canBlockCreator?: boolean;
}

function clipActionForPost(
  post: Post,
  viewerId: string | undefined,
  feedClipping: boolean,
  viewerFollowsCreator: boolean,
) {
  const perm = canClipFeedPost(
    post,
    { id: viewerId },
    { feedClippingEnabled: feedClipping, viewerFollowsCreator },
  );
  if (!perm.allowed) return [] as const;
  const label = post.sourceLiveStreamId ? 'Clip from Live' : 'Clip this video';
  return [
    { icon: 'cut-outline' as const, label, key: 'clip' as const, color: pulseColors.teal },
  ] as const;
}

/**
 * Beta-launch gating (see feedVideoRemixAdvanced flag):
 *   - Use sound + Create video → always available when the post is remix-eligible.
 *     Use sound is fully wired (passes soundPostId so the source audio is
 *     pre-selected in the composer); Create video opens the canonical blank
 *     /create/video composer. The label was previously "Full editor", but
 *     because no source post context is passed through, users incorrectly
 *     assumed they were editing the selected post.
 *   - Duet, Stitch, B-roll → require `feedVideoRemixAdvanced` flag because the
 *     in-camera UX + export pipeline have known gaps (no audio mix on duet
 *     export, layout cropping on side-by-side, etc.). Hidden by default in
 *     production release builds.
 */
function remixActionsForPost(
  post: Post,
  viewerId: string | undefined,
  feedVideoRemixAdvanced: boolean,
) {
  if (!canRemixVideoPost(post, { id: viewerId })) return [] as const;
  const baseActions = [
    { icon: 'musical-notes' as const, label: 'Use sound', key: 'useSound' as const, color: pulseColors.gift },
  ] as const;
  const advancedActions = feedVideoRemixAdvanced
    ? ([
        { icon: 'git-branch-outline' as const, label: 'Duet', key: 'duet' as const, color: pulseColors.teal },
        { icon: 'git-merge-outline' as const, label: 'Stitch', key: 'stitch' as const, color: pulseColors.teal },
        { icon: 'layers-outline' as const, label: 'B-roll', key: 'stitchBroll' as const, color: pulseColors.gift },
      ] as const)
    : ([] as const);
  const editorActions = [
    { icon: 'film-outline' as const, label: 'Create video', key: 'composer' as const, color: pulseColors.text },
  ] as const;
  return [...baseActions, ...advancedActions, ...editorActions] as const;
}

const ACTIONS = (
  post: Post,
  isSaved: boolean,
  canBlockCreator: boolean,
  viewerId: string | undefined,
  feedClipping: boolean,
  viewerFollowsCreator: boolean,
  feedVideoRemixAdvanced: boolean,
) => {
  const download =
    postHasDownloadableMedia(post) && canDownloadFeedPost(post, { id: viewerId })
      ? [{ icon: 'download-outline' as const, label: 'Download', key: 'download' as const, color: pulseColors.text }]
      : [];
  const safety = [
    { icon: 'eye-off-outline' as const, label: 'Not interested in this post', key: 'hide' as const, color: pulseColors.textSecondary },
    { icon: 'person-remove-outline' as const, label: 'Hide creator from Feed', key: 'hideCreator' as const, color: pulseColors.textSecondary },
    ...(canBlockCreator
      ? [{ icon: 'ban-outline' as const, label: 'Block creator', key: 'blockCreator' as const, color: pulseColors.danger }]
      : []),
    { icon: 'flag-outline' as const, label: 'Report', key: 'report' as const, color: pulseColors.danger },
  ] as const;
  return [
    ...clipActionForPost(post, viewerId, feedClipping, viewerFollowsCreator),
    ...remixActionsForPost(post, viewerId, feedVideoRemixAdvanced),
    { icon: isSaved ? ('bookmark' as const) : ('bookmark-outline' as const), label: isSaved ? 'Unsave' : 'Save', key: 'save' as const, color: isSaved ? pulseColors.gift : pulseColors.text },
    { icon: 'albums-outline' as const, label: 'Pin to My Pulse', key: 'pin' as const, color: pulseColors.teal },
    { icon: 'paper-plane-outline' as const, label: 'Share', key: 'share' as const, color: pulseColors.textSecondary },
    ...download,
    { icon: 'link-outline' as const, label: 'Copy link', key: 'copy' as const, color: pulseColors.textSecondary },
    ...safety,
  ];
};

export function LongPressMenu({
  post, onClose, onReport, onSave, isSaved, onNotInterested, onHideCreatorFromFeed, onBlockCreator, canBlockCreator = true,
}: Props) {
  const router = useRouter();
  const queryClient = useQueryClient();
  const toast = useToast((s) => s.show);
  const { user } = useAuth();
  const feedClipping = useFeatureFlags((s) => s.feedClipping);
  const feedVideoRemixAdvanced = useFeatureFlags((s) => s.feedVideoRemixAdvanced);
  const followedCreatorIds = useAppStore((s) => s.followedCreatorIds);

  if (!post) return null;

  const viewerFollowsCreator = followedCreatorIds.has(post.creatorId);

  const handleAction = async (key: string) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    switch (key) {
      case 'clip': {
        onClose();
        const perm = canClipFeedPost(post, user, {
          feedClippingEnabled: feedClipping,
          viewerFollowsCreator,
        });
        if (!perm.allowed) {
          toast(perm.message, 'info');
          break;
        }
        pushFeedClipRoute(router, post);
        break;
      }
      case 'useSound':
        onClose();
        pushVideoRemixRoute(router, post, 'useSound');
        break;
      case 'duet':
        onClose();
        pushVideoRemixRoute(router, post, 'duet');
        break;
      case 'stitch':
        onClose();
        pushVideoRemixRoute(router, post, 'stitch');
        break;
      case 'stitchBroll':
        onClose();
        pushVideoRemixRoute(router, post, 'stitchBroll');
        break;
      case 'composer':
        onClose();
        pushVideoRemixRoute(router, post, 'composer');
        break;
      case 'save':
        onSave();
        onClose();
        break;
      case 'pin': {
        onClose();
        try {
          const ok = await shareToMyPulseAsClip(post, { queryClient });
          toast(ok ? 'Pinned to My Pulse' : 'Sign in to pin to My Pulse', ok ? 'success' : 'info');
        } catch {
          toast('Could not pin to My Pulse', 'error');
        }
        break;
      }
      case 'share':
        onClose();
        await sharePost(post.id, post.caption ?? '', { anonymous: post.isAnonymous });
        break;
      case 'download':
        onClose();
        void shareDownloadedPostMedia(post);
        break;
      case 'copy': {
        await copyTextWithFallback(buildPostShareUrl(post.id));
        onClose();
        break;
      }
      case 'hide':
        onNotInterested?.();
        onClose();
        break;
      case 'hideCreator':
        onHideCreatorFromFeed?.();
        onClose();
        break;
      case 'blockCreator':
        onBlockCreator?.();
        onClose();
        break;
      case 'report':
        onReport();
        onClose();
        break;
      default:
        onClose();
    }
  };

  return (
    <Modal visible transparent animationType="fade" onRequestClose={onClose}>
      <Pressable style={styles.backdrop} onPress={onClose}>
        <Pressable style={styles.sheet} onPress={(e) => e.stopPropagation()}>
          <LinearGradient
            colors={['rgba(15, 28, 48, 0.96)', 'rgba(12, 18, 32, 0.98)']}
            style={StyleSheet.absoluteFill}
          />
          <LinearGradient
            colors={['rgba(56, 189, 248, 0.12)', 'transparent']}
            style={styles.topHighlight}
            pointerEvents="none"
          />
          <View style={styles.handle} />
          <Text style={styles.postPreview} numberOfLines={2}>
            {post.caption || `${post.type} post by @${post.creator.displayName}`}
          </Text>
          <View style={styles.grid}>
            {ACTIONS(
              post,
              isSaved,
              canBlockCreator,
              user?.id,
              feedClipping,
              viewerFollowsCreator,
              feedVideoRemixAdvanced,
            ).map((action) => (
              <TouchableOpacity
                key={action.key}
                style={styles.gridItem}
                onPress={() => void handleAction(action.key)}
                activeOpacity={0.7}
              >
                <View style={[styles.iconCircle, action.key === 'report' || action.key === 'blockCreator' ? styles.iconCircleDanger : null]}>
                  <Ionicons name={action.icon as any} size={22} color={action.color} />
                </View>
                <Text
                  style={[
                    styles.actionLabel,
                    (action.key === 'report' || action.key === 'blockCreator') && styles.actionLabelDanger,
                  ]}
                  numberOfLines={2}
                >
                  {action.label}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
          <TouchableOpacity style={styles.cancelBtn} onPress={onClose} activeOpacity={0.7}>
            <Text style={styles.cancelText}>Cancel</Text>
          </TouchableOpacity>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: pulseColors.backdrop,
    justifyContent: 'flex-end',
  },
  sheet: {
    borderTopLeftRadius: pulseRadius.sheet,
    borderTopRightRadius: pulseRadius.sheet,
    borderWidth: 1,
    borderBottomWidth: 0,
    borderColor: pulseColors.borderAccent,
    paddingBottom: Platform.OS === 'ios' ? 40 : 24,
    paddingTop: 12,
    paddingHorizontal: 20,
    overflow: 'hidden',
  },
  topHighlight: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 56,
  },
  handle: {
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: 'rgba(255,255,255,0.22)',
    alignSelf: 'center',
    marginBottom: 16,
  },
  postPreview: {
    ...pulseTypography.bodySmall,
    marginBottom: 20,
    textAlign: 'center',
    color: pulseColors.mutedText,
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
    width: 52,
    height: 52,
    borderRadius: 26,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: pulseColors.glass,
    borderWidth: 1,
    borderColor: pulseColors.border,
  },
  iconCircleDanger: {
    backgroundColor: 'rgba(248, 113, 113, 0.1)',
    borderColor: 'rgba(248, 113, 113, 0.28)',
  },
  actionLabel: {
    ...pulseTypography.caption,
    fontWeight: '700',
    textAlign: 'center',
    color: pulseColors.textSecondary,
  },
  actionLabelDanger: {
    color: pulseColors.danger,
  },
  cancelBtn: {
    alignItems: 'center',
    paddingVertical: 14,
    borderRadius: pulseRadius.button,
    backgroundColor: pulseColors.glass,
    borderWidth: 1,
    borderColor: pulseColors.border,
  },
  cancelText: {
    ...pulseTypography.cardTitle,
    fontSize: 14,
    color: pulseColors.text,
  },
});
