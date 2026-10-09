import type { Ticker } from 'pixi.js';

export type Ease = (t: number) => number;

export const ease = {
  linear: (t: number) => t,
  outCubic: (t: number) => 1 - (1 - t) ** 3,
  inCubic: (t: number) => t ** 3,
  outBack: (t: number) => {
    const c1 = 1.70158;
    const c3 = c1 + 1;
    return 1 + c3 * (t - 1) ** 3 + c1 * (t - 1) ** 2;
  },
  inBack: (t: number) => {
    const c1 = 1.70158;
    return (c1 + 1) * t ** 3 - c1 * t ** 2;
  },
} satisfies Record<string, Ease>;

export interface TweenOptions {
  /** Milliseconds. */
  readonly duration: number;
  readonly delay?: number;
  readonly ease?: Ease;
  /** The display object being animated; the tween stops silently once it is destroyed. */
  readonly target?: { readonly destroyed: boolean };
  /** Called every frame with eased progress in [0, 1] (may overshoot for "back" easings). */
  readonly update: (progress: number) => void;
  readonly complete?: () => void;
}

export interface TweenHandle {
  cancel(): void;
}

interface ActiveTween {
  readonly options: TweenOptions;
  elapsed: number;
  done: boolean;
}

/**
 * Tiny time-based tween runner driven by the Pixi ticker, so animations take the same
 * time on 60 Hz and 120 Hz screens.
 */
export class Tweens {
  private active: ActiveTween[] = [];

  constructor(private readonly ticker: Ticker) {
    ticker.add(this.tick);
  }

  add(options: TweenOptions): TweenHandle {
    const tween: ActiveTween = { options, elapsed: -(options.delay ?? 0), done: false };
    this.active.push(tween);
    return { cancel: () => (tween.done = true) };
  }

  /** Stops every running tween without calling `complete`. */
  clear(): void {
    for (const t of this.active) t.done = true;
    this.active = [];
  }

  destroy(): void {
    this.clear();
    this.ticker.remove(this.tick);
  }

  private tick = (ticker: Ticker): void => {
    const dt = ticker.deltaMS;
    // Iterate over a snapshot: callbacks may add new tweens.
    for (const tween of [...this.active]) {
      if (tween.done) continue;
      if (tween.options.target?.destroyed) {
        tween.done = true;
        continue;
      }
      tween.elapsed += dt;
      if (tween.elapsed < 0) continue;
      const { duration, update, complete } = tween.options;
      const t = Math.min(1, tween.elapsed / duration);
      update((tween.options.ease ?? ease.outCubic)(t));
      if (t >= 1) {
        tween.done = true;
        complete?.();
      }
    }
    this.active = this.active.filter((t) => !t.done);
  };
}
