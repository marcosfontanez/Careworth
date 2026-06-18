import { useEffect, useState } from 'react';
import { AccessibilityInfo } from 'react-native';

/** OS reduce-motion preference — use to swap animated UI for static fallbacks. */
export function useReduceMotion(): boolean {
  const [reduceMotion, setReduceMotion] = useState(false);

  useEffect(() => {
    let alive = true;
    AccessibilityInfo.isReduceMotionEnabled?.()
      .then((v) => {
        if (alive) setReduceMotion(Boolean(v));
      })
      .catch(() => {});
    const sub = AccessibilityInfo.addEventListener?.('reduceMotionChanged', (v: boolean) => {
      setReduceMotion(Boolean(v));
    });
    return () => {
      alive = false;
      sub?.remove?.();
    };
  }, []);

  return reduceMotion;
}
