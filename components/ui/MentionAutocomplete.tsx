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
  FlatList,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
  type NativeSyntheticEvent,
  type StyleProp,
  type TextInputProps,
  type TextInputSelectionChangeEventData,
  type ViewStyle,
} from 'react-native';
import { Image as ExpoImage } from 'expo-image';
import { Ionicons } from '@expo/vector-icons';
import { profilesService } from '@/services/supabase/profiles';
import { colors, borderRadius, shadows, spacing } from '@/theme';
import type { UserProfile } from '@/types';

export interface MentionRef {
  focus: () => void;
  blur: () => void;
  /** Pulls the uuids of every @handle currently present in the text. */
  getMentionedUserIds: () => string[];
}

interface Props extends Omit<TextInputProps, 'onChangeText' | 'value' | 'ref'> {
  value: string;
  onChangeText: (next: string) => void;
  /** When the user picks a suggestion from the dropdown. */
  onMention?: (user: UserProfile) => void;
  /** When the full set of matched-in-text mentions changes. */
  onMentionsChange?: (users: UserProfile[]) => void;
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

    useImperativeHandle(ref, () => ({
      focus: () => inputRef.current?.focus(),
      blur: () => inputRef.current?.blur(),
      getMentionedUserIds: () => collectMentionedIds(value, resolvedCache),
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
          const results = await profilesService.searchByHandle(
            activeFragment,
            maxSuggestions,
          );
          if (cancelled) return;
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

    const showSuggestions =
      !disableSuggestions &&
      activeFragment !== null &&
      activeFragment.length > 0 &&
      (loading || suggestions.length > 0);

    return (
      <View style={styles.wrap}>
        <TextInput
          ref={inputRef}
          {...rest}
          value={value}
          onChangeText={onChangeText}
          onSelectionChange={handleSelectionChange}
          style={style}
        />

        {showSuggestions ? (
          <View style={[styles.popover, suggestionsStyle]}>
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
            <FlatList
              data={suggestions}
              keyboardShouldPersistTaps="handled"
              keyExtractor={(u) => u.id}
              renderItem={({ item }) => (
                <SuggestionRow user={item} onPick={insertMention} />
              )}
              ListEmptyComponent={
                !loading ? (
                  <Text style={styles.emptyText}>No matches yet.</Text>
                ) : null
              }
            />
          </View>
        ) : null}
      </View>
    );
  },
);

function SuggestionRow({
  user,
  onPick,
}: {
  user: UserProfile;
  onPick: (u: UserProfile) => void;
}) {
  const handle = user.username ?? '';
  return (
    <Pressable
      onPress={() => onPick(user)}
      style={({ pressed }) => [styles.row, pressed && styles.rowPressed]}
      accessibilityRole="button"
      accessibilityLabel={`Mention ${user.displayName}`}
    >
      {user.avatarUrl ? (
        <ExpoImage source={{ uri: user.avatarUrl }} style={styles.avatar} contentFit="cover" />
      ) : (
        <View style={[styles.avatar, styles.avatarPlaceholder]}>
          <Ionicons name="person" size={14} color={colors.dark.textMuted} />
        </View>
      )}
      <View style={styles.rowMeta}>
        <Text style={styles.displayName} numberOfLines={1}>
          {user.displayName}
        </Text>
        <Text style={styles.handle} numberOfLines={1}>
          @{handle}
        </Text>
      </View>
      {user.isVerified ? (
        <Ionicons name="checkmark-circle" size={13} color={colors.primary.teal} />
      ) : null}
    </Pressable>
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
  },
  popover: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: -4,
    transform: [{ translateY: 0 }],
    marginTop: 6,
    maxHeight: 240,
    backgroundColor: colors.dark.elevated,
    borderRadius: borderRadius.lg,
    borderWidth: 1,
    borderColor: colors.dark.borderSubtle,
    overflow: 'hidden',
    zIndex: 20,
    ...shadows.card,
  },
  popoverHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
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
  },
  popoverSpinner: {
    marginLeft: 'auto',
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingHorizontal: spacing.md,
    paddingVertical: 8,
  },
  rowPressed: {
    backgroundColor: 'rgba(255,255,255,0.05)',
  },
  avatar: {
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: colors.dark.cardAlt,
  },
  avatarPlaceholder: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  rowMeta: {
    flex: 1,
    minWidth: 0,
  },
  displayName: {
    fontSize: 13.5,
    fontWeight: '700',
    color: colors.dark.text,
    letterSpacing: -0.1,
  },
  handle: {
    marginTop: 1,
    fontSize: 11.5,
    fontWeight: '600',
    color: colors.primary.teal,
    letterSpacing: 0.2,
  },
  emptyText: {
    paddingHorizontal: spacing.md,
    paddingVertical: 10,
    fontSize: 12,
    color: colors.dark.textMuted,
  },
});
