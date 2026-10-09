import { describe, expect, it } from 'vitest';
import {
  cellIndex,
  hasAnyMove,
  isBoardEmpty,
  newGame,
  PERFECT_CLEAR_BONUS,
  place,
  previewPlacement,
} from '../src';
import type { GameEvent, GameState, PlaceResult } from '../src';
import { boardFrom, stateWith } from './helpers';

function expectOk(result: PlaceResult): { state: GameState; events: readonly GameEvent[] } {
  if (!result.ok) throw new Error(`placement failed: ${result.reason}`);
  return result;
}

const types = (events: readonly GameEvent[]) => events.map((e) => e.type);

describe('newGame', () => {
  it('starts with an empty board, a full tray and zero score', () => {
    const game = newGame({ seed: 1, best: 120 });
    expect(isBoardEmpty(game.board)).toBe(true);
    expect(game.tray.every((p) => p !== null)).toBe(true);
    expect(game.score).toBe(0);
    expect(game.best).toBe(120);
    expect(game.previousBest).toBe(120);
    expect(game.gameOver).toBe(false);
  });

  it('sanitizes a bad best score', () => {
    expect(newGame({ seed: 1, best: -5 }).best).toBe(0);
    expect(newGame({ seed: 1, best: 9.7 }).best).toBe(9);
  });

  it('works without options', () => {
    expect(newGame().tray).toHaveLength(3);
  });
});

describe('place', () => {
  it('places a piece, scores 1 point per block and empties the tray slot', () => {
    const state = stateWith({ tray: ['square2', 'dot', 'dot'] });
    const { state: next, events } = expectOk(place(state, 0, 3, 3));
    expect(next.score).toBe(4);
    expect(next.tray[0]).toBeNull();
    expect(next.board[cellIndex(4, 4)]).toBe('red');
    expect(types(events)).toEqual(['placed']);
  });

  it('never mutates the previous state', () => {
    const state = stateWith({ tray: ['square2', 'dot', 'dot'] });
    const snapshot = structuredClone(state);
    place(state, 0, 0, 0);
    expect(state).toEqual(snapshot);
  });

  it('rejects invalid placements with a reason', () => {
    const state = stateWith({ board: boardFrom(['#.......']), tray: ['dot', null, 'dot'] });
    expect(place(state, 0, 0, 0)).toEqual({ ok: false, reason: 'doesNotFit' });
    expect(place(state, 1, 4, 4)).toEqual({ ok: false, reason: 'emptySlot' });
    expect(place(state, 5, 4, 4)).toEqual({ ok: false, reason: 'emptySlot' });
    expect(place({ ...state, gameOver: true }, 0, 4, 4)).toEqual({
      ok: false,
      reason: 'gameOver',
    });
  });

  it('clears a full row and awards line points', () => {
    const state = stateWith({
      board: boardFrom(['#####...', '#.......']),
      tray: ['line3h', 'dot', 'dot'],
    });
    const { state: next, events } = expectOk(place(state, 0, 0, 5));
    expect(next.board.filter(Boolean)).toHaveLength(1);
    expect(next.score).toBe(3 + 10);
    const cleared = events.find((e) => e.type === 'linesCleared');
    expect(cleared).toMatchObject({ rows: [0], cols: [], lineCount: 1, combo: 1, points: 10 });
  });

  it('clears a row and a column at once (2 lines = 30 points)', () => {
    const state = stateWith({
      board: boardFrom([
        '#######.',
        '.......#',
        '.......#',
        '.......#',
        '.......#',
        '.......#',
        '.......#',
        '.......#',
      ]),
      tray: ['dot', 'dot', 'dot'],
    });
    const { state: next, events } = expectOk(place(state, 0, 0, 7));
    expect(events.find((e) => e.type === 'linesCleared')).toMatchObject({
      lineCount: 2,
      points: 30,
    });
    // 1 point for the dot + 30 for the lines + perfect clear bonus.
    expect(next.score).toBe(1 + 30 + PERFECT_CLEAR_BONUS);
    expect(isBoardEmpty(next.board)).toBe(true);
    expect(types(events)).toContain('perfectClear');
  });

  it('awards a perfect clear only when the board ends up empty', () => {
    const state = stateWith({
      board: boardFrom(['#######.', '#.......']),
      tray: ['dot', 'dot', 'dot'],
    });
    const { events } = expectOk(place(state, 0, 0, 7));
    expect(types(events)).not.toContain('perfectClear');
  });

  describe('combos', () => {
    const rowAlmostFull = (row: number) => {
      const rows = Array<string>(8).fill('........');
      rows[row] = '#######.';
      return boardFrom(rows);
    };

    it('multiplies line points by the combo streak', () => {
      const s0 = stateWith({ board: rowAlmostFull(0), tray: ['dot', 'dot', 'dot'], combo: 2 });
      const { state, events } = expectOk(place(s0, 0, 0, 7));
      expect(state.combo).toBe(3);
      expect(events.find((e) => e.type === 'linesCleared')).toMatchObject({ points: 30 });
      expect(events).toContainEqual({ type: 'combo', combo: 3 });
    });

    it('does not announce a combo for the first clear', () => {
      const s0 = stateWith({ board: rowAlmostFull(0), tray: ['dot', 'dot', 'dot'] });
      const { state, events } = expectOk(place(s0, 0, 0, 7));
      expect(state.combo).toBe(1);
      expect(types(events)).not.toContain('combo');
    });

    it('keeps the combo for up to 2 non-clearing moves', () => {
      const s0 = stateWith({ tray: ['dot', 'dot', 'dot'], combo: 1, movesSinceClear: 1 });
      const { state, events } = expectOk(place(s0, 0, 4, 4));
      expect(state.combo).toBe(1);
      expect(state.movesSinceClear).toBe(2);
      expect(types(events)).not.toContain('comboLost');
    });

    it('drops the combo on the 3rd move without a clear', () => {
      const s0 = stateWith({ tray: ['dot', 'dot', 'dot'], combo: 4, movesSinceClear: 2 });
      const { state, events } = expectOk(place(s0, 0, 4, 4));
      expect(state.combo).toBe(0);
      expect(types(events)).toContain('comboLost');
    });

    it('continues the combo when the 3rd move clears', () => {
      const s0 = stateWith({
        board: rowAlmostFull(0),
        tray: ['dot', 'dot', 'dot'],
        combo: 1,
        movesSinceClear: 2,
      });
      const { state } = expectOk(place(s0, 0, 0, 7));
      expect(state.combo).toBe(2);
      expect(state.movesSinceClear).toBe(0);
    });
  });

  describe('best score', () => {
    it('announces a new best once, when the old best is passed', () => {
      const s0 = stateWith({ tray: ['dot', 'dot', 'dot'], score: 10, best: 10, previousBest: 10 });
      const first = expectOk(place(s0, 0, 0, 0));
      expect(first.events).toContainEqual({ type: 'newBest', score: 11 });
      expect(first.state.best).toBe(11);

      const second = expectOk(place(first.state, 1, 2, 2));
      expect(types(second.events)).not.toContain('newBest');
      expect(second.state.best).toBe(12);
    });

    it('does not announce a new best on the very first game', () => {
      const s0 = stateWith({ tray: ['dot', 'dot', 'dot'], best: 0, previousBest: 0 });
      const { state, events } = expectOk(place(s0, 0, 0, 0));
      expect(types(events)).not.toContain('newBest');
      expect(state.best).toBe(1);
    });
  });

  it('refills the tray after all 3 pieces are placed', () => {
    let state = stateWith({ tray: ['dot', 'dot', 'dot'] });
    state = expectOk(place(state, 0, 0, 0)).state;
    state = expectOk(place(state, 1, 0, 2)).state;
    const { state: next, events } = expectOk(place(state, 2, 0, 4));
    expect(next.tray.every((p) => p !== null)).toBe(true);
    expect(types(events)).toContain('trayRefilled');
    expect(next.rngState).not.toBe(state.rngState);
  });

  // Only the diagonal (plus one extra hole) is empty: placing a dot in the extra hole
  // completes no line, and a 3x3 can never fit.
  const diagonal = boardFrom([
    '..######',
    '#.######',
    '##.#####',
    '###.####',
    '####.###',
    '#####.##',
    '######.#',
    '#######.',
  ]);

  it('ends the game when no remaining piece fits', () => {
    const s0 = stateWith({
      board: diagonal,
      tray: ['dot', 'square3', null],
      best: 100,
      previousBest: 100,
    });
    const { state, events } = expectOk(place(s0, 0, 0, 1));
    expect(state.gameOver).toBe(true);
    expect(events.at(-1)).toEqual({
      type: 'gameOver',
      score: state.score,
      best: state.best,
      isNewBest: false,
    });
  });

  it('reports isNewBest on game over when the old best was beaten', () => {
    const s0 = stateWith({
      board: diagonal,
      tray: ['dot', 'square3', null],
      score: 50,
      best: 50,
      previousBest: 40,
    });
    const { events } = expectOk(place(s0, 0, 0, 1));
    expect(events.at(-1)).toMatchObject({ type: 'gameOver', isNewBest: true });
  });
});

