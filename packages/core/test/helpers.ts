import { BOARD_SIZE, getShape, newGame } from '../src';
import type { BlockColor, Board, Cell, GameState, Piece } from '../src';

/**
 * Builds a board from 8 strings of 8 chars: `.` is empty, any other char is a block.
 * Missing rows are treated as empty.
 */
export function boardFrom(rows: readonly string[]): Board {
  const cells: Cell[] = [];
  for (let r = 0; r < BOARD_SIZE; r++) {
    const line = rows[r] ?? '........';
    for (let c = 0; c < BOARD_SIZE; c++) {
      cells.push((line[c] ?? '.') === '.' ? null : 'blue');
    }
  }
  return cells;
}

let pieceId = 1000;

export function piece(shapeId: string, color: BlockColor = 'red'): Piece {
  const shape = getShape(shapeId);
  if (!shape) throw new Error(`Unknown shape ${shapeId}`);
  return { id: pieceId++, shape, color };
}

/** A game with a hand-picked board and tray, for precise rule tests. */
export function stateWith(
  overrides: Partial<Omit<GameState, 'tray'>> & { tray?: readonly (string | null)[] },
): GameState {
  const base = newGame({ seed: 42 });
  const { tray, ...rest } = overrides;
  return {
    ...base,
    ...rest,
    tray: tray ? tray.map((id) => (id === null ? null : piece(id))) : base.tray,
  };
}
