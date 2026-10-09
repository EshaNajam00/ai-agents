import { newGame, place } from '@gridzy/core';
import type { GameEvent, GameState } from '@gridzy/core';
import {
  isTutorialDone,
  loadBest,
  loadSavedGame,
  markTutorialDone,
  saveBest,
  saveGame,
} from '../platform/storage';
import type { KeyValueStore } from '../platform/storage';
import { createTutorialGame, TUTORIAL_HINT } from './tutorial';
import type { Hint } from './tutorial';

export type StoreEvent = GameEvent | { readonly type: 'newGame' };
export type StoreListener = (events: readonly StoreEvent[]) => void;

/**
 * - `play`: a real game, saved after every move.
 * - `tutorial`: the scripted first-launch lesson; nothing is saved.
 * - `tutorialDone`: the lesson's line was cleared; waiting for "Let's play!".
 */
export type Mode = 'play' | 'tutorial' | 'tutorialDone';

export interface Snapshot {
  readonly game: GameState;
  readonly mode: Mode;
}

/**
 * Holds the current game and tells listeners (React UI, renderer, audio) what
 * happened after every change. All rule logic lives in @gridzy/core.
 */
export class GameStore {
  private snapshot: Snapshot;
  /** A real game paused while the tutorial is replayed from Settings. */
  private gameBeforeTutorial: GameState | null = null;
  private readonly listeners = new Set<StoreListener>();
  readonly tutorialSeen: boolean;

  constructor(private readonly storage: KeyValueStore) {
    const best = loadBest(storage);
    const saved = loadSavedGame(storage);
    const game = saved && !saved.gameOver ? { ...saved, best: Math.max(saved.best, best) } : null;
    this.snapshot = { game: game ?? newGame({ best }), mode: 'play' };
    this.tutorialSeen = isTutorialDone(storage);
  }

  getSnapshot = (): Snapshot => this.snapshot;
  getState = (): GameState => this.snapshot.game;

  /** The tutorial's "drag here" hint, if one should be shown. */
  getHint(): Hint | null {
    return this.snapshot.mode === 'tutorial' ? TUTORIAL_HINT : null;
  }

  /** True when there is a real game worth continuing. */
  hasProgress(): boolean {
    const { game, mode } = this.snapshot;
    return mode === 'play' && !game.gameOver && game.score > 0;
  }

  subscribe = (listener: StoreListener): (() => void) => {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  };

  /** Returns true when the piece was placed. */
  place(trayIndex: number, row: number, col: number): boolean {
    const { game, mode } = this.snapshot;
    const result = place(game, trayIndex, row, col);
    if (!result.ok) return false;

    if (mode === 'play') {
      if (result.state.best > game.best) saveBest(this.storage, result.state.best);
      saveGame(this.storage, result.state);
      this.set({ game: result.state, mode }, result.events);
      return true;
    }

    // Tutorial: clearing the line finishes it; any other drop quietly resets the lesson.
    if (result.events.some((e) => e.type === 'linesCleared')) {
      this.set({ game: result.state, mode: 'tutorialDone' }, result.events);
    } else {
      this.set({ game: createTutorialGame(game.best), mode: 'tutorial' }, [{ type: 'newGame' }]);
    }
    return true;
  }

  restart(): void {
    const game = newGame({ best: this.snapshot.game.best });
    saveGame(this.storage, game);
    this.set({ game, mode: 'play' }, [{ type: 'newGame' }]);
  }

  startTutorial(): void {
    if (this.snapshot.mode === 'play') this.gameBeforeTutorial = this.snapshot.game;
    this.set({ game: createTutorialGame(this.snapshot.game.best), mode: 'tutorial' }, [
      { type: 'newGame' },
    ]);
  }

  /** Ends the tutorial and returns to the paused game, or starts a fresh one. */
  finishTutorial(): void {
    markTutorialDone(this.storage);
    const previous = this.gameBeforeTutorial;
    this.gameBeforeTutorial = null;
    // Tutorial points never count toward the real best score.
    const best = this.snapshot.game.previousBest;
    const game = previous && !previous.gameOver ? previous : newGame({ best });
    this.set({ game, mode: 'play' }, [{ type: 'newGame' }]);
  }

  private set(snapshot: Snapshot, events: readonly StoreEvent[]): void {
    this.snapshot = snapshot;
    for (const listener of this.listeners) listener(events);
  }
}