describe('hasAnyMove', () => {
  it('ignores empty tray slots', () => {
    const full = boardFrom(Array(8).fill('########'));
    const state = stateWith({ tray: [null, null, 'dot'] });
    expect(hasAnyMove(full, state.tray)).toBe(false);
    expect(hasAnyMove(state.board, state.tray)).toBe(true);
  });
});

describe('previewPlacement', () => {
  it('shows a valid ghost and the lines that would clear', () => {
    const state = stateWith({ board: boardFrom(['#####...']), tray: ['line3h', 'dot', 'dot'] });
    const preview = previewPlacement(state, 0, 0, 5);
    expect(preview.valid).toBe(true);
    expect(preview.cells).toHaveLength(3);
    expect(preview.rows).toEqual([0]);
    expect(preview.cols).toEqual([]);
  });

  it('marks overlapping or out-of-bounds drops as invalid', () => {
    const state = stateWith({ board: boardFrom(['#.......']), tray: ['line3h', null, 'dot'] });
    expect(previewPlacement(state, 0, 0, 0).valid).toBe(false);
    const outside = previewPlacement(state, 0, 7, 6);
    expect(outside.valid).toBe(false);
    expect(outside.cells).toEqual([
      { row: 7, col: 6 },
      { row: 7, col: 7 },
    ]);
    expect(previewPlacement(state, 1, 3, 3)).toEqual({
      valid: false,
      cells: [],
      rows: [],
      cols: [],
    });
  });
});
