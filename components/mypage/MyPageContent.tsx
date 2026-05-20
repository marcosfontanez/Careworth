/**
 * Single source of truth for PulseVerse My Pulse layout (live profile + posts).
 *
 * Uses {@link PVPageBackground} for the same screen shell as Circles Discover.
 * Major blocks (search, stats, visitor CTAs, Current Vibe, My Pulse rail, Media Hub)
 * sit on {@link MyPulseGlassPanel} frosted glass for consistency with Creator Hub / Shop.
 *
 * Layout (top → bottom):
 *   1. Banner + floating back/more
 *   2. Profile Header (avatar, name, handle, neon tags, one-line intro)
 *   3. PulseStatsRow — three boxed cards (Followers · Following · Pulse Score)
 *   4. Visitor actions (Follow / Message / Share) — visitors only
 *   5. Current Vibe music player (owners can hide via Customize)
 *   6. My Pulse (composer chips + rolling 5 cards)
 *   7. Media Hub (videos / favorites / photos strip) — last, so visitors scroll
 *      through your story before browsing media.
 */
import React, { useMemo, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  ImageBackground,
  Alert,
  ActionSheetIOS,
  Platform,
  Pressable,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import {
  colors,
  borderRadius,
  typography,
  spacing,
  layout,
  tabBarScrollPaddingBottom,
  touchTarget,
  shadows,
  pulseverse,
} from '@/theme';
import { profileHandleDisplay } from '@/utils/profileHandle';
import { buildNeonPillTags } from '@/lib/buildNeonPillTags';
import { shareProfile } from '@/lib/share';
import { AvatarDisplay, pulseFrameFromUser } from '@/components/profile/AvatarBuilder';
import { FeaturedSoundCard } from '@/components/mypage/FeaturedSoundCard';
import { MediaHubSection } from '@/components/mypage/MediaHubSection';
import { useUnreadCount, useLinkedPostsMap } from '@/hooks/useQueries';
import { ProfileNeonPills } from '@/components/mypage/ProfileNeonPills';
import { MyPulseSection } from '@/components/mypage/MyPulseSection';
import { PulseStatsRow } from '@/components/mypage/PulseStatsRow';
import { PVPageBackground } from '@/components/pv/PVPageBackground';
import { PVSearchBarTrigger } from '@/components/pv/PVSearchBar';
import type { Post, ProfileUpdate, UserProfile } from '@/types';
import { postHasDemoCatalogMedia } from '@/utils/postPreviewMedia';
import { canVisitorSeeProfilePosts } from '@/utils/mypagePosts';
import { MyPulseGlassPanel } from '@/components/mypage/MyPulseGlassPanel';

/**
 * Compact hero avatar for My Pulse. Deliberately smaller than tab profile so
 * it can sit high on the banner and leave horizontal room for the name /
 * handle / neon pill column to its right (mock-accurate layout).
 */
const MY_PULSE_AVATAR_SIZE = 88;

export type MyPageContentProps = {
  user: UserProfile;
  profileUpdates: ProfileUpdate[];
  userPosts: Post[] | undefined;
  isOwner: boolean;
  isFollowing?: boolean;
  onToggleFollow?: () => void;
  onMessage?: () => void;
  onBlock?: () => void;
  /**
   * Auto-open the PulseHistorySheet on first mount — set from a deep-link
   * query param (e.g. a tier-up notification tapping through to
   * `/profile/:id?openPulseHistory=1`).
   */
  initialOpenPulseHistory?: boolean;
  /**
   * When true, the auto-opened history sheet also shows a prominent
   * "Share my tier" card at the top — set only by the tier-up
   * notification deep-link (`...&tierUp=1`). Regular taps on the pill
   * just open the sheet without the celebration card.
   */
  highlightShareTier?: boolean;
  /** Visitor: opt-in bell under portrait — notify when this user posts new content. */
  creatorPostNotificationsOn?: boolean;
  onToggleCreatorPostNotifications?: () => void;
  creatorPostNotificationsBusy?: boolean;
  /** Visitor: open Pulse Shop creator gifts (Sparks) for this profile. */
  onOpenCreatorGifts?: () => void;
};

export function MyPageContent({
  user,
  profileUpdates,
  userPosts,
  isOwner,
  isFollowing,
  onToggleFollow,
  onMessage,
  onBlock,
  initialOpenPulseHistory = false,
  highlightShareTier = false,
  creatorPostNotificationsOn = false,
  onToggleCreatorPostNotifications,
  creatorPostNotificationsBusy = false,
  onOpenCreatorGifts,
}: MyPageContentProps) {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  // Only query unread notifications for owners — visitors shouldn't trigger
  // a server round-trip when visiting another user's Pulse page.
  const { data: unreadCountRaw } = useUnreadCount();
  const unreadCount = isOwner ? unreadCountRaw ?? 0 : 0;

  const goToNotifications = useCallback(() => {
    router.push('/notifications');
  }, [router]);

  const postsVisibleOnProfile = useMemo(() => {
    const posts = userPosts ?? [];
    if (!canVisitorSeeProfilePosts(user, isOwner)) return [];
    return posts.filter((p) => !postHasDemoCatalogMedia(p));
  }, [userPosts, user, isOwner]);

  /**
   * Pins can link to ANY post — my own or someone else's. Collect the ids
   * that aren't already in `userPosts` and fan them out via `useLinkedPostsMap`
   * so Clip cards can show the original post's thumbnail, live like/comment
   * counts, and (most importantly) make the whole pin feel like a pointer
   * into the feed rather than a freshly-authored detail card. Without this
   * fetch, pins of other creators' posts display the static "0 likes, 0
   * comments" fallback that makes viewers think the pin is a new post.
   */
  const foreignLinkedIds = useMemo(() => {
    const mine = new Set((userPosts ?? []).map((p) => p.id));
    const out: string[] = [];
    for (const u of profileUpdates) {
      const id = u.linkedPostId?.trim();
      if (!id || mine.has(id)) continue;
      out.push(id);
    }
    return out;
  }, [profileUpdates, userPosts]);

  const linkedPostsMap = useLinkedPostsMap(foreignLinkedIds);

  /**
   * Resolve a linked post id → the full Post. Cards can then decide how to
   * preview it (static image vs paused first-frame video). Demo catalog
   * seeds are excluded so fake lorem posts don't leak into polished cards.
   */
  const resolveLinkedPost = useCallback(
    (postId: string) => {
      const own = (userPosts ?? []).find((x) => x.id === postId);
      const p = own ?? linkedPostsMap.get(postId);
      if (!p || postHasDemoCatalogMedia(p)) return undefined;
      return p;
    },
    [userPosts, linkedPostsMap],
  );

  const neonPillTags = useMemo(
    () => buildNeonPillTags({ identityTags: user.identityTags }),
    [user.identityTags],
  );
  const hasBanner = Boolean(user.bannerUrl?.trim());

  const openPageMenu = useCallback(() => {
    const share = () => shareProfile(user.id, user.displayName);

    if (isOwner) {
      const customize = () => router.push('/my-pulse-appearance');
      if (Platform.OS === 'ios') {
        ActionSheetIOS.showActionSheetWithOptions(
          {
            options: [
              'Share profile',
              'Customize My Pulse',
              'Settings',
              'Cancel',
            ],
            cancelButtonIndex: 3,
          },
          (i) => {
            if (i === 0) share();
            else if (i === 1) customize();
            else if (i === 2) router.push('/settings');
          },
        );
      } else {
        Alert.alert('My Pulse', undefined, [
          { text: 'Share profile', onPress: share },
          { text: 'Customize My Pulse', onPress: customize },
          { text: 'Settings', onPress: () => router.push('/settings') },
          { text: 'Cancel', style: 'cancel' },
        ]);
      }
      return;
    }

    const block = onBlock;
    if (Platform.OS === 'ios') {
      if (block) {
        ActionSheetIOS.showActionSheetWithOptions(
          {
            options: ['Share profile', 'Block', 'Cancel'],
            cancelButtonIndex: 2,
            destructiveButtonIndex: 1,
          },
          (i) => {
            if (i === 0) share();
            else if (i === 1) block();
          },
        );
      } else {
        ActionSheetIOS.showActionSheetWithOptions(
          {
            options: ['Share profile', 'Cancel'],
            cancelButtonIndex: 1,
          },
          (i) => {
            if (i === 0) share();
          },
        );
      }
    } else {
      Alert.alert(user.displayName, undefined, [
        { text: 'Share profile', onPress: share },
        ...(block
          ? [{ text: 'Block', style: 'destructive' as const, onPress: block }]
          : []),
        { text: 'Cancel', style: 'cancel' },
      ]);
    }
  }, [isOwner, onBlock, router, user.displayName, user.id]);

  const goBack = useCallback(() => {
    if (router.canGoBack()) router.back();
    else router.replace('/(tabs)/feed');
  }, [router]);

  /** Stack profiles (not My Pulse tab): show back to return to feed/previous. Tab owner has no back. */
  const showVisitorBack = !isOwner;

  return (
    <PVPageBackground style={styles.screen}>
      <ScrollView
        style={styles.scrollView}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: tabBarScrollPaddingBottom(insets.bottom) }}
      >
        {isOwner ? (
          <View
            style={{
              paddingHorizontal: layout.screenPadding,
              paddingTop: insets.top + spacing.sm,
              paddingBottom: spacing.sm,
            }}
          >
            <MyPulseGlassPanel padding={spacing.sm + 2} blurIntensity={38} cornerRadius={borderRadius.xl + 4}>
              <PVSearchBarTrigger
                placeholder="Search creators, circles, tags, sounds…"
                accessibilityLabel="Open search to find creators and follow"
                onPress={() => router.push('/search')}
              />
            </MyPulseGlassPanel>
          </View>
        ) : null}
        {/* Banner: no title header — float back (visitors) + menu only */}
        <View style={styles.coverWrap}>
          {hasBanner ? (
            <ImageBackground
              source={{ uri: user.bannerUrl!.trim() }}
              style={styles.coverImg}
              imageStyle={styles.coverImgStyle}
            >
              <LinearGradient
                colors={[
                  'rgba(6,14,26,0.35)',
                  'rgba(6,14,26,0.55)',
                  'rgba(6,14,26,0.82)',
                ]}
                pointerEvents="none"
                style={StyleSheet.absoluteFill}
              />
              <BannerChrome
                topInset={insets.top}
                showBack={showVisitorBack}
                onBack={goBack}
                onMenu={openPageMenu}
                onNotifications={isOwner ? goToNotifications : undefined}
                unreadCount={unreadCount}
              />
            </ImageBackground>
          ) : (
            <LinearGradient
              colors={[
                colors.dark.bg,
                colors.dark.cardAlt,
                `${colors.primary.teal}22`,
              ]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.coverImg}
            >
              <LinearGradient
                colors={[
                  'rgba(6,14,26,0.25)',
                  'rgba(6,14,26,0.5)',
                  'rgba(6,14,26,0.78)',
                ]}
                pointerEvents="none"
                style={StyleSheet.absoluteFill}
              />
              <BannerChrome
                topInset={insets.top}
                showBack={showVisitorBack}
                onBack={goBack}
                onMenu={openPageMenu}
                onNotifications={isOwner ? goToNotifications : undefined}
                unreadCount={unreadCount}
              />
            </LinearGradient>
          )}
        </View>

        {/* Avatar left + bio column */}
        <View
          style={[styles.profileRow, { paddingHorizontal: layout.screenPadding }]}
        >
          <View style={styles.avatarStack}>
            {isOwner ? (
              <Pressable
                onPress={() => router.push('/my-pulse-appearance' as any)}
                onLongPress={() => router.push({ pathname: '/my-pulse-appearance', params: { focus: 'borders' } } as any)}
                delayLongPress={380}
                style={styles.avatarPressable}
                accessibilityRole="button"
                accessibilityHint="Customize your My Pulse look. Long press to jump to Pulse Shop borders."
              >
                <View style={styles.avatarInner}>
                  <AvatarDisplay
                    size={MY_PULSE_AVATAR_SIZE}
                    avatarUrl={user.avatarUrl}
                    prioritizeRemoteAvatar
                    showEdit={false}
                    ringColor={colors.primary.teal}
                    pulseFrame={pulseFrameFromUser(user.pulseAvatarFrame)}
                    showOnlineDot={isOwner}
                  />
                  <View style={styles.cameraFab}>
                    <Ionicons name="camera" size={15} color="#FFF" />
                  </View>
                </View>
              </Pressable>
            ) : (
              <View style={styles.avatarInner}>
                <AvatarDisplay
                  size={MY_PULSE_AVATAR_SIZE}
                  avatarUrl={user.avatarUrl}
                  prioritizeRemoteAvatar
                  showEdit={false}
                  ringColor={colors.primary.teal}
                  pulseFrame={pulseFrameFromUser(user.pulseAvatarFrame)}
                  showOnlineDot={false}
                />
                {onToggleFollow ? (
                  <TouchableOpacity
                    style={[
                      styles.followFab,
                      isFollowing ? styles.followFabFollowing : styles.followFabIdle,
                    ]}
                    onPress={onToggleFollow}
                    activeOpacity={0.85}
                    hitSlop={8}
                    accessibilityRole="button"
                    accessibilityLabel={
                      isFollowing ? `Unfollow ${user.displayName}` : `Follow ${user.displayName}`
                    }
                  >
                    <Ionicons
                      name={isFollowing ? 'checkmark' : 'add'}
                      size={16}
                      color="#FFF"
                    />
                  </TouchableOpacity>
                ) : null}
              </View>
            )}
            {!isOwner && onToggleCreatorPostNotifications ? (
              <TouchableOpacity
                style={[
                  styles.portraitNotifyBell,
                  creatorPostNotificationsBusy ? styles.portraitNotifyBellDisabled : null,
                ]}
                onPress={onToggleCreatorPostNotifications}
                disabled={creatorPostNotificationsBusy}
                activeOpacity={0.85}
                hitSlop={8}
                accessibilityRole="button"
                accessibilityLabel={
                  creatorPostNotificationsOn
                    ? 'Stop notifications for new posts from this user'
                    : 'Get notifications when this user posts new content'
                }
              >
                <Ionicons
                  name={creatorPostNotificationsOn ? 'notifications' : 'notifications-outline'}
                  size={20}
                  color={
                    creatorPostNotificationsOn ? colors.primary.teal : colors.dark.textMuted
                  }
                />
              </TouchableOpacity>
            ) : null}
          </View>

          <View style={styles.infoCol}>
            <View style={styles.nameRow}>
              <Text style={styles.displayName} numberOfLines={1}>
                {user.displayName}
              </Text>
              {user.isVerified ? (
                <Ionicons
                  name="checkmark-circle"
                  size={18}
                  color={colors.primary.royal}
                />
              ) : null}
            </View>
            <Text style={styles.handleInline} numberOfLines={1}>
              {profileHandleDisplay(user)}
            </Text>
            <ProfileNeonPills tags={neonPillTags} />
            {(user.bio?.trim() || isOwner) ? (
              <View style={styles.pageIntroWrap}>
                <Text
                  style={[
                    styles.pageIntro,
                    !user.bio?.trim() && isOwner ? styles.pageIntroPlaceholder : null,
                  ]}
                  numberOfLines={2}
                >
                  {user.bio?.trim()
                    ? user.bio.trim()
                    : isOwner
                      ? 'Add a short intro in Customize My Pulse (below your neon tags).'
                      : '\u00A0'}
                </Text>
              </View>
            ) : null}
          </View>
        </View>

        {/* Flat 3-stat strip — glass panel allows Pulse tooltip to extend upward */}
        <View style={{ paddingHorizontal: layout.screenPadding }}>
          <MyPulseGlassPanel
            padding={spacing.sm}
            blurIntensity={36}
            overflowVisible
            style={{ marginBottom: spacing.xs }}
          >
            <PulseStatsRow
              userId={user.id}
              displayName={user.displayName ?? user.username ?? undefined}
              isOwner={isOwner}
              followers={user.followerCount ?? 0}
              following={user.followingCount ?? 0}
              initialScore={user.pulseScoreCurrent ?? null}
              initialTier={user.pulseTier ?? null}
              initialHistoryOpen={initialOpenPulseHistory}
              highlightShareTier={highlightShareTier}
              onPressFollowers={() =>
                router.push(`/followers?userId=${user.id}&tab=followers`)
              }
              onPressFollowing={() =>
                router.push(`/followers?userId=${user.id}&tab=following`)
              }
            />
          </MyPulseGlassPanel>
        </View>

        {!isOwner ? (
          <View style={{ paddingHorizontal: layout.screenPadding, marginTop: spacing.sm + 2 }}>
            <MyPulseGlassPanel padding={spacing.sm} blurIntensity={32}>
              <View style={styles.visitorActions}>
                <TouchableOpacity
                  style={[
                    styles.followBtn,
                    isFollowing ? styles.followBtnOutline : styles.followBtnPrimary,
                  ]}
                  onPress={onToggleFollow}
                  activeOpacity={0.85}
                >
                  <Ionicons
                    name={isFollowing ? 'checkmark' : 'person-add'}
                    size={17}
                    color={isFollowing ? colors.primary.teal : '#FFF'}
                  />
                  <Text
                    style={[
                      styles.followBtnText,
                      isFollowing && { color: colors.primary.teal },
                    ]}
                  >
                    {isFollowing ? 'Following' : 'Follow'}
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.msgBtn} onPress={onMessage} activeOpacity={0.85}>
                  <Ionicons name="chatbubble-outline" size={17} color={colors.primary.teal} />
                  <Text style={styles.msgBtnText}>Message</Text>
                </TouchableOpacity>
                {onOpenCreatorGifts ? (
                  <TouchableOpacity
                    style={styles.shareIconBtn}
                    onPress={onOpenCreatorGifts}
                    activeOpacity={0.85}
                    accessibilityLabel="Send a gift with Sparks"
                  >
                    <Ionicons name="gift-outline" size={18} color={colors.primary.teal} />
                  </TouchableOpacity>
                ) : null}
                <TouchableOpacity
                  style={styles.shareIconBtn}
                  onPress={() => shareProfile(user.id, user.displayName)}
                  activeOpacity={0.85}
                  accessibilityLabel="Share profile"
                >
                  <Ionicons name="share-outline" size={18} color={colors.dark.text} />
                </TouchableOpacity>
              </View>
            </MyPulseGlassPanel>
          </View>
        ) : null}

        <View
          style={[
            styles.body,
            { paddingHorizontal: layout.screenPaddingWide, gap: spacing.lg },
          ]}
        >
          {!(isOwner && user.hidePulseMusicPlayerOnMyPage) ? (
            <MyPulseGlassPanel padding={spacing.md} blurIntensity={34}>
              <FeaturedSoundCard
                user={user}
                accent={pulseverse.electric}
                profileViewAutoplay
                alwaysShow={isOwner}
                onCustomize={
                  isOwner
                    ? () => router.push('/my-pulse-appearance?section=sound' as any)
                    : undefined
                }
              />
            </MyPulseGlassPanel>
          ) : null}

          <MyPulseGlassPanel padding={spacing.md} blurIntensity={34}>
            <MyPulseSection
              updates={profileUpdates}
              userId={user.id}
              readOnly={!isOwner}
              resolveLinkedPost={resolveLinkedPost}
            />
          </MyPulseGlassPanel>

          <MyPulseGlassPanel padding={spacing.md} blurIntensity={34}>
            <MediaHubSection
              userId={user.id}
              userPosts={postsVisibleOnProfile}
              profileUpdates={profileUpdates}
              isOwner={isOwner}
            />
          </MyPulseGlassPanel>
        </View>
      </ScrollView>
    </PVPageBackground>
  );
}

