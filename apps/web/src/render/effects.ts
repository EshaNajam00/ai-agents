import type { ClearedCell, Point, Praise } from '@gridzy/core';
import { Sprite, Text } from 'pixi.js';
import type { Container } from 'pixi.js';
import { cellCenter } from './layout';
import type { Layout } from './layout';
import { BLOCK_HEX } from './palette';
import type { ParticleSystem } from './particles';
import type { BlockTextures } from './textures';
import { ease } from './tween';
import type { Tweens } from './tween';

export const GAME_FONT = '"Fredoka Variable", "Fredoka", ui-rounded, system-ui, sans-serif';

const PRAISE: Record<Praise, { text: string; color: number; size: number }> = {
  great: { text: 'Great!', color: 0x6ff3ff, size: 1 },
  amazing: { text: 'Amazing!', color: 0xffd23f, size: 1.08 },
  incredible: { text: 'Incredible!', color: 0xff8ae2, size: 1.15 },
};

const CONFETTI_COLORS = [...Object.values(BLOCK_HEX), 0xffffff];

export interface Banner {
  readonly text: string;
  readonly color: number;
  /** Font size in board cells. */
  readonly size: number;
}

export function praiseBanner(praise: Praise): Banner {
  return PRAISE[praise];
}

export function comboBanner(combo: number): Banner {
  // Grows and warms up as the combo climbs.
  const heat = Math.min(combo, 8);
  return {
    text: `Combo x${combo}`,
    color: heat >= 5 ? 0xff7a45 : 0xffb340,
    size: 0.6 + heat * 0.04,
  };
}

const rand = (min: number, max: number) => min + Math.random() * (max - min);

/** All the "juice": line-clear bursts, floating text, banners and confetti. */
export class Effects {
  constructor(
    private readonly blockLayer: Container,
    private readonly textLayer: Container,
    private readonly particles: ParticleSystem,
    private readonly tweens: Tweens,
    private readonly layout: () => Layout,
    private readonly textures: () => BlockTextures | null,
    private readonly reduceMotion: () => boolean,
  ) {}

  /** Cleared blocks flash white, then pop with shards and a sparkle, rippling from `origin`. */
  lineClear(cells: readonly ClearedCell[], origin: Point): void {
    const textures = this.textures();
    if (!textures) return;
    const layout = this.layout();
    const calm = this.reduceMotion();

    for (const c of cells) {
      const { x, y } = cellCenter(layout, c.row, c.col);
      const block = new Sprite(textures.blocks[c.color]);
      block.anchor.set(0.5);
      block.position.set(x, y);
      const flash = new Sprite(textures.flash);
      flash.anchor.set(0.5);
      flash.position.set(x, y);
      flash.alpha = 0;
      this.blockLayer.addChild(block, flash);

      if (calm) {
        this.tweens.add({
          target: block,
          duration: 200,
          update: (t) => {
            block.alpha = 1 - t;
            flash.alpha = 0;
          },
          complete: () => {
            block.destroy();
            flash.destroy();
          },
        });
        continue;
      }

      const delay = Math.hypot(c.row - origin.row, c.col - origin.col) * 32;
      const FLASH_MS = 90;
      const TOTAL_MS = 340;
      this.tweens.add({
        target: block,
        delay,
        duration: TOTAL_MS,
        ease: ease.linear,
        update: (t) => {
          const ms = t * TOTAL_MS;
          if (ms < FLASH_MS) {
            const u = ms / FLASH_MS;
            flash.alpha = 0.9 * u;
            block.scale.set(1 + 0.14 * u);
            flash.scale.set(1 + 0.14 * u);
          } else {
            const u = (ms - FLASH_MS) / (TOTAL_MS - FLASH_MS);
            const s = Math.max(0, 1.14 * (1 - ease.inBack(u)));
            flash.alpha = 0.9 * (1 - u) ** 2;
            block.scale.set(s);
            flash.scale.set(s);
            block.alpha = 1 - u * 0.5;
          }
        },
        complete: () => {
          block.destroy();
          flash.destroy();
        },
      });
      this.tweens.add({
        delay: delay + FLASH_MS,
        duration: 1,
        update: () => undefined,
        complete: () => this.burst(x, y, BLOCK_HEX[c.color], layout.cell),
      });
    }
  }

