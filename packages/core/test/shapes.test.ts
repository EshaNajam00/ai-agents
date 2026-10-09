import { describe, expect, it } from 'vitest';
import { BOARD_SIZE, getShape, SHAPES } from '../src';

describe('shapes', () => {
  it('has unique ids', () => {
    const ids = SHAPES.map((s) => s.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it('has no two shapes with the same cell pattern', () => {
    const patterns = SHAPES.map((s) =>
      s.cells
        .map((c) => `${c.row},${c.col}`)
        .sort()
        .join('|'),
    );
    expect(new Set(patterns).size).toBe(patterns.length);
  });

  it.each(SHAPES.map((s) => [s.id, s] as const))('%s has a tight, valid bounding box', (_, s) => {
    expect(s.cells.length).toBeGreaterThan(0);
    expect(s.weight).toBeGreaterThan(0);
    expect(s.width).toBeLessThanOrEqual(BOARD_SIZE);
    expect(s.height).toBeLessThanOrEqual(BOARD_SIZE);
    expect(Math.max(...s.cells.map((c) => c.col)) + 1).toBe(s.width);
    expect(Math.max(...s.cells.map((c) => c.row)) + 1).toBe(s.height);
    expect(Math.min(...s.cells.map((c) => c.col))).toBe(0);
    expect(Math.min(...s.cells.map((c) => c.row))).toBe(0);
  });

  it('includes every family from the PRD', () => {
    for (const id of ['dot', 'line5v', 'square3', 'l3a', 'l4h', 'l5d', 't4up', 's4h', 'z4v']) {
      expect(getShape(id)).toBeDefined();
    }
    expect(getShape('nope')).toBeUndefined();
  });
});
