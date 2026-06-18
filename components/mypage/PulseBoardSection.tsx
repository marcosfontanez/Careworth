import React, { memo, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Animated,
  AppState,
  Easing,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { useIsFocused } from '@react-navigation/native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '@/contexts/AuthContext';
import { useProfileBoardFeed } from '@/hooks/useQueries';
import { useReduceMotion } from '@/hooks/useReduceMotion';
import { buildAuthLoginHref } from '@/lib/authLoginReturn';
import {
  coerceProfileBoardFeed,
  PULSE_BOARD_FLOATING_VISIBLE_SLOTS,
  splitPulseBoardDisplay,
} from '@/lib/pulseBoardRetention';
import type { ProfileBoardFeed } from '@/lib/pulseBoardRetention';
import {
  PULSE_BOARD_SHOUTOUT_MAX_LENGTH,
  validatePulseBoardBody,
} from '@/lib/pulseBoardValidation';
import { profileBoardKeys } from '@/lib/queryKeys';
import { profileBoardShoutoutsService } from '@/services/supabase/profileBoardShoutouts';
import type { BlockRelationship } from '@/services/supabase/blocks';
import type { ProfileBoardShoutout } from '@/types';
import { PVSectionHeader } from '@/components/pv/PVSectionHeader';
import { ReportModal } from '@/components/ui/ReportModal';
import { PulseBottomSheet } from '@/components/ui/pulse/PulseBottomSheet';
import { useToast } from '@/components/ui/Toast';
import { AvatarDisplay, pulseFrameFromUser } from '@/components/profile/AvatarBuilder';
import { colors, borderRadius, spacing, typography, pulseverse } from '@/theme';
import { profileHandleLineForCreator } from '@/utils/profileHandle';
import { relativeMyPulse } from '@/utils/format';

const VISIBLE_SLOTS = PULSE_BOARD_FLOATING_VISIBLE_SLOTS;
const SLOT_HEIGHT = 56;
const BOARD_SURFACE_HEIGHT = VISIBLE_SLOTS * SLOT_HEIGHT + spacing.md;
const CYCLE_MS = 4200;
const FLOAT_MS = 3600;
const ENTER_MS = 750;

type Props = {
  profileOwnerId: string;
  profileOwnerDisplayName: string;
  isOwner: boolean;
  contentLocked: boolean;
  boardEnabled: boolean;
  blockRelationship?: BlockRelationship;
  onBlockUser?: (userId: string) => void | Promise<void>;
};

export function PulseBoardSection({
  profileOwnerId,
  profileOwnerDisplayName: _profileOwnerDisplayName,
  isOwner,
  contentLocked,
  boardEnabled,
  blockRelationship = 'none',
  onBlockUser,
}: Props) {
  const router = useRouter();
  const queryClient = useQueryClient();
  const { user: authUser } = useAuth();
  const showToast = useToast((s) => s.show);
  const reduceMotion = useReduceMotion();
  const [reportTargetId, setReportTargetId] = useState<string | null>(null);
  const [manageShoutout, setManageShoutout] = useState<ProfileBoardShoutout | null>(null);
  const [visitorOwnShoutout, setVisitorOwnShoutout] = useState<ProfileBoardShoutout | null>(null);

  const boardVisibleToViewer = !contentLocked && boardEnabled;
  const sectionVisible = isOwner || boardVisibleToViewer;

  const { data: feed, isLoading } = useProfileBoardFeed(profileOwnerId, sectionVisible);

  const invalidateBoard = useCallback(() => {
    void queryClient.invalidateQueries({ queryKey: profileBoardKeys.forProfile(profileOwnerId) });
  }, [queryClient, profileOwnerId]);

  const postMutation = useMutation({
    mutationFn: (body: string) => profileBoardShoutoutsService.post(profileOwnerId, body),
    onSuccess: (created) => {
      queryClient.setQueryData<ProfileBoardFeed>(
        profileBoardKeys.forProfile(profileOwnerId),
        (old) => {
          const feed = coerceProfileBoardFeed(old) ?? {
            pinned: null,
            items: [],
            isOwnerView: false,
          };
          if (feed.items.some((s) => s.id === created.id) || feed.pinned?.id === created.id) {
            return feed;
          }
          return { ...feed, items: [created, ...feed.items] };
        },
      );
      invalidateBoard();
    },
  });

  const moderateMutation = useMutation({
    mutationFn: (args: { id: string; action: 'hide' | 'delete' | 'author_delete' }) =>
      profileBoardShoutoutsService.moderate(args.id, args.action),
    onSuccess: () => invalidateBoard(),
  });

  const pinMutation = useMutation({
    mutationFn: (args: { id: string; pin: boolean }) =>
      profileBoardShoutoutsService.moderate(args.id, args.pin ? 'pin' : 'unpin'),
    onSuccess: () => invalidateBoard(),
  });

  const { pinnedShoutout, rotatingShoutouts, staticShoutouts } = useMemo(
    () => splitPulseBoardDisplay(feed, isOwner),
    [feed, isOwner],
  );

  const hasBoardContent =
    Boolean(pinnedShoutout) ||
    staticShoutouts.length > 0 ||
    rotatingShoutouts.length > 0;

  const visitorWallItems =
    rotatingShoutouts.length > 0 ? rotatingShoutouts : staticShoutouts.slice(0, VISIBLE_SLOTS);

  const handleModerate = useCallback(
    async (shoutout: ProfileBoardShoutout, action: 'hide' | 'delete' | 'author_delete') => {
      try {
        await moderateMutation.mutateAsync({ id: shoutout.id, action });
        showToast(
          action === 'hide' ? 'Shoutout hidden' : 'Shoutout removed',
          'success',
        );
      } catch (err) {
        showToast(
          err instanceof Error ? err.message : 'Could not update that shoutout.',
          'error',
        );
      }
    },
    [moderateMutation, showToast],
  );

  const handlePin = useCallback(
    async (shoutout: ProfileBoardShoutout, pin: boolean) => {
      try {
        await pinMutation.mutateAsync({ id: shoutout.id, pin });
        showToast(pin ? 'Shoutout pinned' : 'Shoutout unpinned', 'success');
      } catch (err) {
        showToast(
          err instanceof Error ? err.message : 'Could not update pin.',
          'error',
        );
      }
    },
    [pinMutation, showToast],
  );

  const openOwnerActions = useCallback((shoutout: ProfileBoardShoutout) => {
    setManageShoutout(shoutout);
  }, []);

  const openVisitorOwnActions = useCallback((shoutout: ProfileBoardShoutout) => {
    setVisitorOwnShoutout(shoutout);
  }, []);

  const onPressShoutout = useCallback(
    (shoutout: ProfileBoardShoutout) => {
      if (isOwner) {
        openOwnerActions(shoutout);
        return;
      }
      if (authUser?.id && shoutout.authorId === authUser.id) {
        openVisitorOwnActions(shoutout);
      }
    },
    [authUser?.id, isOwner, openOwnerActions, openVisitorOwnActions],
  );

  const subtitle = isOwner
    ? boardEnabled
      ? 'What people are saying.'
      : 'Your board is off for visitors.'
    : hasBoardContent
      ? 'What people are saying.'
      : 'Leave a quick shoutout.';

  if (!sectionVisible) return null;

  const canPost =
    !isOwner &&
    !!authUser &&
    boardVisibleToViewer &&
    blockRelationship === 'none';

  const loginPath = buildAuthLoginHref(`/profile/${profileOwnerId}`);

  return (
    <View>
      <PVSectionHeader
        title="Pulse Board"
        subtitle={subtitle}
        style={{ marginBottom: spacing.sm }}
      />

      {!boardEnabled && isOwner ? (
        <View style={styles.disabledBanner}>
          <Ionicons name="eye-off-outline" size={14} color={colors.dark.textMuted} />
          <Text style={styles.disabledBannerText}>
            Pulse Board is hidden from visitors while disabled.
          </Text>
        </View>
      ) : null}

      {contentLocked && !isOwner ? (
        <PulseBoardLocked />
      ) : isLoading ? (
        <View style={styles.loadingWrap}>
          <ActivityIndicator color={colors.primary.teal} size="small" />
        </View>
      ) : !hasBoardContent ? (
        <PulseBoardEmpty isOwner={isOwner} />
      ) : (
        <>
          {pinnedShoutout ? (
            <View style={styles.pinnedSlot}>
              <PulseBoardBubble
                item={pinnedShoutout}
                onPress={onPressShoutout}
                pinned
              />
            </View>
          ) : null}
          {isOwner ? (
            <>
              {!reduceMotion && rotatingShoutouts.length > 0 ? (
                <PulseBoardFloatingWall
                  items={rotatingShoutouts}
                  onPress={onPressShoutout}
                />
              ) : null}
              {staticShoutouts.length > 0 ? (
                <PulseBoardOwnerHistory
                  items={staticShoutouts}
                  onPress={onPressShoutout}
                />
              ) : null}
            </>
          ) : visitorWallItems.length > 0 ? (
            reduceMotion ? (
              <PulseBoardStaticList
                items={visitorWallItems.slice(0, VISIBLE_SLOTS)}
                onPress={onPressShoutout}
              />
            ) : (
              <PulseBoardFloatingWall
                items={visitorWallItems}
                onPress={onPressShoutout}
              />
            )
          ) : null}
        </>
      )}

      {canPost ? (
        <PulseBoardComposer
          busy={postMutation.isPending}
          onSubmit={async (body) => {
            const parsed = validatePulseBoardBody(body);
            if (!parsed.ok) {
              showToast(parsed.message, 'error');
              return false;
            }
            try {
              await postMutation.mutateAsync(parsed.body);
              showToast('Shoutout posted', 'success');
              return true;
            } catch (err) {
              showToast(
                err instanceof Error ? err.message : 'Could not post shoutout.',
                'error',
              );
              return false;
            }
          }}
        />
      ) : !isOwner && boardVisibleToViewer && blockRelationship === 'none' && !authUser ? (
        <TouchableOpacity
          style={styles.signInCta}
          onPress={() => router.push(loginPath as never)}
          activeOpacity={0.85}
          accessibilityRole="button"
          accessibilityLabel="Sign in to leave a shoutout"
        >
          <Ionicons name="chatbubble-ellipses-outline" size={16} color={colors.primary.teal} />
          <Text style={styles.signInCtaText}>Sign in to leave a Pulse</Text>
        </TouchableOpacity>
      ) : null}

      <ReportModal
        visible={!!reportTargetId}
        onClose={() => setReportTargetId(null)}
        targetType="profile_board_shoutout"
        targetId={reportTargetId ?? ''}
      />

      <PulseBoardManageSheet
        visible={!!manageShoutout}
        shoutout={manageShoutout}
        onClose={() => setManageShoutout(null)}
        onPin={(pin) => {
          if (!manageShoutout) return;
          void handlePin(manageShoutout, pin);
        }}
        onHide={() => {
          if (!manageShoutout) return;
          void handleModerate(manageShoutout, 'hide');
        }}
        onDelete={() => {
          if (!manageShoutout) return;
          void handleModerate(manageShoutout, 'delete');
        }}
        onBlock={
          onBlockUser && manageShoutout
            ? () => void onBlockUser(manageShoutout.authorId)
            : undefined
        }
        onReport={() => {
          if (!manageShoutout) return;
          setReportTargetId(manageShoutout.id);
        }}
      />

      <PulseBoardVisitorOwnSheet
        visible={!!visitorOwnShoutout}
        shoutout={visitorOwnShoutout}
        onClose={() => setVisitorOwnShoutout(null)}
        onRemove={() => {
          if (!visitorOwnShoutout) return;
          void handleModerate(visitorOwnShoutout, 'author_delete');
        }}
      />
    </View>
  );
}

function PulseBoardOwnerHistory({
  items,
  onPress,
}: {
  items: ProfileBoardShoutout[];
  onPress: (item: ProfileBoardShoutout) => void;
}) {
  return (
    <View style={styles.ownerHistoryWrap}>
      <Text style={styles.ownerHistoryTitle}>Manage shoutouts</Text>
      <PulseBoardGlassFrame>
        <ScrollView
          style={styles.ownerHistoryScroll}
          contentContainerStyle={styles.ownerHistoryList}
          nestedScrollEnabled
          showsVerticalScrollIndicator={false}
        >
          {items.map((item) => (
            <PulseBoardBubble
              key={item.id}
              item={item}
              onPress={onPress}
              archived={Boolean(item.archivedAt)}
            />
          ))}
        </ScrollView>
      </PulseBoardGlassFrame>
    </View>
  );
}

function PulseBoardManageRow({
  icon,
  label,
  onPress,
  destructive = false,
}: {
  icon: React.ComponentProps<typeof Ionicons>['name'];
  label: string;
  onPress: () => void;
  destructive?: boolean;
}) {
  return (
    <TouchableOpacity
      style={styles.manageRow}
      onPress={onPress}
      activeOpacity={0.86}
      accessibilityRole="button"
      accessibilityLabel={label}
    >
      <Ionicons
        name={icon}
        size={18}
        color={destructive ? colors.status.error : colors.primary.teal}
      />
      <Text style={[styles.manageRowLabel, destructive && styles.manageRowLabelDestructive]}>
        {label}
      </Text>
    </TouchableOpacity>
  );
}

function PulseBoardManageSheet({
  visible,
  shoutout,
  onClose,
  onPin,
  onHide,
  onDelete,
  onBlock,
  onReport,
}: {
  visible: boolean;
  shoutout: ProfileBoardShoutout | null;
  onClose: () => void;
  onPin: (pin: boolean) => void;
  onHide: () => void;
  onDelete: () => void;
  onBlock?: () => void;
  onReport: () => void;
}) {
  if (!shoutout) return null;

  const isPinned = Boolean(shoutout.pinnedAt);
  const authorLabel = shoutout.author?.displayName ?? 'this visitor';

  const run = (fn: () => void) => {
    onClose();
    fn();
  };

  return (
    <PulseBottomSheet
      visible={visible}
      onClose={onClose}
      title="Manage shoutout"
      maxHeightRatio={0.56}
      scrollable
    >
      <Text style={styles.managePreview} numberOfLines={3}>
        “{shoutout.body}”
      </Text>
      <View style={styles.manageActions}>
        <PulseBoardManageRow
          icon={isPinned ? 'pin' : 'pin-outline'}
          label={isPinned ? 'Unpin from board' : 'Pin to board'}
          onPress={() => run(() => onPin(!isPinned))}
        />
        <PulseBoardManageRow
          icon="eye-off-outline"
          label="Hide shoutout"
          onPress={() => run(onHide)}
        />
        <PulseBoardManageRow
          icon="trash-outline"
          label="Delete shoutout"
          onPress={() => run(onDelete)}
          destructive
        />
        {onBlock ? (
          <PulseBoardManageRow
            icon="ban-outline"
            label={`Block ${authorLabel}`}
            onPress={() => run(onBlock)}
            destructive
          />
        ) : null}
        <PulseBoardManageRow
          icon="flag-outline"
          label="Report"
          onPress={() => run(onReport)}
        />
        <PulseBoardManageRow icon="close-outline" label="Cancel" onPress={onClose} />
      </View>
    </PulseBottomSheet>
  );
}

function PulseBoardVisitorOwnSheet({
  visible,
  shoutout,
  onClose,
  onRemove,
}: {
  visible: boolean;
  shoutout: ProfileBoardShoutout | null;
  onClose: () => void;
  onRemove: () => void;
}) {
  if (!shoutout) return null;

  return (
    <PulseBottomSheet visible={visible} onClose={onClose} title="Your shoutout" maxHeightRatio={0.42}>
      <Text style={styles.managePreview} numberOfLines={3}>
        “{shoutout.body}”
      </Text>
      <View style={styles.manageActions}>
        <PulseBoardManageRow
          icon="trash-outline"
          label="Remove"
          onPress={() => {
            onClose();
            onRemove();
          }}
          destructive
        />
        <PulseBoardManageRow icon="close-outline" label="Cancel" onPress={onClose} />
      </View>
    </PulseBottomSheet>
  );
}

const PulseBoardBubble = memo(function PulseBoardBubble({
  item,
  onPress,
  pinned = false,
  archived = false,
}: {
  item: ProfileBoardShoutout;
  onPress?: (item: ProfileBoardShoutout) => void;
  pinned?: boolean;
  archived?: boolean;
}) {
  const author = item.author;
  const authorId = author?.id?.trim() || item.authorId;
  const displayName = author?.displayName?.trim() || '';
  const label = displayName || 'PulseVerse user';
  const handle = authorId
    ? profileHandleLineForCreator({
        id: authorId,
        displayName: label,
        username: author?.username,
        firstName: author?.firstName,
        lastName: author?.lastName,
      })
    : null;

  return (
    <Pressable
      style={[styles.bubble, pinned ? styles.bubblePinned : null]}
      onPress={onPress ? () => onPress(item) : undefined}
      accessibilityRole={onPress ? 'button' : 'text'}
    >
      {pinned ? (
        <View style={styles.pinnedBadge} pointerEvents="none">
          <Ionicons name="pin" size={10} color={colors.primary.gold} />
          <Text style={styles.pinnedBadgeText}>Pinned</Text>
        </View>
      ) : archived ? (
        <View style={styles.archivedBadge} pointerEvents="none">
          <Ionicons name="time-outline" size={10} color={colors.dark.textMuted} />
          <Text style={styles.archivedBadgeText}>Archived</Text>
        </View>
      ) : null}
      {author?.avatarUrl ? (
        <AvatarDisplay
          size={28}
          avatarUrl={author.avatarUrl}
          showEdit={false}
          ringColor={colors.primary.teal}
          pulseFrame={pulseFrameFromUser(author.pulseAvatarFrame)}
        />
      ) : (
        <View style={styles.bubbleAvatarFallback}>
          <Ionicons name="person" size={14} color={colors.dark.textMuted} />
        </View>
      )}
      <View style={styles.bubbleCopy}>
        <View style={styles.bubbleMetaRow}>
          <Text style={styles.bubbleName} numberOfLines={1}>
            {label}
          </Text>
          {handle && displayName ? (
            <Text style={styles.bubbleHandle} numberOfLines={1}>
              {handle}
            </Text>
          ) : null}
          <Text style={styles.bubbleTime}>{relativeMyPulse(item.createdAt)}</Text>
        </View>
        <Text style={styles.bubbleBody} numberOfLines={2}>
          {item.body}
        </Text>
      </View>
    </Pressable>
  );
});

function PulseBoardGlassFrame({ children }: { children: React.ReactNode }) {
  return (
    <View style={styles.glassFrame}>
      <LinearGradient
        colors={['rgba(34,211,238,0.16)', 'rgba(139,92,246,0.1)', 'rgba(8,14,28,0.55)']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={StyleSheet.absoluteFillObject}
      />
      <View style={styles.glassVeil} pointerEvents="none" />
      <View style={styles.glassInnerGlow} pointerEvents="none" />
      {children}
    </View>
  );
}

function PulseBoardStaticList({
  items,
  onPress,
  showArchived = false,
}: {
  items: ProfileBoardShoutout[];
  onPress: (item: ProfileBoardShoutout) => void;
  showArchived?: boolean;
}) {
  return (
    <PulseBoardGlassFrame>
      <View style={styles.staticList}>
        {items.map((item) => (
          <PulseBoardBubble
            key={item.id}
            item={item}
            onPress={onPress}
            archived={showArchived && Boolean(item.archivedAt)}
          />
        ))}
      </View>
    </PulseBoardGlassFrame>
  );
}

function useBoardMotionActive() {
  const isFocused = useIsFocused();
  const [appActive, setAppActive] = useState(() => AppState.currentState === 'active');

  useEffect(() => {
    const sub = AppState.addEventListener('change', (state) => {
      setAppActive(state === 'active');
    });
    return () => sub.remove();
  }, []);

  return isFocused && appActive;
}

function PulseBoardFloatingWall({
  items,
  onPress,
}: {
  items: ProfileBoardShoutout[];
  onPress: (item: ProfileBoardShoutout) => void;
}) {
  const motionActive = useBoardMotionActive();
  const [headIndex, setHeadIndex] = useState(0);

  const shouldRotate = items.length >= 2 && motionActive;

  useEffect(() => {
    if (!shouldRotate) return;
    const id = setInterval(() => {
      setHeadIndex((c) => (c + 1) % items.length);
    }, CYCLE_MS);
    return () => clearInterval(id);
  }, [items.length, shouldRotate]);

  if (items.length === 0) return null;

  if (items.length === 1) {
    return (
      <PulseBoardGlassFrame>
        <View style={styles.singleBubbleWrap}>
          <PulseBoardSingleBubble item={items[0]} onPress={onPress} motionActive={motionActive} />
        </View>
      </PulseBoardGlassFrame>
    );
  }

  const visibleCount = Math.min(items.length, VISIBLE_SLOTS);
  const visibleItems = Array.from({ length: visibleCount }, (_, slot) => ({
    item: items[(headIndex + slot) % items.length],
    slot,
  }));

  return (
    <PulseBoardGlassFrame>
      <View style={styles.surface}>
        {visibleItems.map(({ item, slot }) => (
          <PulseBoardFloatingSlot
            key={`slot-${slot}`}
            item={item}
            slot={slot}
            headIndex={headIndex}
            motionActive={motionActive}
            onPress={onPress}
          />
        ))}
      </View>
    </PulseBoardGlassFrame>
  );
}

const PulseBoardSingleBubble = memo(function PulseBoardSingleBubble({
  item,
  onPress,
  motionActive,
}: {
  item: ProfileBoardShoutout;
  onPress: (item: ProfileBoardShoutout) => void;
  motionActive: boolean;
}) {
  const glow = useRef(new Animated.Value(0)).current;
  const loopRef = useRef<Animated.CompositeAnimation | null>(null);

  useEffect(() => {
    if (!motionActive) {
      loopRef.current?.stop();
      glow.setValue(0);
      return;
    }

    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(glow, {
          toValue: 1,
          duration: 1800,
          easing: Easing.inOut(Easing.sin),
          useNativeDriver: true,
        }),
        Animated.timing(glow, {
          toValue: 0,
          duration: 1800,
          easing: Easing.inOut(Easing.sin),
          useNativeDriver: true,
        }),
      ]),
    );
    loopRef.current = loop;
    loop.start();
    return () => loop.stop();
  }, [glow, motionActive]);

  const haloOpacity = glow.interpolate({
    inputRange: [0, 1],
    outputRange: [0.22, 0.5],
  });

  return (
    <View style={styles.singleBubbleInner}>
      <Animated.View style={[styles.singleBubbleGlow, { opacity: haloOpacity }]} pointerEvents="none" />
      <PulseBoardBubble item={item} onPress={onPress} />
    </View>
  );
});

