import type { BlockColor } from '@gridzy/core';

export const BLOCK_HEX: Record<BlockColor, number> = {
  yellow: 0xffc93c,
  orange: 0xff8a2b,
  red: 0xf04a4a,
  purple: 0xa15cf0,
  blue: 0x3f7cf5,
  cyan: 0x2fd3e8,
  green: 0x3dcb5c,
};

export const BOARD_HEX = {
  panel: 0x161c46,
  panelBorder: 0x2c3784,
  emptyCell: 0x1f275c,
  emptyCellShade: 0x1a2150,
};

/** Mixes `color` toward white (amount > 0) or black (amount < 0). */
export function shade(color: number, amount: number): number {
  const target = amount > 0 ? 255 : 0;
  const t = Math.min(1, Math.abs(amount));
  const mix = (c: number) => Math.round(c + (target - c) * t);
  const r = mix((color >> 16) & 0xff);
  const g = mix((color >> 8) & 0xff);
  const b = mix(color & 0xff);
  return (r << 16) | (g << 8) | b;
}
