import { describe, expect, it } from 'vitest';
import {
  canPlace,
  cellIndex,
  clearLines,
  createBoard,
  findFullLines,
  fitsAnywhere,
  getShape,
  isBoardEmpty,
  placeShape,
} from '../src';
import type { Shape } from '../src';
import { boardFrom } from './helpers';

const shape = (id: string): Shape => {
  const s = getShape(id);
  if (!s) throw new Error(id);
  return s;
};

describe('board', () => {
  it('creates an empty 8x8 board', () => {
    const board = createBoard();
    expect(board).toHaveLength(64);
    expect(isBoardEmpty(board)).toBe(true);
  });

  it('allows placement on empty cells inside the board', () => {
    expect(canPlace(createBoard(), shape('square2'), 0, 0)).toBe(true);
    expect(canPlace(createBoard(), shape('square2'), 6, 6)).toBe(true);
  });

  it('rejects placement out of bounds', () => {
    expect(canPlace(createBoard(), shape('square2'), 7, 0)).toBe(false);
    expect(canPlace(createBoard(), shape('line5h'), 0, 4)).toBe(false);
    expect(canPlace(createBoard(), shape('dot'), -1, 0)).toBe(false);
  });

  it('rejects placement over filled cells', () => {
    const board = boardFrom(['.#......']);
    expect(canPlace(board, shape('line2h'), 0, 0)).toBe(false);
    expect(canPlace(board, shape('line2h'), 0, 2)).toBe(true);
  });

  it('only checks filled cells of a shape, not its bounding box', () => {
    // l3a is "#./##": its top-right is empty, so a block there is fine.
    const board = boardFrom(['.#......']);
    expect(canPlace(board, shape('l3a'), 0, 0)).toBe(true);
  });

  it('stamps a shape without mutating the original board', () => {
    const board = createBoard();
    const next = placeShape(board, shape('line3h'), 2, 3, 'green');
    expect(isBoardEmpty(board)).toBe(true);
    expect(next[cellIndex(2, 3)]).toBe('green');
    expect(next[cellIndex(2, 5)]).toBe('green');
    expect(next.filter(Boolean)).toHaveLength(3);
  });

  it('knows whether a shape fits anywhere', () => {
    const full = boardFrom(Array(8).fill('########'));
    expect(fitsAnywhere(full, shape('dot'))).toBe(false);
    const oneHole = boardFrom(['#######.', ...Array(7).fill('########')]);
    expect(fitsAnywhere(oneHole, shape('dot'))).toBe(true);
    expect(fitsAnywhere(oneHole, shape('line2h'))).toBe(false);
  });

  it('finds full rows and columns', () => {
    const board = boardFrom([
      '########',
      '#.......',
      '#.......',
      '#.......',
      '#.......',
      '#.......',
      '#.......',
      '#......#',
    ]);
    expect(findFullLines(board)).toEqual({ rows: [0], cols: [0] });
  });

  it('clears rows and columns, counting the shared cell once', () => {
    const board = boardFrom([
      '########',
      '#.......',
      '#.......',
      '#.......',
      '#.......',
      '#.......',
      '#.......',
      '#......#',
    ]);
    const { board: next, cleared } = clearLines(board, [0], [0]);
    expect(cleared).toHaveLength(15);
    expect(next.filter(Boolean)).toHaveLength(1);
    expect(next[cellIndex(7, 7)]).toBe('blue');
  });
});