const PulseBoardFloatingSlot = memo(function PulseBoardFloatingSlot({
  item,
  slot,
  headIndex,
  motionActive,
  onPress,
}: {
  item: ProfileBoardShoutout;
  slot: number;
  headIndex: number;
  motionActive: boolean;
  onPress: (item: ProfileBoardShoutout) => void;
}) {
  const opacity = useRef(new Animated.Value(0)).current;
  const translateY = useRef(new Animated.Value(32)).current;
  const animRef = useRef<Animated.CompositeAnimation | null>(null);
  const signatureRef = useRef('');

  useEffect(() => {
    animRef.current?.stop();

    if (!motionActive) {
      opacity.setValue(1);
      translateY.setValue(0);
      signatureRef.current = '';
      return;
    }

    const signature = `${item.id}:${headIndex}:${slot}`;
    if (signatureRef.current === signature) return;
    signatureRef.current = signature;

    opacity.setValue(0);
    translateY.setValue(32);

    const staggerMs = slot * 220;
    const enter = Animated.sequence([
      Animated.delay(staggerMs),
      Animated.parallel([
        Animated.timing(opacity, {
          toValue: 1,
          duration: ENTER_MS,
          easing: Easing.out(Easing.cubic),
          useNativeDriver: true,
        }),
        Animated.timing(translateY, {
          toValue: 0,
          duration: ENTER_MS,
          easing: Easing.out(Easing.cubic),
          useNativeDriver: true,
        }),
      ]),
      Animated.parallel([
        Animated.timing(translateY, {
          toValue: -22,
          duration: FLOAT_MS,
          easing: Easing.inOut(Easing.quad),
          useNativeDriver: true,
        }),
        Animated.timing(opacity, {
          toValue: 0.35,
          duration: FLOAT_MS,
          easing: Easing.inOut(Easing.quad),
          useNativeDriver: true,
        }),
      ]),
    ]);

    animRef.current = enter;
    enter.start();

    return () => {
      enter.stop();
    };
  }, [headIndex, item.id, motionActive, opacity, slot, translateY]);

  return (
    <Animated.View
      style={[
        styles.floatingSlot,
        {
          top: slot * SLOT_HEIGHT,
          opacity,
          transform: [{ translateY }],
        },
      ]}
    >
      <PulseBoardBubble item={item} onPress={onPress} />
    </Animated.View>
  );
});

