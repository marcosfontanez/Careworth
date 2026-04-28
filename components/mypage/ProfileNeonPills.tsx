import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { borderRadius } from '@/theme';

const BORDER_PRESETS: [string, string][] = [
  ['#14B8A6', '#EC4899'],
  ['#A855F7', '#14B8A6'],
  ['#38BDF8', '#EC4899'],
  ['#F472B6', '#22D3EE'],
];

interface Props {
  tags: string[];
}

/** Mock-style neon-lined ovals beside the avatar / name. */
export function ProfileNeonPills({ tags }: Props) {
  const list = tags.map((t) => t.trim()).filter(Boolean);
  if (!list.length) return null;

  return (
    <View style={styles.row}>
      {list.map((tag, i) => {
        const [a, b] = BORDER_PRESETS[i % BORDER_PRESETS.length];
        return (
          <LinearGradient
            key={`${tag}-${i}`}
            colors={[a, b]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.gradientRing}
          >
            <View style={styles.inner}>
              <Text
                style={styles.label}
                numberOfLines={1}
                ellipsizeMode="tail"
              >
                {tag}
              </Text>
            </View>
          </LinearGradient>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  /**
   * One-line row. Each pill gets `flexShrink: 1` so if the strings are
   * long enough to overflow, they truncate with ellipsis instead of
   * wrapping to a new line. Parent callers should already cap length
   * via `NEON_PILL_MAX_LEN` but this is a hard safety net.
   */
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 8,
  },
  gradientRing: {
    borderRadius: borderRadius.chip + 3,
    padding: 1.5,
    flexShrink: 1,
  },
  inner: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: borderRadius.chip,
    backgroundColor: 'rgba(6,14,26,0.92)',
  },
  label: {
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 0.2,
    color: 'rgba(255,255,255,0.94)',
    textShadowColor: 'rgba(20,184,166,0.35)',
    textShadowOffset: { width: 0, height: 0 },
    textShadowRadius: 8,
  },
});
