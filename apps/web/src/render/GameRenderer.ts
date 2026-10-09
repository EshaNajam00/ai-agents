import 'pixi.js/unsafe-eval'; // Lets Pixi run under our strict CSP (no eval).
import { BOARD_SIZE, TRAY_SIZE, cellIndex, praiseFor, previewPlacement } from '@gridzy/core';
import type { Piece, PlacementPreview, Point } from '@gridzy/core';
import { Application, Container, Graphics, Rectangle, Sprite } from 'pixi.js';
import type { FederatedPointerEvent, Point as PixiPoint } from 'pixi.js';
import type { FeedbackActions } from '../game/feedback';
import type { GameStore, StoreEvent } from '../game/GameStore';
import type { SettingsStore } from '../game/settings';
import { comboBanner, Effects, GAME_FONT, praiseBanner } from './effects';
import type { Banner } from './effects';
import { TutorialHint } from './hint';
import { cellCenter, computeLayout, slotCenter } from './layout';
import type { Layout } from './layout';
import { BOARD_HEX } from './palette';
import { ParticleSystem } from './particles';
import { createBlockTextures } from './textures';
import type { BlockTextures } from './textures';
import { ease, Tweens } from './tween';

interface Drag {
  readonly index: number;
  readonly piece: Piece;
  readonly view: Container;
  /** Extra upward offset so a finger doesn't cover the piece. */
  readonly lift: number;
  target: Point | null;
  overBoard: boolean;
}

export interface RendererOptions {
  readonly settings: SettingsStore;
  readonly feedback: FeedbackActions;
}

const GHOST_ALPHA = 0.4;
const MAX_PIECE_CELLS = 9;
const GAME_OVER_TINT = 0x6a6a86;
const GAME_OVER_ROW_MS = 70;

/**
 * Draws the board and tray with PixiJS, handles drag and drop, and plays the visual
 * effects. It reads state from the store and only changes the game via `store.place`.
 */
export class GameRenderer {
  private readonly tweens: Tweens;
  private readonly particles: ParticleSystem;
  private readonly effects: Effects;
  private readonly unsubscribe: () => void;

  private layout!: Layout;
  private textures: BlockTextures | null = null;

  private readonly boardLayer = new Container();
  private readonly ghostLayer = new Container();
  private readonly trayLayer = new Container();
  private readonly fxLayer = new Container();
  private readonly particleLayer = new Container();
  private readonly textLayer = new Container();
  private readonly dragLayer = new Container();
  private readonly hintLayer = new Container();

  private cellSprites: Sprite[] = [];
  private ghostSprites: Sprite[] = [];
  private trayViews: (Container | null)[] = [];
  private trayPieceIds: (number | null)[] = [];
  private drag: Drag | null = null;
  private hint: TutorialHint | null = null;
  /** How many rows are grayed out by the game-over animation. */
  private grayRows = 0;

  private constructor(
    private readonly app: Application,
    private readonly store: GameStore,
    private readonly options: RendererOptions,
  ) {
    this.tweens = new Tweens(app.ticker);
    this.particles = new ParticleSystem(this.particleLayer, app.ticker);
    this.effects = new Effects(
      this.fxLayer,
      this.textLayer,
      this.particles,
      this.tweens,
      () => this.layout,
      () => this.textures,
      () => options.settings.get().reduceMotion,
    );

    app.stage.addChild(
      this.boardLayer,
      this.ghostLayer,
      this.trayLayer,
      this.fxLayer,
      this.particleLayer,
      this.textLayer,
      this.dragLayer,
      this.hintLayer,
    );
    // The stage is interactive, and Pixi passes that mode down to every child. Purely
    // visual layers opt out so they never steal a touch from the tray slots.
    for (const layer of app.stage.children) {
      if (layer !== this.trayLayer) layer.eventMode = 'none';
    }

    app.stage.eventMode = 'static';
    app.stage.hitArea = app.screen;
    app.stage.on('globalpointermove', this.onPointerMove);
    app.stage.on('pointerup', this.onPointerUp);
    app.stage.on('pointerupoutside', this.onPointerUp);
    app.renderer.on('resize', this.rebuild);

    this.unsubscribe = store.subscribe(this.onStoreEvents);
    this.grayRows = store.getState().gameOver ? BOARD_SIZE : 0;
    this.rebuild();
  }

