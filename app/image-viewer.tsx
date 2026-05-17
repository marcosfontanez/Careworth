import React, { useMemo } from 'react';
import {
  View, StyleSheet, TouchableOpacity, Dimensions, StatusBar,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Image } from 'expo-image';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { pulseImageFeedHeroProps } from '@/lib/pulseImage';
import { normalizeVideoLookId, tintForLook } from '@/lib/videoFilters';

const { width: SCREEN_W, height: SCREEN_H } = Dimensions.get('window');

function paramOne(v: string | string[] | undefined): string | undefined {
  const raw = Array.isArray(v) ? v[0] : v;
  return raw === '' ? undefined : raw;
}

export default function ImageViewerScreen() {
  const params = useLocalSearchParams<{ uri?: string | string[]; grade?: string | string[] }>();
  const router = useRouter();
  const insets = useSafeAreaInsets();

  const uriDecoded = useMemo(() => {
    const raw = paramOne(params.uri);
    if (!raw) return '';
    try {
      return decodeURIComponent(raw);
    } catch {
      return raw;
    }
  }, [params.uri]);

  const gradeTint = useMemo(() => {
    const raw = paramOne(params.grade);
    if (!raw) return null;
    let decoded = raw;
    try {
      decoded = decodeURIComponent(raw);
    } catch {
      /* use raw */
    }
    const id = normalizeVideoLookId(decoded);
    return id ? tintForLook(id) : null;
  }, [params.grade]);

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" />

      <View style={styles.imageStage}>
        <Image
          source={{ uri: uriDecoded }}
          style={StyleSheet.absoluteFillObject}
          contentFit="contain"
          {...pulseImageFeedHeroProps}
        />
        {gradeTint ? (
          <View
            pointerEvents="none"
            style={[StyleSheet.absoluteFillObject, { backgroundColor: gradeTint, zIndex: 2 }]}
          />
        ) : null}
      </View>

      <TouchableOpacity
        style={[styles.closeBtn, { top: insets.top + 12 }]}
        onPress={() => router.back()}
        activeOpacity={0.7}
      >
        <Ionicons name="close" size={28} color="#FFF" />
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
    alignItems: 'center',
    justifyContent: 'center',
  },
  imageStage: {
    width: SCREEN_W,
    height: SCREEN_H,
  },
  closeBtn: {
    position: 'absolute',
    left: 16,
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(0,0,0,0.5)',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 10,
  },
});
