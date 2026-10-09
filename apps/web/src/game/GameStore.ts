import { newGame, place } from '@gridzy/core';
import type { GameEvent, GameState } from '@gridzy/core';
import { loadBest, saveBest } from '../platform/storage';
import type { KeyValueStore } from '../platform/storage';

export type StoreEvent = GameEvent | { readonly type: 'newGame' };
export type StoreListener = (events: readonly StoreEvent[]) => void;

/**
 * Holds the current game and tells listeners (React UI and the Pixi renderer) what
 * happened after every change. All rule logic lives in @gridzy/core.
 */
export class GameStore {
  private state: GameState;
  private readonly listeners = new Set<StoreListener>();

  constructor(private readonly storage: KeyValueStore) {
    this.state = newGame({ best: loadBest(storage) });
  }

  getState = (): GameState => this.state;

  subscribe = (listener: StoreListener): (() => void) => {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  };

  /** Returns true when the piece was placed. */
  place(trayIndex: number, row: number, col: number): boolean {
    const result = place(this.state, trayIndex, row, col);
    if (!result.ok) return false;
    const previousBest = this.state.best;
    this.state = result.state;
    if (this.state.best > previousBest) saveBest(this.storage, this.state.best);
    this.emit(result.events);
    return true;
  }

  restart(): void {
    this.state = newGame({ best: this.state.best });
    this.emit([{ type: 'newGame' }]);
  }

  private emit(events: readonly StoreEvent[]): void {
    for (const listener of this.listeners) listener(events);
  }
}