  static async create(
    container: HTMLElement,
    store: GameStore,
    options: RendererOptions,
  ): Promise<GameRenderer> {
    // Pixi text needs the font ready, or the first popups render in a fallback font.
    try {
      await document.fonts.load(`700 32px ${GAME_FONT}`);
    } catch {
      // Fall back to system fonts.
    }
    const app = new Application();
    await app.init({
      resizeTo: container,
      backgroundAlpha: 0,
      antialias: true,
      autoDensity: true,
      resolution: Math.min(window.devicePixelRatio || 1, 3),
      preference: 'webgl',
    });
    app.canvas.setAttribute('aria-label', 'Gridzy game board');
    container.appendChild(app.canvas);
    return new GameRenderer(app, store, options);
  }

  destroy(): void {
    this.unsubscribe();
    this.hint?.destroy();
    this.tweens.destroy();
    this.particles.destroy();
    this.app.renderer.off('resize', this.rebuild);
    this.app.destroy({ removeView: true }, { children: true });
    this.textures?.destroy();
    this.textures = null;
  }

  // ---------------------------------------------------------------- layout

  /** Recreates every display object, e.g. after a resize. */
  private rebuild = (): void => {
    this.cancelDrag(false);
    this.tweens.clear();
    this.particles.clear();
    this.hint?.destroy();
    this.hint = null;
    for (const layer of [
      this.boardLayer,
      this.ghostLayer,
      this.trayLayer,
      this.fxLayer,
      this.textLayer,
      this.dragLayer,
      this.hintLayer,
    ]) {
      for (const child of layer.removeChildren()) child.destroy({ children: true });
    }
    this.textures?.destroy();

    this.layout = computeLayout(this.app.screen.width, this.app.screen.height);
    const { cell, boardX, boardY, boardSize, trayY, trayH, slotW } = this.layout;
    this.textures = createBlockTextures(this.app.renderer, cell);

    const panelPad = Math.round(cell * 0.18);
    const panel = new Graphics()
      .roundRect(
        boardX - panelPad,
        boardY - panelPad + cell * 0.08,
        boardSize + panelPad * 2,
        boardSize + panelPad * 2,
        cell * 0.3,
      )
      .fill({ color: 0x0b0f2e, alpha: 0.35 })
      .roundRect(
        boardX - panelPad,
        boardY - panelPad,
        boardSize + panelPad * 2,
        boardSize + panelPad * 2,
        cell * 0.3,
      )
      .fill(BOARD_HEX.panel)
      .stroke({ width: Math.max(2, cell * 0.05), color: BOARD_HEX.panelBorder });
    this.boardLayer.addChild(panel);

    this.cellSprites = [];
    for (let row = 0; row < BOARD_SIZE; row++) {
      for (let col = 0; col < BOARD_SIZE; col++) {
        const sprite = new Sprite(this.textures.empty);
        sprite.anchor.set(0.5);
        const { x, y } = cellCenter(this.layout, row, col);
        sprite.position.set(x, y);
        this.boardLayer.addChild(sprite);
        this.cellSprites.push(sprite);
      }
    }

    this.ghostSprites = [];
    for (let i = 0; i < MAX_PIECE_CELLS; i++) {
      const sprite = new Sprite(this.textures.empty);
      sprite.alpha = GHOST_ALPHA;
      sprite.visible = false;
      this.ghostLayer.addChild(sprite);
      this.ghostSprites.push(sprite);
    }

    // Generous, invisible touch targets: the whole slot grabs its piece.
    for (let i = 0; i < TRAY_SIZE; i++) {
      const hit = new Container();
      hit.eventMode = 'static';
      hit.cursor = 'grab';
      hit.hitArea = new Rectangle(boardX + slotW * i, trayY, slotW, trayH);
      hit.on('pointerdown', (e: FederatedPointerEvent) => this.startDrag(i, e));
      this.trayLayer.addChild(hit);
    }

    this.trayViews = Array<Container | null>(TRAY_SIZE).fill(null);
    this.trayPieceIds = Array<number | null>(TRAY_SIZE).fill(null);
    this.syncBoard(null, null);
    this.syncTray(false);
    this.syncHint();
  };

