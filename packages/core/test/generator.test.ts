import { describe, expect, it } from 'vitest';
import { BLOCK_COLORS, createBoard, fitsAnywhere, generateTray, getShape } from '../src';
import type { Shape } from '../src';
import { boardFrom } from './helpers';

describe('generateTray', () => {
  it('deals 3 pieces with sequential ids and valid colors', () => {
    const { pieces, nextPieceId } = generateTray(createBoard(), 1, 10);
    expect(pieces).toHaveLength(3);
    expect(pieces.map((p) => p.id)).toEqual([10, 11, 12]);
    expect(nextPieceId).toBe(13);
    for (const p of pieces) expect(BLOCK_COLORS).toContain(p.color);
  });

  it('is deterministic for the same seed', () => {
    const a = generateTray(createBoard(), 99, 1);
    const b = generateTray(createBoard(), 99, 1);
    expect(a).toEqual(b);
  });

  it('always deals at least one piece that fits when any piece can fit', () => {
    // Only a single hole: the tray must contain a dot.
    const board = boardFrom(['#######.', ...Array(7).fill('########')]);
    for (let seed = 0; seed < 200; seed++) {
      const { pieces } = generateTray(board, seed, 1);
      expect(pieces.some((p) => fitsAnywhere(board, p.shape))).toBe(true);
    }
  });

  it('still deals a full tray when nothing can fit', () => {
    const full = boardFrom(Array(8).fill('########'));
    expect(generateTray(full, 5, 1).pieces).toHaveLength(3);
  });

  it('respects a custom pool', () => {
    const pool = [getShape('square3')].filter(Boolean) as Shape[];
    const { pieces } = generateTray(createBoard(), 3, 1, pool);
    expect(pieces.every((p) => p.shape.id === 'square3')).toBe(true);
  });

  it('picks the last shape when the random roll lands on the total weight', () => {
    // A zero-weight pool makes `target < 0` impossible, exercising the fallback.
    const square = getShape('square2') as Shape;
    const pool: Shape[] = [{ ...square, weight: 0 }];
    const { pieces } = generateTray(createBoard(), 3, 1, pool);
    expect(pieces.every((p) => p.shape.id === 'square2')).toBe(true);
  });
});
