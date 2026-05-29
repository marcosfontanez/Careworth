import { useCallback, useEffect, useRef, useState } from 'react';
import * as Haptics from 'expo-haptics';

const MIN_INTERVAL_MS = 420;
const BURST_WINDOW_MS = 2000;
const MAX_BURST = 8;
const MAX_ACTIVE_BURSTS = 14;
const COMBO_IDLE_MS = 650;

export type PulseTapVariant = 'heart' | 'pulse' | 'spark';

export type PulseTapBurst = {
  id: string;
  xOffset: number;
  variant: PulseTapVariant;
};

const VARIANTS: PulseTapVariant[] = ['heart', 'pulse', 'spark'];

function pickVariant(tapIndex: number): PulseTapVariant {
  return VARIANTS[tapIndex % VARIANTS.length];
}

/** Local-only Pulse Tap with debounce, burst limits, and combo flash. */
export function usePulseTapReaction() {
  const [bursts, setBursts] = useState<PulseTapBurst[]>([]);
  const [comboFlash, setComboFlash] = useState<number | null>(null);

  const lastTapRef = useRef(0);
  const burstCountRef = useRef(0);
  const burstWindowStartRef = useRef(0);
  const windowTapCountRef = useRef(0);
  const comboFlushTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const comboHideTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const tapIndexRef = useRef(0);

  const dismissBurst = useCallback((id: string) => {
    setBursts((prev) => prev.filter((b) => b.id !== id));
  }, []);

  const flushCombo = useCallback(() => {
    const count = windowTapCountRef.current;
    windowTapCountRef.current = 0;
    if (count >= 2) {
      setComboFlash(count);
      if (comboHideTimerRef.current) clearTimeout(comboHideTimerRef.current);
      comboHideTimerRef.current = setTimeout(() => setComboFlash(null), 950);
    }
  }, []);

  const triggerPulse = useCallback((): boolean => {
    const now = Date.now();
    if (now - lastTapRef.current < MIN_INTERVAL_MS) return false;

    if (now - burstWindowStartRef.current > BURST_WINDOW_MS) {
      flushCombo();
      burstWindowStartRef.current = now;
      burstCountRef.current = 0;
      windowTapCountRef.current = 0;
    }
    if (burstCountRef.current >= MAX_BURST) return false;

    lastTapRef.current = now;
    burstCountRef.current += 1;
    windowTapCountRef.current += 1;
    tapIndexRef.current += 1;

    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);

    const id = `${now}-${Math.random().toString(36).slice(2, 7)}`;
    const xOffset = (Math.random() - 0.5) * 56;
    const variant = pickVariant(tapIndexRef.current);

    setBursts((prev) => [...prev.slice(-(MAX_ACTIVE_BURSTS - 1)), { id, xOffset, variant }]);

    if (comboFlushTimerRef.current) clearTimeout(comboFlushTimerRef.current);
    comboFlushTimerRef.current = setTimeout(flushCombo, COMBO_IDLE_MS);

    return true;
  }, [flushCombo]);

  useEffect(() => {
    return () => {
      if (comboFlushTimerRef.current) clearTimeout(comboFlushTimerRef.current);
      if (comboHideTimerRef.current) clearTimeout(comboHideTimerRef.current);
    };
  }, []);

  return { bursts, comboFlash, triggerPulse, dismissBurst };
}
