import { BOARD_SIZE, TRAY_SIZE } from '@gridzy/core';

export interface Layout {
  readonly width: number;
  readonly height: number;
  readonly cell: number;
  readonly boardX: number;
  readonly boardY: number;
  readonly boardSize: number;
  readonly trayY: number;
  readonly trayH: number;
  readonly slotW: number;
  /** Scale of pieces resting in the tray (1 = board size). */
  readonly trayScale: number;
}

const MAX_BOARD_PX = 560;

/** Fits the board and tray into the available area, portrait-first. */
export function computeLayout(width: number, height: number): Layout {
  const pad = Math.max(12, Math.min(width, height) * 0.04);
  // Board (8 cells) + gap + tray (~3.2 cells) ≈ 11.9 cells tall.
  const maxBoard = Math.min(
    width - pad * 2,
    ((height - pad * 2) * BOARD_SIZE) / 11.9,
    MAX_BOARD_PX,
  );
  const cell = Math.max(8, Math.floor(maxBoard / BOARD_SIZE));
  const boardSize = cell * BOARD_SIZE;
  const gap = cell * 0.6;
  const trayH = cell * 3.2;
  const total = boardSize + gap + trayH;
  const boardY = Math.round(Math.max(pad, (height - total) / 2));
  const slotW = boardSize / TRAY_SIZE;
  return {
    width,
    height,
    cell,
    boardX: Math.round((width - boardSize) / 2),
    boardY,
    boardSize,
    trayY: boardY + boardSize + gap,
    trayH,
    slotW,
    // 5-long pieces must fit their slot.
    trayScale: Math.min(0.55, (slotW * 0.88) / (5 * cell)),
  };
}

export function cellCenter(layout: Layout, row: number, col: number): { x: number; y: number } {
  return {
    x: layout.boardX + (col + 0.5) * layout.cell,
    y: layout.boardY + (row + 0.5) * layout.cell,
  };
}

export function slotCenter(layout: Layout, index: number): { x: number; y: number } {
  return {
    x: layout.boardX + layout.slotW * (index + 0.5),
    y: layout.trayY + layout.trayH / 2,
  };
}
