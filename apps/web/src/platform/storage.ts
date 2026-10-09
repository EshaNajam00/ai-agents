/**
 * Minimal key-value storage. The browser version wraps localStorage; Phase 3 adds a
 * Capacitor version behind the same interface.
 */
export interface KeyValueStore {
  get(key: string): string | null;
  set(key: string, value: string): void;
}

const PREFIX = 'gridzy:';

/** localStorage can be missing or throw (private mode, blocked storage), so never trust it. */
export const browserStore: KeyValueStore = {
  get(key) {
    try {
      return window.localStorage.getItem(PREFIX + key);
    } catch {
      return null;
    }
  },
  set(key, value) {
    try {
      window.localStorage.setItem(PREFIX + key, value);
    } catch {
      // Storage full or blocked: the game still works, it just won't remember.
    }
  },
};

const BEST_KEY = 'best';
const MAX_SCORE = 1_000_000_000;

export function loadBest(store: KeyValueStore): number {
  const value = Number(store.get(BEST_KEY));
  return Number.isSafeInteger(value) && value > 0 && value < MAX_SCORE ? value : 0;
}

export function saveBest(store: KeyValueStore, best: number): void {
  store.set(BEST_KEY, String(Math.floor(best)));
}
