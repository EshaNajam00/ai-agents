import { fitsAnywhere } from './board';
import { BLOCK_COLORS, GENERATOR_ATTEMPTS, TRAY_SIZE } from './constants';
import { nextInt, nextRandom } from './rng';
import { SHAPES } from './shapes';
import type { Board, Piece, Shape } from './types';

interface GeneratorResult {
  readonly pieces: Piece[];
  readonly rngState: number;
  readonly nextPieceId: number;
}

function pickWeighted(shapes: readonly Shape[], rngState: number): [Shape, number] {
  const total = shapes.reduce((sum, s) => sum + s.weight, 0);
  const [r, next] = nextRandom(rngState);
  let target = r * total;
  for (const s of shapes) {
    target -= s.weight;
    if (target < 0) return [s, next];
  }
  // Floating-point edge case: fall back to the last shape.
  return [shapes[shapes.length - 1] as Shape, next];
}

/**
 * Deals a fresh tray. It tries a few random sets looking for one where at least one
 * piece fits the board. If none does, it swaps the first piece for a random shape that
 * fits, if any shape fits at all. A new tray is therefore never instantly dead unless
 * no piece in the pool can fit.
 */
export function generateTray(
  board: Board,
  rngState: number,
  nextPieceId: number,
  pool: readonly Shape[] = SHAPES,
): GeneratorResult {
  let state = rngState;
  let shapes: Shape[] = [];

  for (let attempt = 0; attempt < GENERATOR_ATTEMPTS; attempt++) {
    shapes = [];
    for (let i = 0; i < TRAY_SIZE; i++) {
      const [s, next] = pickWeighted(pool, state);
      shapes.push(s);
      state = next;
    }
    if (shapes.some((s) => fitsAnywhere(board, s))) break;
  }

  if (!shapes.some((s) => fitsAnywhere(board, s))) {
    const fitting = pool.filter((s) => fitsAnywhere(board, s));
    if (fitting.length > 0) {
      const [s, next] = pickWeighted(fitting, state);
      shapes[0] = s;
      state = next;
    }
  }

  let id = nextPieceId;
  const pieces = shapes.map((shape): Piece => {
    const [colorIndex, next] = nextInt(state, BLOCK_COLORS.length);
    state = next;
    return { id: id++, shape, color: BLOCK_COLORS[colorIndex] ?? 'blue' };
  });

  return { pieces, rngState: state, nextPieceId: id };
}
