export const BOARD_SIZE = 8;
export const TRAY_SIZE = 3;

/** Points for clearing one line, before the multi-line and combo multipliers. */
export const LINE_CLEAR_BASE = 10;
/** Bonus awarded when a move leaves the board completely empty. */
export const PERFECT_CLEAR_BONUS = 300;
/** A combo survives as long as the next clear happens within this many placements. */
export const COMBO_WINDOW = 3;
/** How many random tray sets the generator tries before forcing a fitting piece. */
export const GENERATOR_ATTEMPTS = 10;

export const BLOCK_COLORS = ['yellow', 'orange', 'red', 'purple', 'blue', 'cyan', 'green'] as const;