  private burst(x: number, y: number, color: number, cell: number): void {
    const textures = this.textures();
    if (!textures) return;
    for (let i = 0; i < 4; i++) {
      const angle = rand(0, Math.PI * 2);
      const speed = cell * rand(2.5, 6);
      this.particles.spawn({
        texture: textures.shard,
        x: x + rand(-cell * 0.2, cell * 0.2),
        y: y + rand(-cell * 0.2, cell * 0.2),
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed - cell * 4,
        gravity: cell * 24,
        spin: rand(-9, 9),
        rotation: rand(0, Math.PI),
        life: rand(0.5, 0.8),
        scale: rand(0.7, 1),
        endScale: 0.25,
        tint: color,
      });
    }
    this.particles.spawn({
      texture: textures.spark,
      x,
      y,
      vx: rand(-cell, cell),
      vy: rand(-cell * 2, -cell * 0.5),
      spin: rand(-3, 3),
      life: 0.45,
      scale: 0.3,
      endScale: 1.1,
      tint: Math.random() < 0.5 ? 0xffffff : 0xfff1a8,
    });
  }

  /** "+60" rising from the middle of the cleared cells. */
  floatPoints(points: number, cells: readonly Point[]): void {
    if (cells.length === 0) return;
    const layout = this.layout();
    const avg = cells.reduce(
      (sum, c) => ({ row: sum.row + c.row / cells.length, col: sum.col + c.col / cells.length }),
      { row: 0, col: 0 },
    );
    const { x, y } = cellCenter(layout, avg.row, avg.col);
    const text = makeText(`+${points}`, layout.cell * 0.62, 0xffffff);
    text.position.set(x, y);
    this.textLayer.addChild(text);
    const rise = this.reduceMotion() ? 0 : layout.cell * 1.3;
    this.tweens.add({
      target: text,
      duration: 900,
      ease: ease.outCubic,
      update: (t) => {
        text.y = y - rise * t;
        text.alpha = t < 0.6 ? 1 : 1 - (t - 0.6) / 0.4;
      },
      complete: () => text.destroy(),
    });
  }

  /** Big pop-in message over the board; `slot` stacks several banners vertically. */
  banner(banner: Banner, slot: number, delay = 0): void {
    const layout = this.layout();
    const size = layout.cell * banner.size;
    const text = makeText(banner.text, size, banner.color);
    const x = layout.boardX + layout.boardSize / 2;
    const y = layout.boardY + layout.boardSize * 0.4 + slot * layout.cell * 1.15;
    text.position.set(x, y);
    text.scale.set(0);
    this.textLayer.addChild(text);

    const calm = this.reduceMotion();
    const IN = 320;
    const HOLD = 600;
    const OUT = 420;
    const total = IN + HOLD + OUT;
    this.tweens.add({
      target: text,
      delay,
      duration: total,
      ease: ease.linear,
      update: (t) => {
        const ms = t * total;
        if (ms < IN) {
          const u = ms / IN;
          text.scale.set(calm ? 1 : ease.outBack(u));
          text.alpha = calm ? u : 1;
        } else if (ms < IN + HOLD) {
          text.scale.set(1);
          text.alpha = 1;
        } else {
          const u = (ms - IN - HOLD) / OUT;
          text.alpha = 1 - u;
          text.y = y - (calm ? 0 : layout.cell * 0.8 * ease.outCubic(u));
        }
      },
      complete: () => text.destroy(),
    });
  }

  /** Full-screen celebration. */
  confetti(): void {
    const textures = this.textures();
    if (!textures || this.reduceMotion()) return;
    const { width, height, cell } = this.layout();
    for (let i = 0; i < 150; i++) {
      this.particles.spawn({
        texture: textures.confetti,
        x: rand(0, width),
        y: -rand(10, height * 0.35),
        vx: rand(-cell * 2, cell * 2),
        vy: rand(cell * 4, cell * 9),
        gravity: cell * 5,
        drag: 0.55,
        spin: rand(-7, 7),
        rotation: rand(0, Math.PI),
        wobble: cell * 1.6,
        life: rand(2.2, 3.4),
        scale: rand(0.8, 1.3),
        tint: CONFETTI_COLORS[Math.floor(Math.random() * CONFETTI_COLORS.length)] ?? 0xffffff,
      });
    }
  }
}

export function makeText(content: string, size: number, fill: number): Text {
  const text = new Text({
    text: content,
    style: {
      fontFamily: GAME_FONT,
      fontSize: Math.round(size),
      fontWeight: '700',
      fill,
      align: 'center',
      stroke: { color: 0x2b1366, width: Math.max(3, Math.round(size * 0.14)), join: 'round' },
      dropShadow: {
        color: 0x14082e,
        alpha: 0.5,
        blur: 0,
        distance: Math.max(2, Math.round(size * 0.07)),
        angle: Math.PI / 2,
      },
    },
  });
  text.anchor.set(0.5);
  text.eventMode = 'none';
  return text;
}
