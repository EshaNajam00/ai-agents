import { serializeGame } from '@gridzy/core';
import type { GameState } from '@gridzy/core';
import { describe, expect, it, vi } from 'vitest';
import { GameStore } from '../src/game/GameStore';
import type { StoreEvent } from '../src/game/GameStore';
import { TUTORIAL_HINT } from '../src/game/tutorial';
import { memoryStore } from './memoryStore';

/** Places the first piece that fits anywhere. */
function playOneMove(store: GameStore): void {
  const { tray } = store.getState();
  for (let i = 0; i < tray.length; i++) {
    if (!tray[i]) continue;
    for (let r = 0; r < 8; r++) for (let c = 0; c < 8; c++) if (store.place(i, r, c)) return;
  }
  throw new Error('no move');
}

describe('GameStore', () => {
  it('starts a fresh game in play mode with the stored best', () => {
    const store = new GameStore(memoryStore({ best: '120' }));
    expect(store.getSnapshot().mode).toBe('play');
    expect(store.getState().best).toBe(120);
    expect(store.hasProgress()).toBe(false);
    expect(store.getHint()).toBeNull();
  });

  it('saves after every move and resumes the same game', () => {
    const storage = memoryStore();
    const store = new GameStore(storage);
    playOneMove(store);
    playOneMove(store);
    expect(store.hasProgress()).toBe(true);
    expect(storage.data.has('game')).toBe(true);

    const resumed = new GameStore(storage);
    expect(resumed.getState()).toEqual(store.getState());
    expect(Number(storage.data.get('best'))).toBe(store.getState().score);
  });

  it('ignores a corrupted save', () => {
    const store = new GameStore(memoryStore({ game: '{"v":1,"board":"nope"}', best: '7' }));
    expect(store.getState().score).toBe(0);
    expect(store.getState().best).toBe(7);
  });

  it('ignores a saved game that is already over', () => {
    const storage = memoryStore();
    const game = new GameStore(storage).getState();
    // A full board: no tray piece can move, so the restored game is over.
    const stuck: GameState = { ...game, score: 10, best: 10, board: Array(64).fill('red') };
    storage.data.set('game', JSON.stringify(serializeGame(stuck)));
    expect(new GameStore(storage).getState().score).toBe(0);
  });

  it('notifies listeners and supports unsubscribe', () => {
    const store = new GameStore(memoryStore());
    const listener = vi.fn<(events: readonly StoreEvent[]) => void>();
    const unsubscribe = store.subscribe(listener);
    playOneMove(store);
    expect(listener).toHaveBeenCalledOnce();
    expect(listener.mock.calls[0]?.[0][0]?.type).toBe('placed');
    unsubscribe();
    store.restart();
    expect(listener).toHaveBeenCalledOnce();
  });

  it('rejects invalid placements without notifying', () => {
    const store = new GameStore(memoryStore());
    const listener = vi.fn();
    store.subscribe(listener);
    expect(store.place(0, 99, 99)).toBe(false);
    expect(listener).not.toHaveBeenCalled();
  });

  it('restart clears progress but keeps the best score', () => {
    const storage = memoryStore();
    const store = new GameStore(storage);
    playOneMove(store);
    const best = store.getState().best;
    store.restart();
    expect(store.getState().score).toBe(0);
    expect(store.getState().best).toBe(best);
    expect(store.hasProgress()).toBe(false);
  });

  describe('tutorial', () => {
    it('finishes when the hinted move clears the line', () => {
      const storage = memoryStore();
      const store = new GameStore(storage);
      expect(store.tutorialSeen).toBe(false);
      store.startTutorial();
      expect(store.getSnapshot().mode).toBe('tutorial');
      expect(store.getHint()).toEqual(TUTORIAL_HINT);

      const { trayIndex, row, col } = TUTORIAL_HINT;
      expect(store.place(trayIndex, row, col)).toBe(true);
      expect(store.getSnapshot().mode).toBe('tutorialDone');
      // Nothing from the tutorial is saved as a real game or best score.
      expect(storage.data.has('game')).toBe(false);
      expect(storage.data.has('best')).toBe(false);

      store.finishTutorial();
      expect(store.getSnapshot().mode).toBe('play');
      expect(store.getState().score).toBe(0);
      expect(store.getState().best).toBe(0);
      expect(storage.data.get('tutorialDone')).toBe('1');
      expect(new GameStore(storage).tutorialSeen).toBe(true);
    });

    it('resets the lesson when the piece is dropped elsewhere', () => {
      const store = new GameStore(memoryStore());
      store.startTutorial();
      const before = store.getState();
      expect(store.place(TUTORIAL_HINT.trayIndex, 0, 0)).toBe(true);
      expect(store.getSnapshot().mode).toBe('tutorial');
      expect(store.getState().board).toEqual(before.board);
    });

    it('returns to the paused game after a replay from settings', () => {
      const store = new GameStore(memoryStore());
      playOneMove(store);
      const paused = store.getState();
      store.startTutorial();
      store.finishTutorial();
      expect(store.getState()).toBe(paused);
    });
  });
});
