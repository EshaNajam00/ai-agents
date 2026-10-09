import {
  canPlace,
  clearLines,
  createBoard,
  findFullLines,
  fitsAnywhere,
  isBoardEmpty,
  isInside,
  placeShape,
  shapeCellsAt,
} from './board';
import { COMBO_WINDOW, PERFECT_CLEAR_BONUS } from './constants';
import { generateTray } from './generator';
import { randomSeed } from './rng';
import { lineClearPoints } from './scoring';
import type { Board, GameEvent, GameState, PlacementPreview, PlaceResult, Tray } from './types';

export interface NewGameOptions {
  /** Seed for the piece generator. Defaults to a random seed. */
  readonly seed?: number;
  /** Best score from previous games. */
  readonly best?: number;
}

export function newGame(options: NewGameOptions = {}): GameState {
  const board = createBoard();
  const best = Math.max(0, Math.floor(options.best ?? 0));
  const { pieces, rngState, nextPieceId } = generateTray(board, options.seed ?? randomSeed(), 1);
  return {
    board,
    tray: pieces,
    score: 0,
    best,
    previousBest: best,
    combo: 0,
    movesSinceClear: 0,
    rngState,
    nextPieceId,
    gameOver: false,
  };
}

/** True when at least one piece still in the tray fits somewhere on the board. */
export function hasAnyMove(board: Board, tray: Tray): boolean {
  return tray.some((p) => p !== null && fitsAnywhere(board, p.shape));
}

/**
 * What would happen if tray piece `trayIndex` were dropped with its top-left at
 * (row, col). Used by the UI for the ghost preview and line highlights.
 */
export function previewPlacement(
  state: GameState,
  trayIndex: number,
  row: number,
  col: number,
): PlacementPreview {
  const piece = state.tray[trayIndex];
  if (!piece || state.gameOver) return { valid: false, cells: [], rows: [], cols: [] };

  const cells = shapeCellsAt(piece.shape, row, col);
  if (!canPlace(state.board, piece.shape, row, col)) {
    return {
      valid: false,
      cells: cells.filter((c) => isInside(c.row, c.col)),
      rows: [],
      cols: [],
    };
  }
  const { rows, cols } = findFullLines(placeShape(state.board, piece.shape, row, col, piece.color));
  return { valid: true, cells, rows, cols };
}

/** Places tray piece `trayIndex` with its top-left at (row, col). Never mutates `state`. */
export function place(state: GameState, trayIndex: number, row: number, col: number): PlaceResult {
  if (state.gameOver) return { ok: false, reason: 'gameOver' };
  const piece = state.tray[trayIndex];
  if (!piece) return { ok: false, reason: 'emptySlot' };
  if (!canPlace(state.board, piece.shape, row, col)) return { ok: false, reason: 'doesNotFit' };

  const events: GameEvent[] = [];
  let score = state.score;
  let combo = state.combo;
  let movesSinceClear = state.movesSinceClear;

  // 1. Stamp the piece.
  let board = placeShape(state.board, piece.shape, row, col, piece.color);
  const placePoints = piece.shape.cells.length;
  score += placePoints;
  events.push({
    type: 'placed',
    trayIndex,
    piece,
    cells: shapeCellsAt(piece.shape, row, col),
    points: placePoints,
  });

  // 2. Clear full lines and update the combo.
  const { rows, cols } = findFullLines(board);
  const lineCount = rows.length + cols.length;
  if (lineCount > 0) {
    combo += 1;
    movesSinceClear = 0;
    const cleared = clearLines(board, rows, cols);
    board = cleared.board;
    const points = lineClearPoints(lineCount) * combo;
    score += points;
    events.push({
      type: 'linesCleared',
      rows,
      cols,
      cells: cleared.cleared,
      lineCount,
      combo,
      points,
    });
    if (combo >= 2) events.push({ type: 'combo', combo });

    if (isBoardEmpty(board)) {
      score += PERFECT_CLEAR_BONUS;
      events.push({ type: 'perfectClear', points: PERFECT_CLEAR_BONUS });
    }
  } else {
    movesSinceClear += 1;
    if (combo > 0 && movesSinceClear >= COMBO_WINDOW) {
      combo = 0;
      events.push({ type: 'comboLost' });
    }
  }

  // 3. Best score. "New Best" fires once per game, and only if there was a best to beat.
  if (state.previousBest > 0 && state.score <= state.previousBest && score > state.previousBest) {
    events.push({ type: 'newBest', score });
  }
  const best = Math.max(state.best, score);

  // 4. Refill the tray when it is empty.
  let tray: Tray = state.tray.map((p, i) => (i === trayIndex ? null : p));
  let rngState = state.rngState;
  let nextPieceId = state.nextPieceId;
  if (tray.every((p) => p === null)) {
    const dealt = generateTray(board, rngState, nextPieceId);
    tray = dealt.pieces;
    rngState = dealt.rngState;
    nextPieceId = dealt.nextPieceId;
    events.push({ type: 'trayRefilled', tray: dealt.pieces });
  }

  // 5. Game over when nothing left in the tray fits.
  const gameOver = !hasAnyMove(board, tray);
  if (gameOver) {
    events.push({ type: 'gameOver', score, best, isNewBest: score > state.previousBest });
  }

  return {
    ok: true,
    events,
    state: {
      ...state,
      board,
      tray,
      score,
      best,
      combo,
      movesSinceClear,
      rngState,
      nextPieceId,
      gameOver,
    },
  };
}
