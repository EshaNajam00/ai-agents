import { describe, expect, it } from 'vitest';
import { newGame, place, restoreGame, SAVE_VERSION, serializeGame } from '../src';
import type { GameState } from '../src';
import { boardFrom, stateWith } from './helpers';

function playSomeMoves(state: GameState, moves: number): GameState {
  let s = state;
  for (let m = 0; m < moves && !s.gameOver; m++) {
    let moved = false;
    for (let i = 0; i < 3 && !moved; i++) {
      for (let r = 0; r < 8 && !moved; r++) {
        for (let c = 0; c < 8 && !moved; c++) {
          const result = place(s, i, r, c);
          if (result.ok) {
            s = result.state;
            moved = true;
          }
        }
      }
    }
  }
  return s;
}

describe('save / restore', () => {
  it('round-trips a game exactly, through JSON', () => {
    const state = playSomeMoves(newGame({ seed: 7, best: 50 }), 12);
    const restored = restoreGame(JSON.parse(JSON.stringify(serializeGame(state))));
    expect(restored).toEqual(state);
  });

  it('continues deterministically after restoring', () => {
    const state = playSomeMoves(newGame({ seed: 3 }), 5);
    const restored = restoreGame(JSON.parse(JSON.stringify(serializeGame(state))));
    expect(restored).not.toBeNull();
    expect(playSomeMoves(restored as GameState, 6)).toEqual(playSomeMoves(state, 6));
  });

  it('recomputes game over instead of trusting the save', () => {
    const diagonal = boardFrom([
      '.#######',
      '#.######',
      '##.#####',
      '###.####',
      '####.###',
      '#####.##',
      '######.#',
      '#######.',
    ]);
    const stuck = stateWith({ board: diagonal, tray: ['square3', null, null] });
    expect(restoreGame(serializeGame(stuck))?.gameOver).toBe(true);
  });

  const valid = serializeGame(stateWith({ tray: ['dot', 'l3a', null], score: 5, best: 9 }));

  it.each([
    ['not an object', 'hello'],
    ['null', null],
    ['an array', []],
    ['wrong version', { ...valid, v: SAVE_VERSION + 1 }],
    ['short board', { ...valid, board: valid.board.slice(1) }],
    ['unknown color', { ...valid, board: ['pink', ...valid.board.slice(1)] }],
    ['tray too long', { ...valid, tray: [...valid.tray, null] }],
    ['empty tray', { ...valid, tray: [null, null, null] }],
    ['unknown shape', { ...valid, tray: [{ id: 1, shape: 'blob', color: 'red' }, null, null] }],
    ['bad piece color', { ...valid, tray: [{ id: 1, shape: 'dot', color: 'pink' }, null, null] }],
    ['tray item not an object', { ...valid, tray: [5, null, null] }],
    ['negative score', { ...valid, score: -1 }],
    ['fractional score', { ...valid, score: 1.5 }],
    ['score above best', { ...valid, score: 100, best: 10 }],
    ['huge combo', { ...valid, combo: 1e9 }],
    ['string rng', { ...valid, rngState: '1' }],
    ['missing id counter', { ...valid, nextPieceId: undefined }],
  ])('rejects a save with %s', (_, data) => {
    expect(restoreGame(data)).toBeNull();
  });

  it('accepts the untouched save', () => {
    expect(restoreGame(valid)).not.toBeNull();
  });
});
