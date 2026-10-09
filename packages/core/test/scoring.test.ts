import { describe, expect, it } from 'vitest';
import { lineClearPoints, nextInt, nextRandom, praiseFor, randomSeed } from '../src';

describe('scoring', () => {
  it('awards triangular points for multiple lines', () => {
    expect(lineClearPoints(0)).toBe(0);
    expect(lineClearPoints(1)).toBe(10);
    expect(lineClearPoints(2)).toBe(30);
    expect(lineClearPoints(3)).toBe(60);
    expect(lineClearPoints(4)).toBe(100);
  });

  it('praises big clears', () => {
    expect(praiseFor(1)).toBeNull();
    expect(praiseFor(2)).toBe('great');
    expect(praiseFor(3)).toBe('amazing');
    expect(praiseFor(4)).toBe('incredible');
    expect(praiseFor(6)).toBe('incredible');
  });
});

describe('rng', () => {
  it('is deterministic for a given seed', () => {
    expect(nextRandom(123)).toEqual(nextRandom(123));
    expect(nextRandom(123)[0]).not.toBe(nextRandom(124)[0]);
  });

  it('stays within range', () => {
    let state = 7;
    for (let i = 0; i < 1000; i++) {
      const [v, next] = nextInt(state, 7);
      expect(v).toBeGreaterThanOrEqual(0);
      expect(v).toBeLessThan(7);
      state = next;
    }
  });

  it('produces a 32-bit integer seed', () => {
    const seed = randomSeed();
    expect(Number.isInteger(seed)).toBe(true);
    expect(seed | 0).toBe(seed);
  });
});