  // ------------------------------------------------------------- rendering

  /**
   * Paints the board. While dragging, filled cells in lines that would clear take the
   * dragged piece's color, hinting at the upcoming blast.
   */
  private syncBoard(preview: PlacementPreview | null, dragged: Piece | null): void {
    const textures = this.textures;
    if (!textures) return;
    const { board, gameOver } = this.store.getState();
    const rows = new Set(preview?.valid ? preview.rows : []);
    const cols = new Set(preview?.valid ? preview.cols : []);

    for (let row = 0; row < BOARD_SIZE; row++) {
      const gray = gameOver && row < this.grayRows;
      for (let col = 0; col < BOARD_SIZE; col++) {
        const color = board[cellIndex(row, col)];
        const sprite = this.cellSprites[cellIndex(row, col)];
        if (!sprite) continue;
        if (!color) sprite.texture = textures.empty;
        else if (dragged && (rows.has(row) || cols.has(col)))
          sprite.texture = textures.blocks[dragged.color];
        else sprite.texture = textures.blocks[color];
        sprite.tint = gray && color ? GAME_OVER_TINT : 0xffffff;
      }
    }

    this.ghostSprites.forEach((sprite, i) => {
      const cell = preview?.valid ? preview.cells[i] : undefined;
      sprite.visible = Boolean(cell && dragged);
      if (!cell || !dragged) return;
      sprite.texture = textures.blocks[dragged.color];
      sprite.position.set(
        this.layout.boardX + cell.col * this.layout.cell,
        this.layout.boardY + cell.row * this.layout.cell,
      );
    });
  }

  private createPieceView(piece: Piece, withShadow = true): Container {
    const { cell } = this.layout;
    const view = new Container();
    view.eventMode = 'none'; // The slot's hit area handles input, not the blocks.

    if (withShadow) {
      // Soft drop shadow, shown only while the piece is lifted.
      const shadow = new Graphics();
      for (const c of piece.shape.cells) {
        shadow.roundRect(
          c.col * cell + cell * 0.1,
          c.row * cell + cell * 0.22,
          cell * 0.9,
          cell * 0.9,
          cell * 0.12,
        );
      }
      shadow.fill({ color: 0x0b0630, alpha: 0.3 });
      shadow.label = 'shadow';
      shadow.visible = false;
      view.addChild(shadow);
    }

    const texture = this.textures?.blocks[piece.color];
    for (const c of piece.shape.cells) {
      const sprite = new Sprite(texture);
      sprite.position.set(c.col * cell, c.row * cell);
      view.addChild(sprite);
    }
    view.pivot.set((piece.shape.width * cell) / 2, (piece.shape.height * cell) / 2);
    return view;
  }

  private setLifted(view: Container, lifted: boolean): void {
    const shadow = view.getChildByLabel('shadow');
    if (shadow) shadow.visible = lifted;
  }

  /** Makes the tray views match the tray in state; new pieces optionally pop in. */
  private syncTray(animateIn: boolean): void {
    const { tray, gameOver } = this.store.getState();
    const { trayScale } = this.layout;

    for (let i = 0; i < TRAY_SIZE; i++) {
      const piece = tray[i] ?? null;
      const id = piece?.id ?? null;
      if (id !== this.trayPieceIds[i] || (id !== null && !this.trayViews[i])) {
        if (this.drag?.index === i) continue;
        this.trayViews[i]?.destroy({ children: true });
        this.trayViews[i] = null;
        this.trayPieceIds[i] = id;
        if (piece) {
          const view = this.createPieceView(piece);
          const { x, y } = slotCenter(this.layout, i);
          view.position.set(x, y);
          this.trayLayer.addChild(view);
          this.trayViews[i] = view;
          this.popIn(view, trayScale, animateIn ? i * 80 : -1);
        }
      }
      const view = this.trayViews[i];
      if (view) view.alpha = gameOver ? 0.45 : 1;
    }
  }

