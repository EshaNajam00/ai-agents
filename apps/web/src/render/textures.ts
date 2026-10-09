import { BLOCK_COLORS } from '@gridzy/core';
import type { BlockColor } from '@gridzy/core';
import { Graphics, Rectangle } from 'pixi.js';
import type { Renderer, Texture } from 'pixi.js';
import { BLOCK_HEX, BOARD_HEX, shade } from './palette';

export interface BlockTextures {
  readonly blocks: Record<BlockColor, Texture>;
  readonly empty: Texture;
  /** White block silhouette, for the flash before a line pops. */
  readonly flash: Texture;
  /** Particle textures, all white so they can be tinted. */
  readonly shard: Texture;
  readonly spark: Texture;
  readonly confetti: Texture;
  destroy(): void;
}

/** Glossy, beveled "candy" block drawn entirely in code (no image assets). */
function drawBlock(g: Graphics, size: number, color: number): void {
  const m = size * 0.035; // gap between cells
  const b = size * 0.13; // bevel width
  const lo = m;
  const hi = size - m;

  g.roundRect(lo, lo, hi - lo, hi - lo, size * 0.08).fill(shade(color, -0.42));
  // Bevels: light from the top-left, shadow toward the bottom-right.
  g.poly([lo, lo, hi, lo, hi - b, lo + b, lo + b, lo + b]).fill(shade(color, 0.45));
  g.poly([lo, lo, lo + b, lo + b, lo + b, hi - b, lo, hi]).fill(shade(color, 0.22));
  g.poly([hi, lo, hi, hi, hi - b, hi - b, hi - b, lo + b]).fill(shade(color, -0.18));
  g.poly([lo, hi, hi, hi, hi - b, hi - b, lo + b, hi - b]).fill(shade(color, -0.34));

  // Face, slightly darker toward the bottom for a rounded feel.
  const face = hi - lo - b * 2;
  g.rect(lo + b, lo + b, face, face).fill(color);
  g.rect(lo + b, lo + b + face * 0.55, face, face * 0.45).fill({ color: 0x000000, alpha: 0.07 });

  // Shine.
  g.roundRect(lo + b + face * 0.1, lo + b + face * 0.1, face * 0.42, face * 0.16, face * 0.08).fill(
    {
      color: 0xffffff,
      alpha: 0.6,
    },
  );
  g.circle(lo + b + face * 0.62, lo + b + face * 0.18, face * 0.07).fill({
    color: 0xffffff,
    alpha: 0.45,
  });
}

function drawEmpty(g: Graphics, size: number): void {
  const m = size * 0.035;
  g.roundRect(m, m, size - m * 2, size - m * 2, size * 0.08).fill(BOARD_HEX.emptyCellShade);
  g.roundRect(m, m + size * 0.04, size - m * 2, size - m * 2 - size * 0.04, size * 0.08).fill(
    BOARD_HEX.emptyCell,
  );
}

/** Four-pointed twinkle star filling a `size` × `size` square. */
function drawSpark(g: Graphics, size: number): void {
  const c = size / 2;
  const inner = size * 0.09;
  g.poly([
    c,
    0,
    c + inner,
    c - inner,
    size,
    c,
    c + inner,
    c + inner,
    c,
    size,
    c - inner,
    c + inner,
    0,
    c,
    c - inner,
    c - inner,
  ]).fill(0xffffff);
  g.circle(c, c, size * 0.12).fill(0xffffff);
}

export function createBlockTextures(renderer: Renderer, size: number): BlockTextures {
  const bake = (w: number, h: number, draw: (g: Graphics) => void): Texture => {
    const g = new Graphics();
    draw(g);
    const texture = renderer.generateTexture({
      target: g,
      frame: new Rectangle(0, 0, w, h),
      antialias: true,
    });
    g.destroy();
    return texture;
  };

  const blocks = Object.fromEntries(
    BLOCK_COLORS.map((c) => [c, bake(size, size, (g) => drawBlock(g, size, BLOCK_HEX[c]))]),
  ) as Record<BlockColor, Texture>;
  const empty = bake(size, size, (g) => drawEmpty(g, size));
  const m = size * 0.035;
  const flash = bake(size, size, (g) =>
    g.roundRect(m, m, size - m * 2, size - m * 2, size * 0.08).fill(0xffffff),
  );
  const shardSize = Math.max(4, Math.round(size * 0.26));
  const shard = bake(shardSize, shardSize, (g) =>
    g.roundRect(0, 0, shardSize, shardSize, shardSize * 0.2).fill(0xffffff),
  );
  const sparkSize = Math.max(8, Math.round(size * 0.6));
  const spark = bake(sparkSize, sparkSize, (g) => drawSpark(g, sparkSize));
  const confetti = bake(
    Math.max(6, Math.round(size * 0.22)),
    Math.max(3, Math.round(size * 0.12)),
    (g) => g.rect(0, 0, size, size).fill(0xffffff),
  );

  const all = [...Object.values(blocks), empty, flash, shard, spark, confetti];
  return {
    blocks,
    empty,
    flash,
    shard,
    spark,
    confetti,
    destroy() {
      for (const t of all) t.destroy(true);
    },
  };
}
