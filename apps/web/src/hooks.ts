import { useEffect, useRef, useState, useSyncExternalStore } from 'react';
import type { Settings, SettingsStore } from './game/settings';

export function useSettings(store: SettingsStore): Settings {
  return useSyncExternalStore(store.subscribe, store.get);
}

/** Smoothly counts up to `value`; jumps straight down (e.g. on restart). */
export function useCountUp(value: number, animate: boolean, duration = 450): number {
  const [display, setDisplay] = useState(value);
  const displayRef = useRef(value);

  useEffect(() => {
    const from = displayRef.current;
    if (!animate || value <= from) {
      displayRef.current = value;
      setDisplay(value);
      return;
    }
    let frame = 0;
    const start = performance.now();
    const step = (now: number) => {
      const t = Math.min(1, (now - start) / duration);
      const eased = 1 - (1 - t) ** 3;
      const next = Math.round(from + (value - from) * eased);
      displayRef.current = next;
      setDisplay(next);
      if (t < 1) frame = requestAnimationFrame(step);
    };
    frame = requestAnimationFrame(step);
    return () => cancelAnimationFrame(frame);
  }, [value, animate, duration]);

  return display;
}
