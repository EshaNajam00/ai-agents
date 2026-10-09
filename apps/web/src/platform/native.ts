import { App } from '@capacitor/app';
import { Capacitor } from '@capacitor/core';
import { Haptics, ImpactStyle } from '@capacitor/haptics';
import { Preferences } from '@capacitor/preferences';
import { SplashScreen } from '@capacitor/splash-screen';
import type { HapticStrength, Haptics as GameHaptics } from './haptics';
import type { KeyValueStore } from './storage';

/** True inside the Android (or later iOS) app, false in a normal browser. */
export const isNativeApp = Capacitor.isNativePlatform();

/**
 * Native key-value storage backed by Capacitor Preferences (Android SharedPreferences),
 * which the OS never clears on its own, unlike WebView localStorage.
 * Preferences is async, so every value is loaded into memory once at startup; reads
 * are then instant and writes go to disk in the background.
 */
export async function createNativeStore(): Promise<KeyValueStore> {
  const cache = new Map<string, string>();
  try {
    const { keys } = await Preferences.keys();
    const entries = await Promise.all(
      keys.map(async (key) => [key, (await Preferences.get({ key })).value] as const),
    );
    for (const [key, value] of entries) if (value !== null) cache.set(key, value);
  } catch (error) {
    console.error('Gridzy could not read saved data', error);
  }

  const report = (error: unknown) => console.error('Gridzy could not save data', error);
  return {
    get: (key) => cache.get(key) ?? null,
    set: (key, value) => {
      cache.set(key, value);
      Preferences.set({ key, value }).catch(report);
    },
    remove: (key) => {
      cache.delete(key);
      Preferences.remove({ key }).catch(report);
    },
  };
}

const IMPACT: Record<HapticStrength, ImpactStyle> = {
  light: ImpactStyle.Light,
  medium: ImpactStyle.Medium,
  heavy: ImpactStyle.Heavy,
};

/** Real device haptics (works on phones where navigator.vibrate does not). */
export const nativeHaptics: GameHaptics = {
  impact(strength) {
    Haptics.impact({ style: IMPACT[strength] }).catch(() => undefined);
  },
};

/** Pauses sound when the app goes to the background and resumes it on return. */
export function onAppPauseResume(onPause: () => void, onResume: () => void): void {
  void App.addListener('pause', onPause);
  void App.addListener('resume', onResume);
}

/** Hides the launch splash once the game has drawn its first frame. */
export function hideSplash(): void {
  SplashScreen.hide({ fadeOutDuration: 250 }).catch(() => undefined);
}
