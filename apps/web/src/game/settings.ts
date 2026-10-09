import { loadJson, saveJson } from '../platform/storage';
import type { KeyValueStore } from '../platform/storage';

export interface Settings {
  readonly sound: boolean;
  readonly music: boolean;
  readonly vibration: boolean;
  readonly reduceMotion: boolean;
}

const SETTINGS_KEY = 'settings';

function systemPrefersReducedMotion(): boolean {
  try {
    return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  } catch {
    return false;
  }
}

export function defaultSettings(): Settings {
  return { sound: true, music: true, vibration: true, reduceMotion: systemPrefersReducedMotion() };
}

/** Takes only known boolean fields from untrusted data; anything else falls back to defaults. */
export function parseSettings(data: unknown, defaults: Settings): Settings {
  if (typeof data !== 'object' || data === null) return defaults;
  const record = data as Record<string, unknown>;
  const pick = (key: keyof Settings): boolean =>
    typeof record[key] === 'boolean' ? record[key] : defaults[key];
  return {
    sound: pick('sound'),
    music: pick('music'),
    vibration: pick('vibration'),
    reduceMotion: pick('reduceMotion'),
  };
}

export class SettingsStore {
  private settings: Settings;
  private readonly listeners = new Set<() => void>();

  constructor(private readonly storage: KeyValueStore) {
    this.settings = parseSettings(loadJson(storage, SETTINGS_KEY), defaultSettings());
  }

  get = (): Settings => this.settings;

  subscribe = (listener: () => void): (() => void) => {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  };

  update(patch: Partial<Settings>): void {
    this.settings = { ...this.settings, ...patch };
    saveJson(this.storage, SETTINGS_KEY, this.settings);
    for (const listener of this.listeners) listener();
  }
}
