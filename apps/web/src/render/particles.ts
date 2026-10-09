import { Sprite } from 'pixi.js';
import type { Container, Texture, Ticker } from 'pixi.js';

export interface ParticleOptions {
  readonly texture: Texture;
  readonly x: number;
  readonly y: number;
  /** Pixels per second. */
  readonly vx: number;
  readonly vy: number;
  /** Pixels per second squared (positive = down). */
  readonly gravity?: number;
  /** Fraction of velocity kept per second, for air drag (1 = none). */
  readonly drag?: number;
  /** Radians per second. */
  readonly spin?: number;
  /** Seconds. */
  readonly life: number;
  readonly scale: number;
  readonly endScale?: number;
  readonly tint: number;
  readonly rotation?: number;
  /** Side-to-side flutter amplitude in px/s, for confetti. */
  readonly wobble?: number;
}

interface Particle {
  readonly sprite: Sprite;
  vx: number;
  vy: number;
  gravity: number;
  drag: number;
  spin: number;
  age: number;
  life: number;
  scale: number;
  endScale: number;
  wobble: number;
  phase: number;
}

const MAX_PARTICLES = 700;

/**
 * Pooled particle system: sprites are reused, never allocated per frame, so bursts and
 * confetti stay smooth on phones.
 */
export class ParticleSystem {
  private readonly active: Particle[] = [];
  private readonly pool: Particle[] = [];

  constructor(
    private readonly layer: Container,
    private readonly ticker: Ticker,
  ) {
    ticker.add(this.tick);
  }

  get count(): number {
    return this.active.length;
  }

  spawn(o: ParticleOptions): void {
    if (this.active.length >= MAX_PARTICLES) return;
    const p = this.pool.pop() ?? this.create();
    const s = p.sprite;
    s.texture = o.texture;
    s.position.set(o.x, o.y);
    s.rotation = o.rotation ?? 0;
    s.scale.set(o.scale);
    s.tint = o.tint;
    s.alpha = 1;
    s.visible = true;
    p.vx = o.vx;
    p.vy = o.vy;
    p.gravity = o.gravity ?? 0;
    p.drag = o.drag ?? 1;
    p.spin = o.spin ?? 0;
    p.age = 0;
    p.life = o.life;
    p.scale = o.scale;
    p.endScale = o.endScale ?? o.scale;
    p.wobble = o.wobble ?? 0;
    p.phase = Math.random() * Math.PI * 2;
    this.active.push(p);
  }

  /** Removes every live particle (e.g. on resize). */
  clear(): void {
    for (const p of this.active) {
      p.sprite.visible = false;
      this.pool.push(p);
    }
    this.active.length = 0;
  }

  destroy(): void {
    this.ticker.remove(this.tick);
    this.clear();
    for (const p of this.pool) p.sprite.destroy();
    this.pool.length = 0;
  }

  private create(): Particle {
    const sprite = new Sprite();
    sprite.anchor.set(0.5);
    this.layer.addChild(sprite);
    return {
      sprite,
      vx: 0,
      vy: 0,
      gravity: 0,
      drag: 1,
      spin: 0,
      age: 0,
      life: 1,
      scale: 1,
      endScale: 1,
      wobble: 0,
      phase: 0,
    };
  }

  private tick = (ticker: Ticker): void => {
    const dt = Math.min(ticker.deltaMS, 50) / 1000;
    for (let i = this.active.length - 1; i >= 0; i--) {
      const p = this.active[i] as Particle;
      p.age += dt;
      if (p.age >= p.life) {
        p.sprite.visible = false;
        this.pool.push(p);
        // Swap-remove: O(1), no allocation.
        this.active[i] = this.active[this.active.length - 1] as Particle;
        this.active.pop();
        continue;
      }
      const t = p.age / p.life;
      const keep = p.drag ** dt;
      p.vx *= keep;
      p.vy = p.vy * keep + p.gravity * dt;
      const s = p.sprite;
      s.x += (p.vx + Math.sin(p.phase + p.age * 9) * p.wobble) * dt;
      s.y += p.vy * dt;
      s.rotation += p.spin * dt;
      s.scale.set(p.scale + (p.endScale - p.scale) * t);
      s.alpha = t < 0.7 ? 1 : 1 - (t - 0.7) / 0.3;
    }
  };
}