  /** Bouncy entrance for a new tray piece; `delay < 0` means no animation. */
  private popIn(view: Container, scale: number, delay: number): void {
    if (delay < 0 || this.options.settings.get().reduceMotion) {
      view.scale.set(scale);
      return;
    }
    const baseY = view.y;
    view.scale.set(0);
    this.tweens.add({
      target: view,
      duration: 380,
      delay,
      ease: ease.outBack,
      update: (t) => {
        view.scale.set(scale * Math.max(0, t));
        view.y = baseY + (1 - Math.min(t, 1)) * this.layout.cell * 0.6;
      },
    });
  }

  /** Squash-and-settle for blocks that just landed. */
  private snap(cells: readonly Point[]): void {
    if (this.options.settings.get().reduceMotion) return;
    const { board } = this.store.getState();
    for (const c of cells) {
      if (!board[cellIndex(c.row, c.col)]) continue; // Cleared right away.
      const sprite = this.cellSprites[cellIndex(c.row, c.col)];
      if (!sprite) continue;
      this.tweens.add({
        target: sprite,
        duration: 220,
        ease: ease.outBack,
        update: (t) => {
          sprite.scale.set(1.18 - 0.18 * t, 0.86 + 0.14 * t);
        },
        complete: () => sprite.scale.set(1),
      });
    }
  }

  private playGameOver(): void {
    this.grayRows = 0;
    for (let row = 1; row <= BOARD_SIZE; row++) {
      this.tweens.add({
        delay: 350 + row * GAME_OVER_ROW_MS,
        duration: 1,
        update: () => undefined,
        complete: () => {
          this.grayRows = row;
          this.syncBoard(null, null);
        },
      });
    }
  }

  private syncHint(): void {
    const hintSpec = this.store.getHint();
    const piece = hintSpec ? this.store.getState().tray[hintSpec.trayIndex] : null;
    if (!hintSpec || !piece) {
      this.hint?.destroy();
      this.hint = null;
      return;
    }
    this.hint?.destroy();
    const { cell, boardX, boardY, trayScale } = this.layout;
    const from = slotCenter(this.layout, hintSpec.trayIndex);
    this.hint = new TutorialHint(
      this.hintLayer,
      this.app.ticker,
      this.createPieceView(piece, false),
      {
        from: { ...from, scale: trayScale },
        to: {
          x: boardX + (hintSpec.col + piece.shape.width / 2) * cell,
          y: boardY + (hintSpec.row + piece.shape.height / 2) * cell,
        },
      },
      cell,
    );
  }

  private onStoreEvents = (events: readonly StoreEvent[]): void => {
    const isNewGame = events.some((e) => e.type === 'newGame');
    if (isNewGame) {
      this.cancelDrag(false);
      this.trayPieceIds.fill(null);
      this.grayRows = 0;
    }

    const banners: Banner[] = [];
    let celebrate = false;
    let origin: Point = { row: 4, col: 4 };
    let placedCells: readonly Point[] = [];

    for (const e of events) {
      switch (e.type) {
        case 'placed':
          placedCells = e.cells;
          origin = e.cells[0] ?? origin;
          break;
        case 'linesCleared': {
          this.effects.lineClear(e.cells, origin);
          this.effects.floatPoints(e.points, e.cells);
          const praise = praiseFor(e.lineCount);
          if (praise) banners.push(praiseBanner(praise));
          break;
        }
        case 'combo':
          banners.push(comboBanner(e.combo));
          break;
        case 'perfectClear':
          banners.push({ text: 'Perfect!', color: 0xffffff, size: 1.2 });
          celebrate = true;
          break;
        case 'newBest':
          banners.push({ text: 'New Best!', color: 0xffd23f, size: 1 });
          celebrate = true;
          break;
        case 'gameOver':
          this.playGameOver();
          break;
        default:
          break;
      }
    }

    banners.forEach((b, i) => this.effects.banner(b, i - (banners.length - 1) / 2, i * 140));
    if (celebrate) this.effects.confetti();

    this.syncBoard(null, null);
    this.snap(placedCells);
    this.syncTray(isNewGame || events.some((e) => e.type === 'trayRefilled'));
    if (isNewGame || events.some((e) => e.type === 'placed')) this.syncHint();
  };

