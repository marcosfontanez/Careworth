/**
 * Shared hashtag composer input — used by image carousel, video composer,
 * text post composer, and (optionally) any other create flow. Replaces the
 * raw `TextInput` patterns previously used in each composer with a single
 * component that enforces the product rules from Creator Hub audit #8:
 *
 *   • Maximum 5 hashtags per post.
 *   • Lowercase, alphanumeric + underscore only (the leading `#` is presentational).
 *   • Live autocomplete suggestions from `public.search_hashtags(prefix, limit)`.
 *   • Suggestion rows show the usage_count badge.
 *   • Duplicates (case-insensitive) are silently blocked.
 *
 * The component is fully controlled via `value`/`onChange` (string[]). The
 * composer state stays plain `string[]` so persistence + Supabase inserts
 * remain unchanged from before.
 */

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { View, Text, StyleSheet, TextInput, TouchableOpacity, ActivityIndicator } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors, borderRadius, spacing, typography } from '@/theme';
import {
  HASHTAG_MAX,
  normalizeHashtag,
  addHashtagToList,
  searchHashtags,
  formatHashtagUsage,
  type HashtagSuggestion,
} from '@/lib/hashtags';

export type HashtagInputProps = {
  value: string[];
  onChange: (next: string[]) => void;
  /** Disabled state (e.g. while a post is uploading). */
  disabled?: boolean;
  /** Optional accent color for chips / focus borders. */
  accent?: string;
  /** Override the hint/help text. */
  placeholder?: string;
  /** Maximum tags allowed; defaults to product rule of 5. */
  maxTags?: number;
  /** When true, the suggestions list will not call the RPC (offline / preview). */
  suggestionsDisabled?: boolean;
  /** Compact mode for tight spaces (e.g. Circle composer). */
  compact?: boolean;
};

const SUGGEST_DEBOUNCE_MS = 220;

