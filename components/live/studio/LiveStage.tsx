import React from 'react';
import { StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';

type Props = {
  children: React.ReactNode;
  style?: StyleProp<ViewStyle>;
};

/** Full-screen video underlay — keeps the broadcast layer separate from host chrome. */
export function LiveStage({ children, style }: Props) {
  return <View style={[styles.stage, style]}>{children}</View>;
}

const styles = StyleSheet.create({
  stage: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: '#020617',
  },
});