function BannerChrome({
  topInset,
  showBack,
  onBack,
  onMenu,
  onNotifications,
  unreadCount = 0,
}: {
  topInset: number;
  showBack: boolean;
  onBack: () => void;
  onMenu: () => void;
  onNotifications?: () => void;
  unreadCount?: number;
}) {
  // Right-side icon stack: [bell] (owner only) → [ellipsis]. The bell sits
  // 44pt to the left of the ellipsis to mirror the Circles tab treatment.
  const hasBell = !!onNotifications;
  const badgeLabel = unreadCount > 99 ? '99+' : String(unreadCount);

  return (
    <View style={styles.bannerChrome} pointerEvents="box-none">
      {showBack ? (
        <TouchableOpacity
          style={[
            styles.bannerIconBtn,
            styles.bannerFloat,
            { top: topInset + 8, left: 8 },
          ]}
          onPress={onBack}
          accessibilityLabel="Back"
        >
          <Ionicons name="chevron-back" size={22} color="#FFF" />
        </TouchableOpacity>
      ) : null}

      {hasBell ? (
        <TouchableOpacity
          style={[
            styles.bannerIconBtn,
            styles.bannerFloat,
            { top: topInset + 8, right: 52 },
          ]}
          onPress={onNotifications}
          activeOpacity={0.75}
          accessibilityRole="button"
          accessibilityLabel={
            unreadCount > 0
              ? `Notifications, ${unreadCount} unread`
              : 'Notifications'
          }
        >
          <Ionicons name="notifications-outline" size={22} color="#FFF" />
          {unreadCount > 0 ? (
            <View style={styles.bannerBellDot}>
              <Text style={styles.bannerBellDotText}>{badgeLabel}</Text>
            </View>
          ) : null}
        </TouchableOpacity>
      ) : null}

      <TouchableOpacity
        style={[
          styles.bannerIconBtn,
          styles.bannerFloat,
          { top: topInset + 8, right: 8 },
        ]}
        onPress={onMenu}
        accessibilityLabel="More options"
      >
        <Ionicons name="ellipsis-vertical" size={22} color="#FFF" />
      </TouchableOpacity>
      <View style={styles.bannerFill} pointerEvents="none" />
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  /** Web: default scroll view can paint an opaque surface and hide {@link PVPageBackground}. */
  scrollView: { flex: 1, backgroundColor: 'transparent' },
  coverWrap: { width: '100%', height: 200 },
  coverImg: { flex: 1 },
  coverImgStyle: { width: '100%', height: '100%' },
  bannerChrome: {
    flex: 1,
    position: 'relative',
    justifyContent: 'space-between',
  },
  bannerFill: { flex: 1 },
  bannerFloat: {
    position: 'absolute',
    zIndex: 2,
  },
  bannerIconBtn: {
    width: touchTarget.min,
    height: touchTarget.min,
    borderRadius: touchTarget.min / 2,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(0,0,0,0.35)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.12)',
  },
  bannerBellDot: {
    position: 'absolute',
    top: -3,
    right: -3,
    minWidth: 18,
    height: 18,
    paddingHorizontal: 4,
    borderRadius: 9,
    backgroundColor: colors.primary.teal,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1.5,
    borderColor: colors.dark.bg,
  },
  bannerBellDotText: {
    ...typography.caption,
    fontSize: 10,
    lineHeight: 12,
    fontWeight: '800',
    color: colors.dark.text,
    letterSpacing: 0.2,
  },
  /**
   * Avatar + info column row. Pulled up hard so the avatar sits on top of
   * the banner and the info column starts aligned with the avatar's TOP,
   * not its center — mirrors the mock.
   */
  profileRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.md,
    marginTop: -56,
    marginBottom: spacing.sm,
  },
  /** Column: avatar + optional bell under portrait (visitor). */
  avatarStack: {
    alignItems: 'center',
  },
  avatarInner: { position: 'relative' },
  avatarPressable: { alignSelf: 'flex-start' },
  cameraFab: {
    position: 'absolute',
    bottom: 2,
    right: 2,
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: colors.primary.teal,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: colors.dark.bg,
  },
  /**
   * Visitor-only follow/unfollow FAB pinned to the bottom-center of the
   * avatar circle. Horizontally centered (instead of right-aligned like
   * the owner's camera FAB) because it's the single primary action on
   * another user's page — the position reads as "tap the profile to follow".
   */
  followFab: {
    position: 'absolute',
    bottom: -4,
    left: '50%',
    marginLeft: -15, // half of width so the fab is centered on the circle's baseline
    width: 30,
    height: 30,
    borderRadius: 15,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2.5,
    borderColor: colors.dark.bg,
    ...shadows.cta,
  },
  followFabIdle: {
    backgroundColor: colors.primary.teal,
  },
  followFabFollowing: {
    // Muted teal when already following — still tappable to unfollow.
    backgroundColor: 'rgba(20,184,166,0.55)',
  },
  portraitNotifyBell: {
    marginTop: 10,
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255,255,255,0.06)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.12)',
  },
  portraitNotifyBellDisabled: {
    opacity: 0.45,
  },
  /** Starts at the avatar's TOP — name aligns with the top of the photo */
  infoCol: {
    flex: 1,
    minWidth: 0,
    paddingTop: 6,
  },
  nameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  displayName: {
    ...typography.screenTitle,
    fontSize: 22,
    lineHeight: 26,
    color: colors.dark.text,
    flexShrink: 1,
  },
  /** Handle sits right under the name — mirrors Instagram/TikTok stacking */
  handleInline: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.primary.teal,
    marginTop: 2,
    letterSpacing: 0.2,
  },
  pageIntroWrap: {
    marginTop: 10,
    paddingVertical: 2,
  },
  pageIntro: {
    fontSize: 13.5,
    lineHeight: 19,
    fontWeight: '600',
    color: colors.dark.textSecondary,
    letterSpacing: -0.1,
  },
  pageIntroPlaceholder: {
    color: colors.dark.textMuted,
    fontStyle: 'italic',
    fontWeight: '500',
  },
  visitorActions: {
    flexDirection: 'row',
    gap: spacing.sm,
    alignItems: 'center',
  },
  followBtn: {
    flex: 1.2,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 13,
    borderRadius: borderRadius.button,
  },
  followBtnPrimary: {
    backgroundColor: colors.primary.teal,
    ...shadows.cta,
  },
  followBtnOutline: {
    backgroundColor: colors.primary.teal + '10',
    borderWidth: 1.5,
    borderColor: colors.primary.teal + '55',
  },
  followBtnText: { fontSize: 15, fontWeight: '800', color: '#FFF' },
  msgBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 13,
    borderRadius: borderRadius.button,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.09)',
    backgroundColor: 'rgba(255,255,255,0.04)',
  },
  msgBtnText: {
    fontSize: 14,
    fontWeight: '800',
    color: colors.primary.teal,
    letterSpacing: -0.15,
  },
  shareIconBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.09)',
    backgroundColor: 'rgba(255,255,255,0.04)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  body: { paddingTop: layout.sectionGapLarge },
});