function PulseBoardComposer({
  busy,
  onSubmit,
}: {
  busy: boolean;
  onSubmit: (body: string) => Promise<boolean>;
}) {
  const [text, setText] = useState('');
  const trimmed = text.trim();
  const canSubmit = trimmed.length > 0 && !busy;

  return (
    <View style={styles.composer}>
      <TextInput
        style={styles.composerInput}
        value={text}
        onChangeText={setText}
        placeholder="Leave a shoutout…"
        placeholderTextColor={colors.dark.textMuted}
        maxLength={PULSE_BOARD_SHOUTOUT_MAX_LENGTH}
        multiline
        editable={!busy}
        accessibilityLabel="Pulse Board shoutout"
      />
      <TouchableOpacity
        style={[styles.composerBtn, !canSubmit && styles.composerBtnDisabled]}
        onPress={() => {
          if (!canSubmit) return;
          void onSubmit(text).then((ok) => {
            if (ok) setText('');
          });
        }}
        disabled={!canSubmit}
        activeOpacity={0.85}
        accessibilityRole="button"
        accessibilityLabel="Leave a shoutout"
      >
        {busy ? (
          <ActivityIndicator color="#FFF" size="small" />
        ) : (
          <>
            <Ionicons name="sparkles-outline" size={14} color="#FFF" />
            <Text style={styles.composerBtnText}>Leave a Pulse</Text>
          </>
        )}
      </TouchableOpacity>
    </View>
  );
}

