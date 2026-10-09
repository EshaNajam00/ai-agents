import 'pixi.js/unsafe-eval'; // Lets Pixi run under our strict CSP (no eval).
import { BOARD_SIZE, TRAY_SIZE, cellIndex, previewPlacement } from '@gridzy/core';
import type { ClearedCell, Piece, PlacementPreview, Point } from '@gridzy/core';
import { Application, Container, Graphics, Rectangle, Sprite } from 'pixi.js';
import type { FederatedPointerEvent, Point as PixiPoint } from 'pixi.js';
import type { GameStore, StoreEvent } from '../game/GameStore';
import { BOARD_HEX } from './palette';
import { createBlockTextures } from './textures';
import type { BlockTextures } from './textures';
import { ease, Tweens } from './tween';

interface Layout {
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

interface Drag {
  readonly index: number;
  readonly piece: Piece;
  readonly view: Container;
  /** Extra upward offset so a finger doesn't cover the piece. */
  readonly lift: number;
  target: Point | null;
}

const MAX_BOARD_PX = 560;
const GHOST_ALPHA = 0.4;
const MAX_PIECE_CELLS = 9;

/**
 * Draws the board and tray with PixiJS and handles drag and drop. It reads state
 * from the store and only changes the game through `store.place`.
 */
export class GameRenderer {
  private readonly tweens: Tweens;
  private readonly unsubscribe: () => void;

  private layout!: Layout;
  private textures: BlockTextures | null = null;

  private readonly boardLayer = new Container();
  private readonly ghostLayer = new Container();
  private readonly trayLayer = new Container();
  private readonly fxLayer = new Container();
  private readonly dragLayer = new Container();

  private cellSprites: Sprite[] = [];
  private ghostSprites: Sprite[] = [];
  private trayViews: (Container | null)[] = [];
  private trayPieceIds: (number | null)[] = [];
  private drag: Drag | null = null;

  private constructor(
    private readonly app: Application,
    private readonly store: GameStore,
  ) {
    this.tweens = new Tweens(app.ticker);
    app.stage.addChild(
      this.boardLayer,
      this.ghostLayer,
      this.trayLayer,
      this.fxLayer,
      this.dragLayer,
    );

    // The stage is interactive, and Pixi passes that mode down to every child. Purely
    // visual layers opt out so they never steal a touch from the tray slots.
    for (const layer of [this.boardLayer, this.ghostLayer, this.fxLayer, this.dragLayer]) {
      layer.eventMode = 'none';
    }

    app.stage.eventMode = 'static';
    app.stage.hitArea = app.screen;
    app.stage.on('globalpointermove', this.onPointerMove);
    app.stage.on('pointerup', this.onPointerUp);
    app.stage.on('pointerupoutside', this.onPointerUp);
    app.renderer.on('resize', this.rebuild);

    this.unsubscribe = store.subscribe(this.onStoreEvents);
    this.rebuild();
  }

  static async create(container: HTMLElement, store: GameStore): Promise<GameRenderer> {
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
    return new GameRenderer(app, store);
  }

  destroy(): void {
    this.unsubscribe();
    this.tweens.destroy();
    this.app.renderer.off('resize', this.rebuild);
    this.app.destroy({ removeView: true }, { children: true });
    this.textures?.destroy();
    this.textures = null;
  }

  // ---------------------------------------------------------------- layout

  private computeLayout(): Layout {
    const { width: W, height: H } = this.app.screen;
    const pad = Math.max(12, Math.min(W, H) * 0.04);
    // Board (8 cells) + gap + tray (~3.2 cells) ≈ 11.9 cells tall.
    const maxBoard = Math.min(W - pad * 2, ((H - pad * 2) * BOARD_SIZE) / 11.9, MAX_BOARD_PX);
    const cell = Math.max(8, Math.floor(maxBoard / BOARD_SIZE));
    const boardSize = cell * BOARD_SIZE;
    const gap = cell * 0.6;
    const trayH = cell * 3.2;
    const total = boardSize + gap + trayH;
    const boardY = Math.round(Math.max(pad, (H - total) / 2));
    const slotW = boardSize / TRAY_SIZE;
    return {
      cell,
      boardX: Math.round((W - boardSize) / 2),
      boardY,
      boardSize,
      trayY: boardY + boardSize + gap,
      trayH,
      slotW,
      // 5-long pieces must fit their slot.
      trayScale: Math.min(0.55, (slotW * 0.88) / (5 * cell)),
    };
  }

  /** Recreates every display object, e.g. after a resize. */
  private rebuild = (): void => {
    this.cancelDrag(false);
    this.tweens.clear();
    for (const layer of [
      this.boardLayer,
      this.ghostLayer,
      this.trayLayer,
      this.fxLayer,
      this.dragLayer,
    ]) {
      for (const child of layer.removeChildren()) child.destroy({ children: true });
    }
    this.textures?.destroy();

    this.layout = this.computeLayout();
    const { cell, boardX, boardY, boardSize, trayY, trayH, slotW } = this.layout;
    this.textures = createBlockTextures(this.app.renderer, cell);

    const panelPad = Math.round(cell * 0.18);
    const panel = new Graphics()
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
        sprite.position.set(boardX + col * cell, boardY + row * cell);
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
  };

  private slotCenter(index: number): { x: number; y: number } {
    const { boardX, slotW, trayY, trayH } = this.layout;
    return { x: boardX + slotW * (index + 0.5), y: trayY + trayH / 2 };
  }

  // ------------------------------------------------------------- rendering

