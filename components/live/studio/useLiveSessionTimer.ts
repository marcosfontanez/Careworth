import { useEffect, useState } from 'react';

function pad(n: number): string {
  return n < 10 ? `0${n}` : String(n);
}

export function formatLiveElapsed(totalSeconds: number): string {
  const h = Math.floor(totalSeconds / 3600);
  const m = Math.floor((totalSeconds % 3600) / 60);
  const s = totalSeconds % 60;
  if (h > 0) return `${h}:${pad(m)}:${pad(s)}`;
  return `${pad(m)}:${pad(s)}`;
}

/** Elapsed broadcast time from ISO start timestamp. */
export function useLiveSessionTimer(startedAt?: string | null, active = true): string {
  const [elapsed, setElapsed] = useState(0);

  useEffect(() => {
    if (!active || !startedAt?.trim()) {
      setElapsed(0);
      return;
    }
    const startMs = Date.parse(startedAt);
    if (!Number.isFinite(startMs)) return;

    const tick = () => setElapsed(Math.max(0, Math.floor((Date.now() - startMs) / 1000)));
    tick();
    const iv = setInterval(tick, 1000);
    return () => clearInterval(iv);
  }, [startedAt, active]);

  return formatLiveElapsed(elapsed);
}
