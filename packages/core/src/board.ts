import { BOARD_SIZE } from './constants';
import type { BlockColor, Board, Cell, ClearedCell, Point, Shape } from './types';

export function createBoard(): Board {
  return new Array<Cell>(BOARD_SIZE * BOARD_SIZE).fill(null);
}

export function cellIndex(row: number, col: number): number {
  return row * BOARD_SIZE + col;
}

export function getCell(board: Board, row: number, col: number): Cell {
  return board[cellIndex(row, col)] ?? null;
}

export function isInside(row: number, col: number): boolean {
  return row >= 0 && row < BOARD_SIZE && col >= 0 && col < BOARD_SIZE;
}

/** Board cells covered by `shape` when its top-left corner sits at (row, col). */
export function shapeCellsAt(shape: Shape, row: number, col: number): Point[] {
  return shape.cells.map((c) => ({ row: row + c.row, col: col + c.col }));
}

export function canPlace(board: Board, shape: Shape, row: number, col: number): boolean {
  return shape.cells.every((c) => {
    const r = row + c.row;
    const k = col + c.col;
    return isInside(r, k) && getCell(board, r, k) === null;
  });
}

export function fitsAnywhere(board: Board, shape: Shape): boolean {
  for (let row = 0; row <= BOARD_SIZE - shape.height; row++) {
    for (let col = 0; col <= BOARD_SIZE - shape.width; col++) {
      if (canPlace(board, shape, row, col)) return true;
    }
  }
  return false;
}

/** Returns a new board with the shape stamped in. Caller must check `canPlace` first. */
export function placeShape(
  board: Board,
  shape: Shape,
  row: number,
  col: number,
  color: BlockColor,
): Board {
  const next = board.slice();
  for (const p of shapeCellsAt(shape, row, col)) next[cellIndex(p.row, p.col)] = color;
  return next;
}

export function findFullLines(board: Board): { rows: number[]; cols: number[] } {
  const rows: number[] = [];
  const cols: number[] = [];
  for (let i = 0; i < BOARD_SIZE; i++) {
    let rowFull = true;
    let colFull = true;
    for (let j = 0; j < BOARD_SIZE; j++) {
      if (getCell(board, i, j) === null) rowFull = false;
      if (getCell(board, j, i) === null) colFull = false;
    }
    if (rowFull) rows.push(i);
    if (colFull) cols.push(i);
  }
  return { rows, cols };
}

/**
 * Empties the given rows and columns. A cell shared by a cleared row and column is
 * reported once.
 */
export function clearLines(
  board: Board,
  rows: readonly number[],
  cols: readonly number[],
): { board: Board; cleared: ClearedCell[] } {
  const next = board.slice();
  const cleared: ClearedCell[] = [];
  const rowSet = new Set(rows);
  const colSet = new Set(cols);
  for (let row = 0; row < BOARD_SIZE; row++) {
    for (let col = 0; col < BOARD_SIZE; col++) {
      if (!rowSet.has(row) && !colSet.has(col)) continue;
      const color = getCell(board, row, col);
      if (color === null) continue;
      cleared.push({ row, col, color });
      next[cellIndex(row, col)] = null;
    }
  }
  return { board: next, cleared };
}

export function isBoardEmpty(board: Board): boolean {
  return board.every((c) => c === null);
}
