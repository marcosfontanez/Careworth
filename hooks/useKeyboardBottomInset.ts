import { useEffect, useState } from 'react';
import { Keyboard, Platform, type KeyboardEventListener } from 'react-native';

/**
 * Tracks open-keyboard height from the bottom of the screen.
 * Required on Android with edge-to-edge — `adjustResize` often does not lift
 * docked composers; iOS callers may use this for ScrollView padding only.
 */
export function useKeyboardBottomInset(): number {
  const [inset, setInset] = useState(0);

  useEffect(() => {
    const showEvent = Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow';
    const hideEvent = Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide';

    const onShow: KeyboardEventListener = (e) => {
      setInset(Math.max(0, e.endCoordinates.height));
    };
    const onHide = () => setInset(0);

    const showSub = Keyboard.addListener(showEvent, onShow);
    const hideSub = Keyboard.addListener(hideEvent, onHide);
    return () => {
      showSub.remove();
      hideSub.remove();
    };
  }, []);

  return inset;
}
