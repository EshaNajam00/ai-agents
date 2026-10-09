import { LINE_CLEAR_BASE } from './constants';

/** Triangular line bonus: 1 line = 10, 2 = 30, 3 = 60, 4 = 100 ... */
export function lineClearPoints(lineCount: number): number {
  if (lineCount <= 0) return 0;
  return (LINE_CLEAR_BASE * lineCount * (lineCount + 1)) / 2;
}

export type Praise = 'great' | 'amazing' | 'incredible';

/** Praise popup for clearing `lineCount` lines in a single move, if any. */
export function praiseFor(lineCount: number): Praise | null {
  if (lineCount >= 4) return 'incredible';
  if (lineCount === 3) return 'amazing';
  if (lineCount === 2) return 'great';
  return null;
}
