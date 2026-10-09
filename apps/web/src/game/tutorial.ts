import { BOARD_SIZE, cellIndex, getShape, newGame } from '@gridzy/core';
import type { Cell, GameState, Shape } from '@gridzy/core';

/** Where the tutorial asks the player to drop its single piece. */
export interface Hint {
  readonly trayIndex: number;
  readonly row: number;
  readonly col: number;
}

export const TUTORIAL_HINT: Hint = { trayIndex: 1, row: 4, col: 3 };

const ROW_COLORS = ['purple', 'blue', 'cyan', 'green', 'green', 'orange', 'red', 'yellow'] as const;

/**
 * A hand-made board: row 4 is full except two cells, and the tray holds one 2-long
 * piece that completes it. A few extra blocks keep the board from looking empty.
 */
export function createTutorialGame(best: number): GameState {
  const base = newGame({ best, seed: 2026 });
  const board: Cell[] = [...base.board];

  for (let col = 0; col < BOARD_SIZE; col++) {
    if (col === TUTORIAL_HINT.col || col === TUTORIAL_HINT.col + 1) continue;
    board[cellIndex(TUTORIAL_HINT.row, col)] = ROW_COLORS[col] ?? 'blue';
  }
  for (const [row, col] of [
    [5, 0],
    [5, 1],
    [6, 0],
    [5, 7],
    [6, 7],
    [7, 7],
  ] as const) {
    board[cellIndex(row, col)] = 'blue';
  }

  const shape = getShape('line2h') as Shape;
  return {
    ...base,
    board,
    tray: [null, { id: 900_001, shape, color: 'yellow' }, null],
  };
}
