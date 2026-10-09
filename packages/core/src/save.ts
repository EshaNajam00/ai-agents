import { BOARD_SIZE, BLOCK_COLORS, TRAY_SIZE } from './constants';
import { hasAnyMove } from './game';
import { getShape } from './shapes';
import type { BlockColor, Cell, GameState, Piece } from './types';

/** Bump when the saved shape changes; older saves are then discarded safely. */
export const SAVE_VERSION = 1;

/** Plain-JSON snapshot of a game. Shapes are stored by id, never as raw cells. */
export interface SavedGame {
  readonly v: typeof SAVE_VERSION;
  readonly board: readonly Cell[];
  readonly tray: readonly ({
    readonly id: number;
    readonly shape: string;
    readonly color: BlockColor;
  } | null)[];
  readonly score: number;
  readonly best: number;
  readonly previousBest: number;
  readonly combo: number;
  readonly movesSinceClear: number;
  readonly rngState: number;
  readonly nextPieceId: number;
}

export function serializeGame(state: GameState): SavedGame {
  return {
    v: SAVE_VERSION,
    board: [...state.board],
    tray: state.tray.map((p) => (p ? { id: p.id, shape: p.shape.id, color: p.color } : null)),
    score: state.score,
    best: state.best,
    previousBest: state.previousBest,
    combo: state.combo,
    movesSinceClear: state.movesSinceClear,
    rngState: state.rngState,
    nextPieceId: state.nextPieceId,
  };
}

const MAX_SAFE_SCORE = 1_000_000_000;

function isCount(value: unknown, max = MAX_SAFE_SCORE): value is number {
  return typeof value === 'number' && Number.isSafeInteger(value) && value >= 0 && value <= max;
}

function isColor(value: unknown): value is BlockColor {
  return typeof value === 'string' && (BLOCK_COLORS as readonly string[]).includes(value);
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

/**
 * Rebuilds a game from untrusted saved data (it may be corrupted, edited or from an
 * older version). Returns null instead of throwing when anything looks wrong.
 */
export function restoreGame(data: unknown): GameState | null {
  if (!isRecord(data) || data.v !== SAVE_VERSION) return null;

  const { board, tray, score, best, previousBest, combo, movesSinceClear, rngState, nextPieceId } =
    data;

  if (!Array.isArray(board) || board.length !== BOARD_SIZE * BOARD_SIZE) return null;
  if (!board.every((c) => c === null || isColor(c))) return null;

  if (!Array.isArray(tray) || tray.length !== TRAY_SIZE) return null;
  const pieces: (Piece | null)[] = [];
  for (const item of tray as unknown[]) {
    if (item === null) {
      pieces.push(null);
      continue;
    }
    if (!isRecord(item) || !isCount(item.id) || !isColor(item.color)) return null;
    const shape = typeof item.shape === 'string' ? getShape(item.shape) : undefined;
    if (!shape) return null;
    pieces.push({ id: item.id, shape, color: item.color });
  }
  if (pieces.every((p) => p === null)) return null;

  if (!isCount(score) || !isCount(best) || !isCount(previousBest)) return null;
  if (!isCount(combo, 10_000) || !isCount(movesSinceClear, 10_000)) return null;
  if (!isCount(nextPieceId)) return null;
  if (typeof rngState !== 'number' || !Number.isSafeInteger(rngState)) return null;
  if (best < score || best < previousBest) return null;

  const restoredBoard = board as Cell[];
  return {
    board: restoredBoard,
    tray: pieces,
    score,
    best,
    previousBest,
    combo,
    movesSinceClear,
    rngState: rngState | 0,
    nextPieceId,
    gameOver: !hasAnyMove(restoredBoard, pieces),
  };
}
