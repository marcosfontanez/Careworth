import React from 'react';
import { TouchableOpacity, Text, StyleSheet, View, ViewStyle, TextStyle } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import {
  pushFeedClipAttributionTarget,
  type ResolvedFeedClipAttribution,
} from '@/lib/feedClipAttribution';
import { pulseColors, pulseRadius, pulseTypography } from '@/lib/theme/pulseTheme';

type ChipSpec = NonNullable<
  ResolvedFeedClipAttribution['creatorChip'] | ResolvedFeedClipAttribution['liveChip']
>;

type Props = {
  chip: ChipSpec;
  icon: keyof typeof Ionicons.glyphMap;
  iconColor: string;
  variant?: 'feed' | 'detail' | 'inline';
  style?: ViewStyle;
  textStyle?: TextStyle;
};

export function FeedClipAttributionChip({
  chip,
  icon,
  iconColor,
  variant = 'feed',
  style,
  textStyle,
}: Props) {
  const router = useRouter();
  const onPress = () => {
    if (chip.navigable && chip.target) pushFeedClipAttributionTarget(router, chip.target);
  };

  const content = (
    <>
      <Ionicons name={icon} size={variant === 'detail' ? 13 : 11} color={iconColor} />
      <Text
        style={[
          variant === 'detail' ? styles.detailText : styles.feedText,
          !chip.navigable ? styles.mutedText : null,
          textStyle,
        ]}
        numberOfLines={1}
      >
        {chip.label}
      </Text>
    </>
  );

  if (!chip.navigable) {
    return (
      <View
        style={[
          variant === 'detail' ? styles.detailChip : styles.feedChip,
          styles.staticChip,
          style,
        ]}
        accessibilityRole="text"
        accessibilityLabel={chip.label}
      >
        {content}
      </View>
    );
  }

  return (
    <TouchableOpacity
      style={[variant === 'detail' ? styles.detailChip : styles.feedChip, style]}
      onPress={onPress}
      activeOpacity={0.82}
      accessibilityRole="button"
      accessibilityLabel={chip.label}
    >
      {content}
    </TouchableOpacity>
  );
}

type RowProps = {
  attribution: ResolvedFeedClipAttribution;
  variant?: 'feed' | 'detail' | 'inline';
  style?: ViewStyle;
};

/** Renders creator + live attribution chips when present. */
export function FeedClipAttributionRow({ attribution, variant = 'feed', style }: RowProps) {
  const { creatorChip, liveChip } = attribution;
  if (!creatorChip && !liveChip) return null;

  return (
    <View style={[styles.row, style]}>
      {creatorChip ? (
        <FeedClipAttributionChip
          chip={creatorChip}
          icon="cut-outline"
          iconColor={pulseColors.teal}
          variant={variant}
        />
      ) : null}
      {liveChip ? (
        <FeedClipAttributionChip
          chip={liveChip}
          icon="radio-outline"
          iconColor={pulseColors.live}
          variant={variant}
        />
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    alignItems: 'center',
  },
  feedChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    alignSelf: 'flex-start',
    maxWidth: '100%',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: pulseRadius.chip,
    backgroundColor: 'rgba(8,14,28,0.72)',
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: 'rgba(96,165,250,0.28)',
  },
  detailChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    alignSelf: 'flex-start',
    maxWidth: '100%',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: pulseRadius.lg,
    backgroundColor: pulseColors.glass,
    borderWidth: 1,
    borderColor: pulseColors.borderAccent,
  },
  staticChip: {
    opacity: 0.88,
  },
  feedText: {
    ...pulseTypography.caption,
    color: pulseColors.text,
    flexShrink: 1,
  },
  detailText: {
    ...pulseTypography.bodySmall,
    color: pulseColors.text,
    fontWeight: '600',
    flexShrink: 1,
  },
  mutedText: {
    color: pulseColors.mutedText,
  },
});
