import React, { useEffect, useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Linking } from 'react-native';
import { Image } from 'expo-image';
import { colors } from '@/theme';

interface LinkMeta {
  url: string;
  title: string;
  description?: string;
  image?: string;
}

const URL_REGEX = /https?:\/\/[^\s]+/g;

export function extractUrls(text: string): string[] {
  return text.match(URL_REGEX) ?? [];
}

export function LinkPreview({ url }: { url: string }) {
  const [meta, setMeta] = useState<LinkMeta | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function fetchMeta() {
      try {
        const res = await fetch(url, {
          method: 'GET',
          headers: { 'Accept': 'text/html' },
        });
        const html = await res.text();

        const titleMatch = html.match(/<meta[^>]*property="og:title"[^>]*content="([^"]*)"/) ??
                           html.match(/<title>([^<]*)<\/title>/);
        const descMatch = html.match(/<meta[^>]*property="og:description"[^>]*content="([^"]*)"/);
        const imgMatch = html.match(/<meta[^>]*property="og:image"[^>]*content="([^"]*)"/);

        if (!cancelled) {
          setMeta({
            url,
            title: titleMatch?.[1] ?? new URL(url).hostname,
            description: descMatch?.[1],
            image: imgMatch?.[1],
          });
        }
      } catch {
        if (!cancelled) {
          setMeta({
            url,
            title: new URL(url).hostname,
          });
        }
      }
    }

    fetchMeta();
    return () => { cancelled = true; };
  }, [url]);

  if (!meta) return null;

  return (
    <TouchableOpacity
      style={styles.container}
      onPress={() => Linking.openURL(url)}
      activeOpacity={0.7}
    >
      {meta.image && (
        <Image source={{ uri: meta.image }} style={styles.image} contentFit="cover" />
      )}
      <View style={styles.body}>
        <Text style={styles.domain}>{new URL(url).hostname}</Text>
        <Text style={styles.title} numberOfLines={2}>{meta.title}</Text>
        {meta.description && (
          <Text style={styles.desc} numberOfLines={2}>{meta.description}</Text>
        )}
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: {
    borderRadius: 10,
    overflow: 'hidden',
    marginTop: 6,
    maxWidth: 260,
    backgroundColor: colors.dark.card,
    borderWidth: 1,
    borderColor: colors.dark.border,
  },
  image: { width: '100%', height: 120 },
  body: { padding: 8 },
  domain: {
    fontSize: 10,
    color: colors.dark.textMuted,
    fontWeight: '600',
    textTransform: 'uppercase',
  },
  title: { fontSize: 13, fontWeight: '700', color: colors.dark.text, marginTop: 2 },
  desc: { fontSize: 11, color: colors.dark.textSecondary, marginTop: 2, lineHeight: 15 },
});