export function HashtagInput({
  value,
  onChange,
  disabled = false,
  accent = colors.primary.teal,
  placeholder = 'Type to search — #NurseLife, #ICU, #WorkDay',
  maxTags = HASHTAG_MAX,
  suggestionsDisabled = false,
  compact = false,
}: HashtagInputProps) {
  const [draft, setDraft] = useState('');
  const [suggestions, setSuggestions] = useState<HashtagSuggestion[]>([]);
  const [loadingSuggestions, setLoadingSuggestions] = useState(false);
  const [focused, setFocused] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const requestIdRef = useRef(0);

  const tags = useMemo(() => value.map((t) => normalizeHashtag(t)).filter(Boolean), [value]);
  const atCap = tags.length >= maxTags;

  /** Debounced suggestion fetch — never blocks the keyboard. */
  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    const probe = normalizeHashtag(draft);
    if (!probe || suggestionsDisabled || atCap || !focused) {
      setSuggestions([]);
      setLoadingSuggestions(false);
      return;
    }
    setLoadingSuggestions(true);
    const id = ++requestIdRef.current;
    debounceRef.current = setTimeout(async () => {
      const rows = await searchHashtags(probe, 8);
      if (id !== requestIdRef.current) return;
      const existing = new Set(tags);
      setSuggestions(rows.filter((s) => !existing.has(s.tag)));
      setLoadingSuggestions(false);
    }, SUGGEST_DEBOUNCE_MS);
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [draft, suggestionsDisabled, atCap, focused, tags]);

  const commitDraft = useCallback(() => {
    const next = addHashtagToList(tags, draft);
    if (next !== tags) onChange(next);
    setDraft('');
  }, [draft, tags, onChange]);

  const handleSubmitEditing = useCallback(() => {
    commitDraft();
  }, [commitDraft]);

  const handleChange = useCallback(
    (next: string) => {
      // If user typed a space / comma / # mid-tag, treat as terminator and commit current draft.
      if (/[\s,]/.test(next)) {
        const cleaned = next.replace(/[\s,]+$/g, '');
        if (cleaned.length > 0) {
          const merged = addHashtagToList(tags, cleaned);
          if (merged !== tags) onChange(merged);
        }
        setDraft('');
        return;
      }
      // Strip leading # so user can type either "nurse" or "#nurse" naturally.
      setDraft(next.replace(/^#+/, ''));
    },
    [tags, onChange],
  );

  const handleRemove = useCallback(
    (tag: string) => {
      onChange(tags.filter((t) => t !== tag));
    },
    [tags, onChange],
  );

  const handlePickSuggestion = useCallback(
    (tag: string) => {
      const next = addHashtagToList(tags, tag);
      if (next !== tags) onChange(next);
      setDraft('');
      setSuggestions([]);
    },
    [tags, onChange],
  );

  return (
    <View style={[styles.root, compact && styles.rootCompact]}>
      <View style={[styles.frame, { borderColor: focused ? accent : 'rgba(148,163,184,0.22)' }]}>
        <View style={styles.chipsRow}>
          {tags.map((tag) => (
            <View
              key={tag}
              style={[styles.chip, { borderColor: `${accent}55`, backgroundColor: `${accent}14` }]}
            >
              <Text style={[styles.chipText, { color: accent }]}>#{tag}</Text>
              <TouchableOpacity
                onPress={() => handleRemove(tag)}
                disabled={disabled}
                hitSlop={6}
                accessibilityRole="button"
                accessibilityLabel={`Remove hashtag ${tag}`}
              >
                <Ionicons name="close-circle" size={16} color={accent} />
              </TouchableOpacity>
            </View>
          ))}
          {!atCap ? (
            <View style={styles.inputWrap}>
              <Text style={[styles.inputHash, { color: focused ? accent : colors.dark.textMuted }]}>#</Text>
              <TextInput
                style={styles.input}
                value={draft}
                onChangeText={handleChange}
                onSubmitEditing={handleSubmitEditing}
                onFocus={() => setFocused(true)}
                onBlur={() => {
                  setFocused(false);
                  commitDraft();
                }}
                placeholder={tags.length === 0 ? placeholder : 'add another'}
                placeholderTextColor={colors.dark.textMuted}
                editable={!disabled}
                autoCapitalize="none"
                autoCorrect={false}
                returnKeyType="done"
                blurOnSubmit={false}
                maxLength={48}
              />
            </View>
          ) : null}
        </View>
        <View style={styles.metaRow}>
          <Text style={styles.metaText}>
            {atCap
              ? `Max ${maxTags} hashtags — remove one to add another.`
              : `${tags.length}/${maxTags} hashtags`}
          </Text>
          {loadingSuggestions ? <ActivityIndicator size="small" color={accent} /> : null}
        </View>
      </View>

      {!atCap && focused && (suggestions.length > 0 || (draft.length > 0 && !loadingSuggestions)) ? (
        <View style={[styles.suggestPanel, { borderColor: `${accent}33` }]}>
          {suggestions.length === 0 && draft.length > 0 && !loadingSuggestions ? (
            <Text style={styles.suggestEmpty}>
              No tag yet — press <Text style={{ color: accent }}>return</Text> to add #{normalizeHashtag(draft)}
            </Text>
          ) : null}
          {suggestions.map((s) => (
            <TouchableOpacity
              key={s.tag}
              style={styles.suggestRow}
              onPress={() => handlePickSuggestion(s.tag)}
              activeOpacity={0.85}
              accessibilityRole="button"
              accessibilityLabel={`Use hashtag ${s.tag}, ${s.usageCount} posts`}
            >
              <Text style={styles.suggestTag}>
                <Text style={{ color: accent }}>#</Text>
                {s.tag}
              </Text>
              <Text style={styles.suggestCount}>{formatHashtagUsage(s.usageCount)}</Text>
            </TouchableOpacity>
          ))}
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  root: { width: '100%' },
  rootCompact: {},
  frame: {
    borderWidth: 1,
    borderRadius: borderRadius.lg,
    paddingHorizontal: 12,
    paddingVertical: 10,
    backgroundColor: 'rgba(15,23,42,0.55)',
    gap: 8,
  },
  chipsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    gap: 6,
  },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 4,
    paddingHorizontal: 8,
    borderRadius: borderRadius.full,
    borderWidth: 1,
  },
  chipText: {
    fontSize: 13,
    fontWeight: '800',
    letterSpacing: -0.1,
  },
  inputWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    minWidth: 140,
    flexGrow: 1,
    paddingHorizontal: 4,
  },
  inputHash: { fontSize: 14, fontWeight: '800', marginRight: 2 },
  input: {
    flex: 1,
    fontSize: 14,
    color: colors.dark.text,
    paddingVertical: 4,
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  metaText: {
    ...typography.caption,
    color: colors.dark.textMuted,
    fontWeight: '600',
  },
  suggestPanel: {
    marginTop: 8,
    borderRadius: borderRadius.lg,
    borderWidth: 1,
    backgroundColor: 'rgba(15,23,42,0.92)',
    overflow: 'hidden',
  },
  suggestRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.md,
    paddingVertical: 10,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: 'rgba(148,163,184,0.14)',
  },
  suggestTag: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.dark.text,
  },
  suggestCount: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.dark.textMuted,
  },
  suggestEmpty: {
    paddingHorizontal: spacing.md,
    paddingVertical: 10,
    fontSize: 12,
    color: colors.dark.textMuted,
  },
});
