import { Container, Graphics } from 'pixi.js';
import type { Ticker } from 'pixi.js';
import { ease } from './tween';

interface HintPath {
  readonly from: { x: number; y: number; scale: number };
  readonly to: { x: number; y: number };
}

const CYCLE_MS = 2300;

/** A friendly cartoon hand (drawn in code) with its fingertip at (0, 0). */
function drawHand(cell: number): Graphics {
  const c = cell;
  const outline = { width: Math.max(2, c * 0.05), color: 0x2b1366 };
  const g = new Graphics();
  g.roundRect(-c * 0.11, 0, c * 0.22, c * 0.62, c * 0.11)
    .fill(0xffffff)
    .stroke(outline);
  g.roundRect(-c * 0.18, c * 0.42, c * 0.62, c * 0.5, c * 0.16)
    .fill(0xffffff)
    .stroke(outline);
  g.roundRect(-c * 0.32, c * 0.5, c * 0.26, c * 0.16, c * 0.08)
    .fill(0xffffff)
    .stroke(outline);
  // Cover the seam between finger and palm.
  g.rect(-c * 0.08, c * 0.44, c * 0.16, c * 0.1).fill(0xffffff);
  return g;
}

/**
 * Tutorial demo: a hand picks up a ghost copy of the piece, drags it to the target,
 * presses, and fades, on a loop until the player moves.
 */
export class TutorialHint {
  private readonly root = new Container();
  private readonly ring = new Graphics();
  private readonly hand: Graphics;
  private elapsed = 0;

  constructor(
    layer: Container,
    private readonly ticker: Ticker,
    private readonly piece: Container,
    private readonly path: HintPath,
    private readonly cell: number,
  ) {
    this.hand = drawHand(cell);
    this.ring.circle(0, 0, cell * 0.45).stroke({ width: cell * 0.08, color: 0xffffff });
    this.piece.alpha = 0.75;
    this.root.addChild(this.piece, this.ring, this.hand);
    this.root.eventMode = 'none';
    layer.addChild(this.root);
    ticker.add(this.tick);
    this.render();
  }

  /** Hidden while the player is dragging, restarted from the beginning afterwards. */
  setPaused(paused: boolean): void {
    this.root.visible = !paused;
    this.elapsed = 0;
  }

  destroy(): void {
    this.ticker.remove(this.tick);
    this.root.destroy({ children: true });
  }

  private tick = (ticker: Ticker): void => {
    if (!this.root.visible) return;
    this.elapsed = (this.elapsed + ticker.deltaMS) % CYCLE_MS;
    this.render();
  };

  private render(): void {
    const ms = this.elapsed;
    const { from, to } = this.path;
    let x = from.x;
    let y = from.y;
    let scale = from.scale;
    let alpha = 1;
    let press = 0;
    let ring = 0;

    if (ms < 250) {
      alpha = ms / 250;
    } else if (ms < 400) {
      const u = (ms - 250) / 150;
      press = Math.sin(u * Math.PI);
      scale = from.scale + (1 - from.scale) * ease.outBack(u);
    } else if (ms < 1450) {
      const u = ease.outCubic((ms - 400) / 1050);
      x = from.x + (to.x - from.x) * u;
      y = from.y + (to.y - from.y) * u;
      scale = 1;
    } else if (ms < 1800) {
      const u = (ms - 1450) / 350;
      x = to.x;
      y = to.y;
      scale = 1;
      press = Math.sin(u * Math.PI);
      ring = u;
    } else if (ms < 2100) {
      x = to.x;
      y = to.y;
      scale = 1;
      alpha = 1 - (ms - 1800) / 300;
    } else {
      alpha = 0;
    }

    this.root.alpha = alpha;
    this.piece.position.set(x, y);
    this.piece.scale.set(scale);
    const tip = this.cell * 0.35;
    this.hand.position.set(x + tip, y + tip);
    this.hand.scale.set(1.25 - press * 0.12);
    this.ring.position.set(x, y);
    this.ring.visible = ring > 0;
    this.ring.scale.set(0.6 + ring * 1.4);
    this.ring.alpha = 1 - ring;
  }
}
