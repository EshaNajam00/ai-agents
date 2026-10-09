import type { Point, Shape } from './types';

/**
 * Builds a shape from a small ASCII drawing: `#` is a block, `.` is empty,
 * rows separated by `/`. Example: an L is "#./#./##".
 */
function shape(id: string, drawing: string, weight: number): Shape {
  const rows = drawing.split('/');
  const cells: Point[] = [];
  rows.forEach((line, row) => {
    [...line].forEach((ch, col) => {
      if (ch === '#') cells.push({ row, col });
    });
  });
  return {
    id,
    cells,
    height: rows.length,
    width: Math.max(...rows.map((r) => r.length)),
    weight,
  };
}

/**
 * Every piece Gridzy can deal. Pieces never rotate, so each orientation is listed
 * separately. Weights are per orientation: families with many orientations use a
 * lower weight so no single family floods the tray.
 */
export const SHAPES: readonly Shape[] = [
  shape('dot', '#', 6),

  shape('line2h', '##', 6),
  shape('line2v', '#/#', 6),
  shape('line3h', '###', 6),
  shape('line3v', '#/#/#', 6),
  shape('line4h', '####', 4),
  shape('line4v', '#/#/#/#', 4),
  shape('line5h', '#####', 3),
  shape('line5v', '#/#/#/#/#', 3),

  shape('square2', '##/##', 8),
  shape('square3', '###/###/###', 3),
  shape('rect2x3', '###/###', 3),
  shape('rect3x2', '##/##/##', 3),

  shape('l3a', '#./##', 4),
  shape('l3b', '.#/##', 4),
  shape('l3c', '##/#.', 4),
  shape('l3d', '##/.#', 4),

  shape('l4a', '#./#./##', 2),
  shape('l4b', '.#/.#/##', 2),
  shape('l4c', '##/#./#.', 2),
  shape('l4d', '##/.#/.#', 2),
  shape('l4e', '###/#..', 2),
  shape('l4f', '###/..#', 2),
  shape('l4g', '#../###', 2),
  shape('l4h', '..#/###', 2),

  shape('l5a', '#../#../###', 2),
  shape('l5b', '..#/..#/###', 2),
  shape('l5c', '###/#../#..', 2),
  shape('l5d', '###/..#/..#', 2),

  shape('t4up', '.#./###', 3),
  shape('t4down', '###/.#.', 3),
  shape('t4left', '.#/##/.#', 3),
  shape('t4right', '#./##/#.', 3),

  shape('s4h', '.##/##.', 3),
  shape('s4v', '#./##/.#', 3),
  shape('z4h', '##./.##', 3),
  shape('z4v', '.#/##/#.', 3),
];

export function getShape(id: string): Shape | undefined {
  return SHAPES.find((s) => s.id === id);
}