  /**
   * Paints the board. While dragging, filled cells in lines that would clear take the
   * dragged piece's color, hinting at the upcoming blast.
   */
  private syncBoard(preview: PlacementPreview | null, dragged: Piece | null): void {
    const textures = this.textures;
    if (!textures) return;
    const { board } = this.store.getState();
    const rows = new Set(preview?.valid ? preview.rows : []);
    const cols = new Set(preview?.valid ? preview.cols : []);

    for (let row = 0; row < BOARD_SIZE; row++) {
      for (let col = 0; col < BOARD_SIZE; col++) {
        const color = board[cellIndex(row, col)];
        const sprite = this.cellSprites[cellIndex(row, col)];
        if (!sprite) continue;
        if (!color) sprite.texture = textures.empty;
        else if (dragged && (rows.has(row) || cols.has(col)))
          sprite.texture = textures.blocks[dragged.color];
        else sprite.texture = textures.blocks[color];
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

  private createPieceView(piece: Piece): Container {
    const { cell } = this.layout;
    const view = new Container();
    view.eventMode = 'none'; // The slot's hit area handles input, not the blocks.
    const texture = this.textures?.blocks[piece.color];
    for (const c of piece.shape.cells) {
      const sprite = new Sprite(texture);
      sprite.position.set(c.col * cell, c.row * cell);
      view.addChild(sprite);
    }
    view.pivot.set((piece.shape.width * cell) / 2, (piece.shape.height * cell) / 2);
    return view;
  }

  /** Makes the tray views match the tray in state; new pieces optionally pop in. */
  private syncTray(animateIn: boolean): void {
    const { tray } = this.store.getState();
    const { trayScale } = this.layout;

    for (let i = 0; i < TRAY_SIZE; i++) {
      const piece = tray[i] ?? null;
      const id = piece?.id ?? null;
      if (id === this.trayPieceIds[i] && (id === null || this.trayViews[i])) continue;
      if (this.drag?.index === i) continue;

      this.trayViews[i]?.destroy({ children: true });
      this.trayViews[i] = null;
      this.trayPieceIds[i] = piece?.id ?? null;
      if (!piece) continue;

      const view = this.createPieceView(piece);
      const { x, y } = this.slotCenter(i);
      view.position.set(x, y);
      view.scale.set(animateIn ? 0 : trayScale);
      this.trayLayer.addChild(view);
      this.trayViews[i] = view;

      if (animateIn) {
        this.tweens.add({
          target: view,
          duration: 320,
          delay: i * 70,
          ease: ease.outBack,
          update: (t) => view.scale.set(trayScale * t),
        });
      }
    }
  }

  /** Quick pop-out for cleared blocks, rippling out from the placed piece. */
  private playClear(cells: readonly ClearedCell[], origin: Point): void {
    const textures = this.textures;
    if (!textures) return;
    const { cell, boardX, boardY } = this.layout;
    for (const c of cells) {
      const sprite = new Sprite(textures.blocks[c.color]);
      sprite.anchor.set(0.5);
      sprite.position.set(boardX + (c.col + 0.5) * cell, boardY + (c.row + 0.5) * cell);
      this.fxLayer.addChild(sprite);
      const distance = Math.hypot(c.row - origin.row, c.col - origin.col);
      this.tweens.add({
        target: sprite,
        duration: 260,
        delay: distance * 28,
        ease: ease.inBack,
        update: (t) => {
          sprite.scale.set(1 - t);
          sprite.alpha = 1 - t * 0.6;
        },
        complete: () => sprite.destroy(),
      });
    }
  }

  private onStoreEvents = (events: readonly StoreEvent[]): void => {
    if (events.some((e) => e.type === 'newGame')) {
      this.cancelDrag(false);
      this.trayPieceIds.fill(null);
    }

    const placed = events.find((e) => e.type === 'placed');
    for (const e of events) {
      if (e.type === 'linesCleared') {
        const origin =
          placed?.type === 'placed' ? (placed.cells[0] ?? { row: 4, col: 4 }) : { row: 4, col: 4 };
        this.playClear(e.cells, origin);
      }
    }

    this.syncBoard(null, null);
    this.syncTray(events.some((e) => e.type === 'trayRefilled' || e.type === 'newGame'));
  };

  // ---------------------------------------------------------- drag & drop

  private startDrag(index: number, e: FederatedPointerEvent): void {
    const state = this.store.getState();
    const piece = state.tray[index];
    const view = this.trayViews[index];
    if (this.drag || state.gameOver || !piece || !view) return;

    // Touch: hold the piece well above the finger. Mouse: center it on the cursor.
    const lift = e.pointerType === 'mouse' ? 0 : this.layout.cell * 1.4;
    this.drag = { index, piece, view, lift, target: null };
    this.dragLayer.addChild(view);
    const from = view.scale.x;
    this.tweens.add({
      target: view,
      duration: 180,
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
    this.cancelDrag(true);
  };

  /** Sends the dragged piece back to its tray slot. */
  private cancelDrag(animate: boolean): void {
    const drag = this.drag;
    if (!drag) return;
    this.drag = null;
    this.syncBoard(null, null);

    const { x, y } = this.slotCenter(drag.index);
    const { trayScale } = this.layout;
    const view = drag.view;
    this.trayLayer.addChild(view);
    if (!animate) {
      view.position.set(x, y);
      view.scale.set(trayScale);
      return;
    }
    const start = { x: view.x, y: view.y, s: view.scale.x };
    this.tweens.add({
      target: view,
      duration: 220,
      ease: ease.outCubic,
      update: (t) => {
        view.position.set(start.x + (x - start.x) * t, start.y + (y - start.y) * t);
        view.scale.set(start.s + (trayScale - start.s) * t);
      },
    });
  }
}
