import React, {
  forwardRef,
  useCallback,
  useEffect,
  useImperativeHandle,
  useMemo,
  useRef,
  useState,
} from 'react';
import {
  ActivityIndicator,
  Image as RNImage,
  Platform,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
  useWindowDimensions,
  type LayoutChangeEvent,
  type NativeSyntheticEvent,
  type StyleProp,
  type TextInputProps,
  type TextInputSelectionChangeEventData,
  type ViewStyle,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { profilesService } from '@/services/supabase/profiles';
import { colors, borderRadius, layout, shadows, spacing } from '@/theme';
import { profileHandleDisplay } from '@/utils/profileHandle';
import type { UserProfile } from '@/types';

export interface MentionRef {
  focus: () => void;
  blur: () => void;
  /** Pulls the uuids of every @handle currently present in the text. */
  getMentionedUserIds: () => string[];
  /** Sync native + JS selection (e.g. edit composer caret at end on open). */
  setSelection: (start: number, end: number) => void;
}

interface Props extends Omit<TextInputProps, 'onChangeText' | 'value' | 'ref'> {
  value: string;
  onChangeText: (next: string) => void;
  /** When the user picks a suggestion from the dropdown. */
  onMention?: (user: UserProfile) => void;
  /** When the full set of matched-in-text mentions changes. */
  onMentionsChange?: (users: UserProfile[]) => void;
  /**
   * Outer wrapper around the TextInput (popover anchors to this width).
   * Use `{ flex: 1, minWidth: 0 }` when this sits beside a send button in a row.
   */
  wrapperStyle?: StyleProp<ViewStyle>;
  /** Extra wrapper style for the suggestion popover. */
  suggestionsStyle?: StyleProp<ViewStyle>;
  /** Hide the popover entirely (useful when parent manages overlay). */
  disableSuggestions?: boolean;
  /** Override how many suggestions are shown (default 5). */
  maxSuggestions?: number;
}

const HANDLE_TOKEN_RE = /@([a-zA-Z0-9_.]{1,30})/g;
// Matches the "active" token (the one the caret is currently inside) — the
// last @word before the caret with no whitespace separating them.
const ACTIVE_TOKEN_RE = /@([a-zA-Z0-9_.]{0,30})$/;

/**
 * Drop-in TextInput replacement that surfaces a live @handle suggestion list
 * while the user types. On pick, the partial @fragment is replaced with
 * `@username ` and the caret is moved past it. The component also reports
 * the resolved profile uuids so the submit flow can attach mentions to the
 * outgoing row (though the DB trigger in migration 049 parses server-side
 * regardless — this is purely for optimistic UI).
 */
export const MentionAutocomplete = forwardRef<MentionRef, Props>(
  function MentionAutocomplete(
    {
      value,
      onChangeText,
      onMention,
      onMentionsChange,
      wrapperStyle,
      suggestionsStyle,
      disableSuggestions = false,
      maxSuggestions = 5,
      onSelectionChange,
      style,
      ...rest
    },
    ref,
  ) {
    const inputRef = useRef<TextInput | null>(null);
    const [selection, setSelection] = useState<{ start: number; end: number }>({
      start: value.length,
      end: value.length,
    });
    const [suggestions, setSuggestions] = useState<UserProfile[]>([]);
    const [loading, setLoading] = useState(false);
    const [resolvedCache, setResolvedCache] = useState<Record<string, UserProfile>>(
      {},
    );
    const activeTokenRef = useRef<{ start: number; end: number; handle: string } | null>(
      null,
    );
    const [shell, setShell] = useState({ w: 0, h: 0 });
    const onShellLayout = useCallback((e: LayoutChangeEvent) => {
      const { width, height } = e.nativeEvent.layout;
      setShell((prev) => {
        if (Math.abs(prev.w - width) < 1 && Math.abs(prev.h - height) < 1) return prev;
        return { w: width, h: height };
      });
    }, []);

    useImperativeHandle(ref, () => ({
      focus: () => inputRef.current?.focus(),
      blur: () => inputRef.current?.blur(),
      getMentionedUserIds: () => collectMentionedIds(value, resolvedCache),
      setSelection: (start: number, end: number) => {
        inputRef.current?.setNativeProps?.({ selection: { start, end } });
        setSelection({ start, end });
      },
    }));

    // Re-emit mentions whenever the text or resolved cache changes.
    useEffect(() => {
      if (!onMentionsChange) return;
      const users = collectMentionedUsers(value, resolvedCache);
      onMentionsChange(users);
    }, [value, resolvedCache, onMentionsChange]);

    const activeFragment = useMemo(() => {
      if (disableSuggestions) return null;
      const caret = Math.min(selection.start, value.length);
      const before = value.slice(0, caret);
      const m = before.match(ACTIVE_TOKEN_RE);
      if (!m) {
        activeTokenRef.current = null;
        return null;
      }
      const matchStart = before.length - m[0].length;
      activeTokenRef.current = {
        start: matchStart,
        end: caret,
        handle: m[1].toLowerCase(),
      };
      return m[1];
    }, [value, selection, disableSuggestions]);

    // Debounced fetch of suggestions when the fragment changes.
    useEffect(() => {
      if (activeFragment === null) {
        setSuggestions([]);
        setLoading(false);
        return;
      }
      // Require at least one character after "@" before hitting the network,
      // but show a gentle loading/empty state as soon as "@" is typed.
      if (activeFragment.length === 0) {
        setSuggestions([]);
        setLoading(false);
        return;
      }
      let cancelled = false;
      setLoading(true);
      const t = setTimeout(async () => {
        try {
          const raw = await profilesService.search(activeFragment);
          if (cancelled) return;
          const frag = activeFragment.toLowerCase();
          const sorted = [...raw].sort((a, b) => {
            const ra = mentionRank(a, frag);
            const rb = mentionRank(b, frag);
            if (ra !== rb) return ra - rb;
            return (b.followerCount ?? 0) - (a.followerCount ?? 0);
          });
          const results = sorted.slice(0, maxSuggestions);
          setSuggestions(results);
          // Pre-populate the resolvedCache with any match whose handle matches
          // exactly — this lets us report mentions immediately.
          if (results.length) {
            setResolvedCache((prev) => {
              const next = { ...prev };
              for (const r of results) {
                if (r.username) next[r.username.toLowerCase()] = r;
              }
              return next;
            });
          }
        } catch {
          if (!cancelled) setSuggestions([]);
        } finally {
          if (!cancelled) setLoading(false);
        }
      }, 180);
      return () => {
        cancelled = true;
        clearTimeout(t);
      };
    }, [activeFragment, maxSuggestions]);

    const handleSelectionChange = useCallback(
      (e: NativeSyntheticEvent<TextInputSelectionChangeEventData>) => {
        setSelection(e.nativeEvent.selection);
        onSelectionChange?.(e);
      },
      [onSelectionChange],
    );

    const insertMention = useCallback(
      (user: UserProfile) => {
        const handle = user.username?.trim().toLowerCase();
        if (!handle) return;

        const token = activeTokenRef.current;
        const before = token ? value.slice(0, token.start) : value;
        const after = token ? value.slice(token.end) : '';
        const insert = `@${handle} `;
        const nextText = `${before}${insert}${after}`;
        const caret = before.length + insert.length;

        onChangeText(nextText);
        setResolvedCache((prev) => ({ ...prev, [handle]: user }));
        onMention?.(user);

        setSuggestions([]);
        activeTokenRef.current = null;

        // Move the caret to the end of the inserted handle on the next tick,
        // after React commits the updated value.
        requestAnimationFrame(() => {
          inputRef.current?.setNativeProps?.({
            selection: { start: caret, end: caret },
          });
          setSelection({ start: caret, end: caret });
        });
      },
      [value, onChangeText, onMention],
    );

    const { width: windowWidth } = useWindowDimensions();
    const maxScreenPopover = Math.min(windowWidth - layout.screenPadding * 2, 420);
    /** Match composer width so ancestors with overflow:hidden don't clip the label column. */
    const popoverWidth =
      shell.w > 0 ? Math.min(maxScreenPopover, Math.max(Math.round(shell.w), 160)) : maxScreenPopover;
    /** Anchor bottom edge above the TextInput so the sheet opens upward (keyboard-safe). */
    const popoverBottomOffset = shell.h > 0 ? shell.h + 8 : 52;

    const showSuggestions =
      !disableSuggestions &&
      activeFragment !== null &&
      activeFragment.length > 0 &&
      (loading || suggestions.length > 0);

    return (
      <View style={[styles.wrap, wrapperStyle]} onLayout={onShellLayout}>
        <TextInput
          ref={inputRef}
          {...rest}
          value={value}
          onChangeText={onChangeText}
          onSelectionChange={handleSelectionChange}
          style={style}
          textAlignVertical={
            rest.textAlignVertical ??
            (Platform.OS === 'android' && rest.multiline ? 'top' : undefined)
          }
        />

        {showSuggestions ? (
          <View
            style={[
              styles.popover,
              {
                width: popoverWidth,
                bottom: popoverBottomOffset,
              },
              platformPopoverLift,
              suggestionsStyle,
            ]}
          >
            <View style={styles.popoverHeader}>
              <Ionicons name="at" size={11} color={colors.primary.teal} />
              <Text style={styles.popoverLabel}>
                Tag someone
              </Text>
              {loading ? (
                <ActivityIndicator
                  size="small"
                  color={colors.primary.teal}
                  style={styles.popoverSpinner}
                />
              ) : null}
            </View>
            <View style={styles.suggestionList} pointerEvents="box-none">
              {suggestions.map((item) => (
                <SuggestionRow key={item.id} user={item} onPick={insertMention} />
              ))}
              {!loading && suggestions.length === 0 ? (
                <Text style={styles.emptyText}>No matches yet.</Text>
              ) : null}
            </View>
          </View>
        ) : null}
      </View>
    );
  },
);

function mentionRank(u: UserProfile, frag: string): number {
  const au = (u.username ?? '').toLowerCase();
  const dn = (u.displayName ?? '').toLowerCase();
  const fn = (u.firstName ?? '').toLowerCase();
  if (au.startsWith(frag)) return 0;
  if (dn.startsWith(frag)) return 1;
  if (fn.startsWith(frag)) return 2;
  if (dn.includes(frag)) return 3;
  if (fn.includes(frag)) return 4;
  return 6;
}

const platformPopoverLift = Platform.select<ViewStyle>({
  android: { elevation: 28, zIndex: 500 },
  ios: { zIndex: 500 },
  default: { zIndex: 10000 },
});

function mentionRowPrimaryLabel(user: UserProfile): string {
  const dn = (user.displayName || '').trim();
  if (dn) return dn;
  const fn = (user.firstName || '').trim();
  if (fn) return fn;
  const u = (user.username || '').trim();
  return u ? `@${u}` : 'Someone';
}

function SuggestionRow({
  user,
  onPick,
}: {
  user: UserProfile;
  onPick: (u: UserProfile) => void;
}) {
  const handle = (user.username ?? '').trim();
  const primary = mentionRowPrimaryLabel(user);
  const thumb = user.avatarUrl?.trim();
  const secondary = profileHandleDisplay(user);

  return (
    <TouchableOpacity
      activeOpacity={0.75}
      onPress={() => onPick(user)}
      style={styles.rowTouchable}
      accessibilityRole="button"
      accessibilityLabel={handle ? `Mention ${primary}, @${handle}` : `Mention ${primary}`}
    >
      <View style={styles.rowInner}>
        <View style={styles.suggestionAvatarWrap}>
          {thumb ? (
            <RNImage source={{ uri: thumb }} style={styles.suggestionAvatarImg} resizeMode="cover" />
          ) : (
            <View style={[styles.suggestionAvatarImg, styles.avatarPlaceholderFill]}>
              <Ionicons name="person" size={16} color={colors.dark.textMuted} />
            </View>
          )}
        </View>
        <View style={styles.rowMeta}>
          <Text style={styles.displayName} numberOfLines={1} allowFontScaling>
            {primary}
          </Text>
          <Text style={styles.handle} numberOfLines={1} allowFontScaling>
            {secondary}
          </Text>
        </View>
        {user.isVerified ? (
          <Ionicons name="checkmark-circle" size={13} color={colors.primary.teal} style={styles.verifiedIcon} />
        ) : null}
      </View>
    </TouchableOpacity>
  );
}

function collectMentionedUsers(
  text: string,
  cache: Record<string, UserProfile>,
): UserProfile[] {
  const handles = extractHandles(text);
  const out: UserProfile[] = [];
  const seen = new Set<string>();
  for (const h of handles) {
    const u = cache[h];
    if (u && !seen.has(u.id)) {
      seen.add(u.id);
      out.push(u);
    }
  }
  return out;
}

function collectMentionedIds(
  text: string,
  cache: Record<string, UserProfile>,
): string[] {
  return collectMentionedUsers(text, cache).map((u) => u.id);
}

/** Public helper — same regex as the server trigger + `CaptionWithMentions`. */
export function extractHandles(text: string): string[] {
  if (!text) return [];
  const out: string[] = [];
  const seen = new Set<string>();
  let m: RegExpExecArray | null;
  // Re-create to avoid retaining lastIndex between calls.
  const re = new RegExp(HANDLE_TOKEN_RE.source, 'g');
  while ((m = re.exec(text)) !== null) {
    const h = m[1].toLowerCase();
    if (h.length < 3) continue;
    if (!seen.has(h)) {
      seen.add(h);
      out.push(h);
    }
  }
  return out;
}

const styles = StyleSheet.create({
  wrap: {
    position: 'relative',
    zIndex: 40,
    /** Popover is often wider than the TextInput — allow it to extend without clipping. */
    overflow: 'visible',
  },
  popover: {
    position: 'absolute',
    left: 0,
    maxHeight: 240,
    backgroundColor: colors.dark.elevated,
    borderRadius: borderRadius.lg,
    borderWidth: 1,
    borderColor: colors.dark.borderSubtle,
    overflow: 'hidden',
    ...shadows.card,
  },
  popoverHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.md,
    paddingVertical: 8,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.dark.borderSubtle,
    backgroundColor: 'rgba(20,184,166,0.05)',
  },
  popoverLabel: {
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 0.5,
    textTransform: 'uppercase',
    color: colors.primary.teal,
    flex: 1,
    marginLeft: 6,
  },
  popoverSpinner: {
    marginLeft: 'auto',
  },
  suggestionList: {
    maxHeight: 220,
    alignSelf: 'stretch',
    width: '100%',
  },
  /** TouchableOpacity lays out reliably with row children on iOS; Pressable often shrink-wraps and collapses `flex:1` labels. */
  rowTouchable: {
    alignSelf: 'stretch',
    width: '100%',
  },
  rowInner: {
    flexDirection: 'row',
    alignItems: 'center',
    width: '100%',
    paddingHorizontal: spacing.md,
    paddingVertical: 10,
  },
  /** Keeps mention rows compact — uncapped ring art must not steal row width. */
  suggestionAvatarWrap: {
    width: 36,
    height: 36,
    flexShrink: 0,
    marginRight: 12,
    borderRadius: 18,
    overflow: 'hidden',
    backgroundColor: colors.dark.cardAlt,
    zIndex: 1,
  },
  suggestionAvatarImg: {
    width: 36,
    height: 36,
    borderRadius: 18,
  },
  avatarPlaceholderFill: {
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.dark.cardAlt,
  },
  rowMeta: {
    flex: 1,
    minWidth: 0,
    justifyContent: 'center',
    zIndex: 2,
  },
  displayName: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.dark.text,
    letterSpacing: -0.15,
  },
  handle: {
    marginTop: 2,
    fontSize: 12,
    fontWeight: '600',
    color: colors.primary.teal,
    letterSpacing: 0.15,
  },
  verifiedIcon: {
    flexShrink: 0,
    marginLeft: 6,
  },
  emptyText: {
    paddingHorizontal: spacing.md,
    paddingVertical: 10,
    fontSize: 12,
    color: colors.dark.textMuted,
  },
});
