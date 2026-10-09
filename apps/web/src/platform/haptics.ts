export type HapticStrength = 'light' | 'medium' | 'heavy';

/** Vibration feedback. The browser version uses navigator.vibrate; Phase 3 adds native haptics. */
export interface Haptics {
  impact(strength: HapticStrength): void;
}

const PATTERNS: Record<HapticStrength, number | number[]> = {
  light: 10,
  medium: 22,
  heavy: [30, 40, 45],
};

export const browserHaptics: Haptics = {
  impact(strength) {
    try {
      navigator.vibrate?.(PATTERNS[strength]);
    } catch {
      // Not supported (e.g. iOS Safari): silently skip.
    }
  },
};