function PulseBoardEmpty({ isOwner }: { isOwner: boolean }) {
  return (
    <PulseBoardGlassFrame>
      <View style={styles.emptyBox}>
        <Ionicons name="chatbubbles-outline" size={20} color={pulseverse.accentCyan} />
        <Text style={styles.emptyTitle}>
          {isOwner ? 'Your Pulse Board is ready' : 'Be the first to leave a Pulse'}
        </Text>
        <Text style={styles.emptyBody}>
          {isOwner
            ? 'Visitors can leave quick shoutouts here.'
            : 'Say something kind on their Pulse.'}
        </Text>
      </View>
    </PulseBoardGlassFrame>
  );
}

function PulseBoardLocked() {
  return (
    <PulseBoardGlassFrame>
      <View style={styles.emptyBox}>
        <Ionicons name="lock-closed-outline" size={18} color={colors.dark.textMuted} />
        <Text style={styles.emptyTitle}>Pulse Board unavailable</Text>
        <Text style={styles.emptyBody}>This Pulse Board is turned off or unavailable.</Text>
      </View>
    </PulseBoardGlassFrame>
  );
}

const styles = StyleSheet.create({
  loadingWrap: {
    minHeight: BOARD_SURFACE_HEIGHT,
    alignItems: 'center',
    justifyContent: 'center',
  },
  disabledBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    marginBottom: spacing.sm,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderRadius: borderRadius.lg,
    backgroundColor: 'rgba(12,18,32,0.55)',
  },
  disabledBannerText: {
    flex: 1,
    ...typography.caption,
    color: colors.dark.textMuted,
  },
  glassFrame: {
    minHeight: BOARD_SURFACE_HEIGHT,
    borderRadius: borderRadius['2xl'],
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(56,189,248,0.22)',
    backgroundColor: 'rgba(8,14,28,0.45)',
    shadowColor: pulseverse.electric,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.12,
    shadowRadius: 18,
    elevation: 4,
  },
  glassVeil: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(12,18,32,0.28)',
  },
  glassInnerGlow: {
    position: 'absolute',
    top: 0,
    left: 12,
    right: 12,
    height: 1,
    backgroundColor: 'rgba(255,255,255,0.14)',
  },
  surface: {
    height: BOARD_SURFACE_HEIGHT,
    position: 'relative',
    overflow: 'hidden',
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
  },
  floatingSlot: {
    position: 'absolute',
    left: spacing.sm,
    right: spacing.sm,
  },
  staticList: {
    gap: spacing.xs,
    padding: spacing.sm,
  },
  singleBubbleWrap: {
    minHeight: BOARD_SURFACE_HEIGHT,
    justifyContent: 'center',
    padding: spacing.sm,
  },
  singleBubbleInner: {
    position: 'relative',
  },
  singleBubbleGlow: {
    ...StyleSheet.absoluteFillObject,
    borderRadius: borderRadius.xl,
    backgroundColor: 'rgba(34,211,238,0.2)',
    borderWidth: 1,
    borderColor: 'rgba(139,92,246,0.35)',
  },
  bubble: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.sm,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.sm,
    borderRadius: borderRadius.xl,
    backgroundColor: 'rgba(12,18,32,0.72)',
    borderWidth: 1,
    borderColor: 'rgba(56,189,248,0.18)',
    position: 'relative',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.18,
    shadowRadius: 8,
    elevation: 2,
  },
  bubblePinned: {
    borderColor: 'rgba(245,158,11,0.32)',
    backgroundColor: 'rgba(18,22,36,0.82)',
  },
  pinnedSlot: {
    marginBottom: spacing.sm,
  },
  pinnedBadge: {
    position: 'absolute',
    top: 6,
    right: 8,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: borderRadius.full,
    backgroundColor: 'rgba(245,158,11,0.12)',
    zIndex: 1,
  },
  pinnedBadgeText: {
    ...typography.caption,
    color: colors.primary.gold,
    fontSize: 10,
    fontWeight: '700',
  },
  archivedBadge: {
    position: 'absolute',
    top: 6,
    right: 8,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: borderRadius.full,
    backgroundColor: 'rgba(148,163,184,0.12)',
    zIndex: 1,
  },
  archivedBadgeText: {
    ...typography.caption,
    color: colors.dark.textMuted,
    fontSize: 10,
    fontWeight: '600',
  },
  ownerHistoryWrap: {
    marginTop: spacing.md,
    gap: spacing.xs,
  },
  ownerHistoryTitle: {
    ...typography.caption,
    color: colors.dark.textMuted,
    fontWeight: '600',
    letterSpacing: 0.4,
    textTransform: 'uppercase',
  },
  ownerHistoryScroll: {
    maxHeight: 320,
  },
  ownerHistoryList: {
    gap: spacing.xs,
    padding: spacing.sm,
  },
  bubbleAvatarFallback: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(18,26,44,0.9)',
  },
  bubbleCopy: {
    flex: 1,
    minWidth: 0,
  },
  bubbleMetaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: spacing.xs,
    marginBottom: 2,
  },
  bubbleName: {
    ...typography.caption,
    color: colors.dark.text,
    fontWeight: '600',
    maxWidth: '42%',
  },
  bubbleHandle: {
    ...typography.caption,
    color: colors.dark.textMuted,
    maxWidth: '30%',
  },
  bubbleTime: {
    ...typography.caption,
    color: colors.dark.textMuted,
    marginLeft: 'auto',
  },
  bubbleBody: {
    ...typography.bodySmall,
    color: colors.dark.textSecondary,
  },
  composer: {
    marginTop: spacing.md,
    gap: spacing.sm,
  },
  composerInput: {
    minHeight: 44,
    maxHeight: 88,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: borderRadius.xl,
    backgroundColor: 'rgba(12,18,32,0.72)',
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: 'rgba(56,189,248,0.18)',
    color: colors.dark.text,
    ...typography.bodySmall,
  },
  composerBtn: {
    alignSelf: 'flex-start',
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: borderRadius.full,
    backgroundColor: colors.primary.teal,
  },
  composerBtnDisabled: {
    opacity: 0.45,
  },
  composerBtnText: {
    ...typography.caption,
    color: '#FFF',
    fontWeight: '700',
  },
  signInCta: {
    marginTop: spacing.md,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    alignSelf: 'flex-start',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: borderRadius.full,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: 'rgba(56,189,248,0.25)',
    backgroundColor: 'rgba(12,18,32,0.55)',
  },
  signInCtaText: {
    ...typography.caption,
    color: colors.primary.teal,
    fontWeight: '600',
  },
  emptyBox: {
    minHeight: BOARD_SURFACE_HEIGHT,
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.xs,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
  },
  emptyTitle: {
    ...typography.bodySmall,
    color: colors.dark.text,
    fontWeight: '600',
    textAlign: 'center',
  },
  emptyBody: {
    ...typography.caption,
    color: colors.dark.textMuted,
    textAlign: 'center',
  },
  managePreview: {
    ...typography.bodySmall,
    color: colors.dark.textSecondary,
    fontStyle: 'italic',
    lineHeight: 20,
    marginBottom: spacing.md,
  },
  manageActions: {
    gap: spacing.xs,
    paddingBottom: spacing.sm,
  },
  manageRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.sm,
    borderRadius: borderRadius.lg,
    backgroundColor: 'rgba(12,18,32,0.45)',
    borderWidth: 1,
    borderColor: colors.dark.borderInner,
  },
  manageRowLabel: {
    ...typography.bodySmall,
    color: colors.dark.text,
    fontWeight: '600',
    flex: 1,
  },
  manageRowLabelDestructive: {
    color: colors.status.error,
  },
});