  // ---------------------------------------------------------- drag & drop

  private startDrag(index: number, e: FederatedPointerEvent): void {
    const state = this.store.getState();
    const piece = state.tray[index];
    const view = this.trayViews[index];
    if (this.drag || state.gameOver || !piece || !view) return;

    // Touch: hold the piece well above the finger. Mouse: center it on the cursor.
    const lift = e.pointerType === 'mouse' ? 0 : this.layout.cell * 1.4;
    this.drag = { index, piece, view, lift, target: null, overBoard: false };
    this.dragLayer.addChild(view);
    this.setLifted(view, true);
    this.hint?.setPaused(true);
    this.options.feedback.pickup();

    const from = view.scale.x;
    this.tweens.add({
      target: view,
      duration: 220,
      ease: ease.outBack,
      update: (t) => view.scale.set(from + (1 - from) * t),
    });
    this.updateDrag(e.global);
  }

  private onPointerMove = (e: FederatedPointerEvent): void => {
    if (this.drag) this.updateDrag(e.global);
  };

  private updateDrag(pointer: PixiPoint): void {
    const drag = this.drag;
    if (!drag) return;
    const { cell, boardX, boardY } = this.layout;
    const { width, height } = drag.piece.shape;

    const centerX = pointer.x;
    const centerY = pointer.y - drag.lift - (drag.lift > 0 ? (height * cell) / 2 : 0);
    drag.view.position.set(centerX, centerY);

    const col = Math.round((centerX - (width * cell) / 2 - boardX) / cell);
    const row = Math.round((centerY - (height * cell) / 2 - boardY) / cell);
    const preview = previewPlacement(this.store.getState(), drag.index, row, col);
    drag.target = preview.valid ? { row, col } : null;
    drag.overBoard = preview.cells.length > 0;
    this.syncBoard(preview, drag.piece);
  }

  private onPointerUp = (): void => {
    const drag = this.drag;
    if (!drag) return;
    if (drag.target) {
      this.drag = null;
      drag.view.destroy({ children: true });
      this.trayViews[drag.index] = null;
      this.trayPieceIds[drag.index] = null;
      if (this.store.place(drag.index, drag.target.row, drag.target.col)) return;
      // Should not happen (the preview said it fits), but never lose the piece.
      this.syncBoard(null, null);
      this.syncTray(false);
      return;
    }
    if (drag.overBoard) this.options.feedback.invalidDrop();
    this.cancelDrag(true);
  };

  /** Sends the dragged piece back to its tray slot. */
  private cancelDrag(animate: boolean): void {
    const drag = this.drag;
    if (!drag) return;
    this.drag = null;
    this.syncBoard(null, null);
    this.hint?.setPaused(false);

    const { x, y } = slotCenter(this.layout, drag.index);
    const { trayScale } = this.layout;
    const view = drag.view;
    this.trayLayer.addChild(view);
    this.setLifted(view, false);
    if (!animate) {
      view.position.set(x, y);
      view.scale.set(trayScale);
      return;
    }
    const start = { x: view.x, y: view.y, s: view.scale.x };
    this.tweens.add({
      target: view,
      duration: 260,
      ease: ease.outBack,
      update: (t) => {
        view.position.set(start.x + (x - start.x) * t, start.y + (y - start.y) * t);
        view.scale.set(start.s + (trayScale - start.s) * Math.min(t, 1));
      },
    });
  }
}
