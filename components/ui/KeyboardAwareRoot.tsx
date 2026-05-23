import React from 'react';
import {
  KeyboardAvoidingView,
  Platform,
  StyleSheet,
  type StyleProp,
  type ViewStyle,
} from 'react-native';
import { useKeyboardBottomInset } from '@/hooks/useKeyboardBottomInset';

type Props = {
  children: React.ReactNode;
  style?: StyleProp<ViewStyle>;
  /** iOS only — header height offset for stack screens. */
  keyboardVerticalOffset?: number;
};

/**
 * Lifts docked inputs above the keyboard on iOS (padding) and Android (manual
 * inset — edge-to-edge breaks windowSoftInputMode resize for bottom composers).
 */
export function KeyboardAwareRoot({
  children,
  style,
  keyboardVerticalOffset = 0,
}: Props) {
  const keyboardInset = useKeyboardBottomInset();

  return (
    <KeyboardAvoidingView
      style={[
        styles.root,
        style,
        Platform.OS === 'android' && keyboardInset > 0
          ? { paddingBottom: keyboardInset }
          : null,
      ]}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      keyboardVerticalOffset={Platform.OS === 'ios' ? keyboardVerticalOffset : 0}
    >
      {children}
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
});
