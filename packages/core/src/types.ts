import type { BLOCK_COLORS } from './constants';

export type BlockColor = (typeof BLOCK_COLORS)[number];

/** A filled cell holds its color; an empty cell is `null`. */
export type Cell = BlockColor | null;

/** Row-major board of `BOARD_SIZE * BOARD_SIZE` cells. Index = row * BOARD_SIZE + col. */
export type Board = readonly Cell[];

export interface Point {
  readonly row: number;
  readonly col: number;
}

export interface Shape {
  readonly id: string;
  /** Cell offsets from the top-left of the shape's bounding box. */
  readonly cells: readonly Point[];
  readonly width: number;
  readonly height: number;
  /** Relative chance of being picked by the generator. */
  readonly weight: number;
}

export interface Piece {
  /** Unique within a game; handy as a UI key. */
  readonly id: number;
  readonly shape: Shape;
  readonly color: BlockColor;
}

export type Tray = readonly (Piece | null)[];

export interface GameState {
  readonly board: Board;
  readonly tray: Tray;
  readonly score: number;
  /** Best score including the current game. */
  readonly best: number;
  /** Best score before this game started. */
  readonly previousBest: number;
  /** Current combo streak; 0 when no combo is active. */
  readonly combo: number;
  /** Placements since the last line clear. */
  readonly movesSinceClear: number;
  readonly rngState: number;
  readonly nextPieceId: number;
  readonly gameOver: boolean;
}

export interface ClearedCell extends Point {
  readonly color: BlockColor;
}

export type GameEvent =
  | {
      readonly type: 'placed';
      readonly trayIndex: number;
      readonly piece: Piece;
      readonly cells: readonly Point[];
      readonly points: number;
    }
  | {
      readonly type: 'linesCleared';
      readonly rows: readonly number[];
      readonly cols: readonly number[];
      readonly cells: readonly ClearedCell[];
      readonly lineCount: number;
      readonly combo: number;
      readonly points: number;
    }
  | { readonly type: 'combo'; readonly combo: number }
  | { readonly type: 'comboLost' }
  | { readonly type: 'perfectClear'; readonly points: number }
  | { readonly type: 'newBest'; readonly score: number }
  | { readonly type: 'trayRefilled'; readonly tray: readonly Piece[] }
  | {
      readonly type: 'gameOver';
      readonly score: number;
      readonly best: number;
      readonly isNewBest: boolean;
    };

export type PlaceFailure = 'gameOver' | 'emptySlot' | 'doesNotFit';

export type PlaceResult =
  | { readonly ok: true; readonly state: GameState; readonly events: readonly GameEvent[] }
  | { readonly ok: false; readonly reason: PlaceFailure };

export interface PlacementPreview {
  readonly valid: boolean;
  /** Board cells the piece would occupy (only in-bounds cells when invalid). */
  readonly cells: readonly Point[];
  /** Rows and columns that would be cleared if the piece were dropped here. */
  readonly rows: readonly number[];
  readonly cols: readonly number[];
}
