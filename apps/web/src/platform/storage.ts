import { restoreGame, serializeGame } from '@gridzy/core';
import type { GameState } from '@gridzy/core';

/**
 * Minimal key-value storage. The browser version wraps localStorage; Phase 3 adds a
 * Capacitor version behind the same interface.
 */
export interface KeyValueStore {
  get(key: string): string | null;
  set(key: string, value: string): void;
  remove(key: string): void;
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
  remove(key) {
    try {
      window.localStorage.removeItem(PREFIX + key);
    } catch {
      // Same as above.
    }
  },
};

/** Parses stored JSON, returning undefined for missing or malformed data. */
export function loadJson(store: KeyValueStore, key: string): unknown {
  const raw = store.get(key);
  if (raw === null) return undefined;
  try {
    return JSON.parse(raw) as unknown;
  } catch {
    return undefined;
  }
}

export function saveJson(store: KeyValueStore, key: string, value: unknown): void {
  store.set(key, JSON.stringify(value));
}

// ----------------------------------------------------------------- best score

const BEST_KEY = 'best';
const MAX_SCORE = 1_000_000_000;

export function loadBest(store: KeyValueStore): number {
  const value = Number(store.get(BEST_KEY));
  return Number.isSafeInteger(value) && value > 0 && value < MAX_SCORE ? value : 0;
}

export function saveBest(store: KeyValueStore, best: number): void {
  store.set(BEST_KEY, String(Math.floor(best)));
}

// ------------------------------------------------------------- game in progress

const GAME_KEY = 'game';

export function loadSavedGame(store: KeyValueStore): GameState | null {
  return restoreGame(loadJson(store, GAME_KEY));
}

export function saveGame(store: KeyValueStore, state: GameState): void {
  if (state.gameOver) store.remove(GAME_KEY);
  else saveJson(store, GAME_KEY, serializeGame(state));
}

// -------------------------------------------------------------------- tutorial

const TUTORIAL_KEY = 'tutorialDone';

export function isTutorialDone(store: KeyValueStore): boolean {
  return store.get(TUTORIAL_KEY) === '1';
}

export function markTutorialDone(store: KeyValueStore): void {
  store.set(TUTORIAL_KEY, '1');
}
