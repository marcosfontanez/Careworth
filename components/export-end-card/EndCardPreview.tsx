import React from 'react';
import { View, Text, StyleSheet, useWindowDimensions } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { colors, borderRadius, spacing } from '@/theme';
import type { ExportEndCardData, ExportEndCardLayoutVariant } from '@/types/exportEndCard';
import { PulseVerseEndCard } from './PulseVerseEndCard';
import { PulseVerseVideoEndCard } from './PulseVerseVideoEndCard';

type Props = {
  data: ExportEndCardData;
  layoutVariant: ExportEndCardLayoutVariant;
  /** Simulated last frame of source video above the slate */
  showMockVideoStub?: boolean;
  /** Use bundled video+audio master + TikTok-style creator overlay (export target). */
  useVideoMaster?: boolean;
};

/**
 * Demo wrapper: 9:16 frame + optional “last frame” strip for design / engineering review.
 */
export function EndCardPreview({
  data,
  layoutVariant,
  showMockVideoStub = true,
  useVideoMaster = true,
}: Props) {
  const { width: winW } = useWindowDimensions();
  const frameW = Math.min(winW - spacing['2xl'] * 2, 340);
  const frameH = (frameW * 16) / 9;
  const stubH = showMockVideoStub ? frameH * 0.52 : 0;
  const endCardH = frameH - stubH;

  return (
    <View style={[styles.frame, { width: frameW, height: frameH }]}>
      {showMockVideoStub ? (
        <LinearGradient
          colors={['#1e293b', '#0f172a', '#020617']}
          style={[styles.stub, { height: stubH }]}
        >
          <Text style={styles.stubLabel}>End of clip (mock frame)</Text>
        </LinearGradient>
      ) : null}
      <View style={{ height: endCardH, width: frameW }}>
        {useVideoMaster ? (
          <PulseVerseVideoEndCard data={data} width={frameW} height={endCardH} playing />
        ) : (
          <PulseVerseEndCard data={data} width={frameW} height={endCardH} layoutVariant={layoutVariant} />
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  frame: {
    borderRadius: borderRadius['2xl'],
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: colors.dark.border,
    backgroundColor: colors.dark.card,
  },
  stub: {
    width: '100%',
    justifyContent: 'flex-end',
    paddingBottom: 8,
    paddingHorizontal: 10,
  },
  stubLabel: {
    fontSize: 10,
    fontWeight: '600',
    color: 'rgba(255,255,255,0.35)',
    letterSpacing: 0.2,
  },
});
