import {
  Component,
  Input,
  Output,
  EventEmitter,
  ElementRef,
  ViewChild,
  AfterViewInit,
  OnChanges,
  OnDestroy,
  SimpleChanges,
  HostListener,
  NgZone
} from '@angular/core';
import { CommonModule } from '@angular/common';
import {
  LevelData,
  GameState,
  HexDir,
  HEX_DIRS,
  TILE_COLORS,
  hexKey,
  hexToPixel,
  pixelToHex,
  Tile
} from '../models';

interface AnimationState {
  tile: Tile;
  fromX: number;
  fromY: number;
  toX: number;
  toY: number;
  progress: number;
  startTime: number;
  duration: number;
  onDone: () => void;
}

interface BoardBounds {
  hexSize: number;
  offsetX: number;
  offsetY: number;
  diameter: number;
}

@Component({
  selector: 'app-hex-canvas',
  standalone: true,
  imports: [CommonModule],
  template: `
    <canvas #gameCanvas
      (click)="onCanvasClick($event)"
      (touchstart)="onTouchStart($event)"
      style="display:block; touch-action:none; cursor:pointer;">
    </canvas>
  `,
  styles: [`
    :host {
      display: flex;
      justify-content: center;
      align-items: center;
      width: 100%;
      height: 100%;
    }
    canvas {
      border-radius: 12px;
      box-shadow: 0 4px 24px rgba(0, 0, 0, 0.18);
    }
  `]
})
export class HexCanvasComponent implements AfterViewInit, OnChanges, OnDestroy {
  @ViewChild('gameCanvas', { static: true }) canvasRef!: ElementRef<HTMLCanvasElement>;

  @Input() levelData: LevelData | null = null;
  @Input() gameState: GameState | null = null;
  @Input() highlightedCell: { q: number; r: number } | null = null;

  @Output() tileClicked = new EventEmitter<{ q: number; r: number }>();

  private ctx!: CanvasRenderingContext2D;
  private rafId: number | null = null;
  private resizeObserver: ResizeObserver | null = null;
  private animations: AnimationState[] = [];
  private bounds: BoardBounds = { hexSize: 40, offsetX: 0, offsetY: 0, diameter: 5 };
  private pulsePhase = 0;

  constructor(private ngZone: NgZone) {}

  // ─── Lifecycle ────────────────────────────────────────────────────────────

  ngAfterViewInit(): void {
    const canvas = this.canvasRef.nativeElement;
    this.ctx = canvas.getContext('2d')!;
    this.resizeCanvas();
    this.ngZone.runOutsideAngular(() => {
      this.resizeObserver = new ResizeObserver(() => this.resizeCanvas());
      this.resizeObserver.observe(canvas.parentElement ?? canvas);
      this.startLoop();
    });
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (this.ctx) {
      if (changes['levelData'] || changes['gameState']) {
        this.recalcBounds();
      }
    }
  }

  ngOnDestroy(): void {
    if (this.rafId !== null) {
      cancelAnimationFrame(this.rafId);
      this.rafId = null;
    }
    this.resizeObserver?.disconnect();
  }

  // ─── Window resize ────────────────────────────────────────────────────────

  @HostListener('window:resize')
  onWindowResize(): void {
    this.resizeCanvas();
  }

  private resizeCanvas(): void {
    const canvas = this.canvasRef.nativeElement;
    const host = canvas.parentElement ?? canvas;
    const w = host.clientWidth  || 600;
    const h = host.clientHeight || 600;
    const dpr = window.devicePixelRatio || 1;

    canvas.width  = w * dpr;
    canvas.height = h * dpr;
    canvas.style.width  = `${w}px`;
    canvas.style.height = `${h}px`;
    this.ctx.scale(dpr, dpr);

    this.recalcBounds();
  }

  // ─── Bounds / layout ─────────────────────────────────────────────────────

  private recalcBounds(): void {
    this.bounds = this.getBoardBounds();
  }

  getBoardBounds(): BoardBounds {
    const canvas = this.canvasRef.nativeElement;
    const dpr    = window.devicePixelRatio || 1;
    const cw     = canvas.width  / dpr;
    const ch     = canvas.height / dpr;

    if (!this.levelData || this.levelData.boardCells.length === 0) {
      return { hexSize: 40, offsetX: cw / 2, offsetY: ch / 2, diameter: 5 };
    }

    // Compute axial bounding box of the board
    let minQ = Infinity, maxQ = -Infinity;
    let minR = Infinity, maxR = -Infinity;
    for (const [q, r] of this.levelData.boardCells) {
      if (q < minQ) minQ = q;
      if (q > maxQ) maxQ = q;
      if (r < minR) minR = r;
      if (r > maxR) maxR = r;
    }

    const spanQ = maxQ - minQ;
    const spanR = maxR - minR;
    const diameter = Math.max(spanQ, spanR) + 1;

    // Pixel span for a given hex size (flat-top layout):
    //   width  ≈ size * (3/2 * spanQ + 2)
    //   height ≈ size * (sqrt(3) * (spanR + 1) + sqrt(3)/2 * spanQ)
    const padding = 2;
    const sizeByW = (cw - padding * 2) / (1.5 * spanQ + 2);
    const sizeByH = (ch - padding * 2) / (Math.sqrt(3) * spanR + Math.sqrt(3) / 2 * spanQ + Math.sqrt(3));
    const hexSize = Math.min(sizeByW, sizeByH, 70);

    // Center of board in axial coords
    const centerQ = (minQ + maxQ) / 2;
    const centerR = (minR + maxR) / 2;

    // Pixel position of axial center
    const pixCenter = hexToPixel(centerQ, centerR, hexSize, 0, 0);

    const offsetX = cw / 2 - pixCenter.x;
    const offsetY = ch / 2 - pixCenter.y;

    return { hexSize, offsetX, offsetY, diameter };
  }

  // ─── Animation ────────────────────────────────────────────────────────────

  startAnimation(
    tile: Tile,
    fromPos: { x: number; y: number },
    toPos:   { x: number; y: number },
    onDone:  () => void,
    duration = 200
  ): void {
    this.animations.push({
      tile,
      fromX: fromPos.x,
      fromY: fromPos.y,
      toX:   toPos.x,
      toY:   toPos.y,
      progress: 0,
      startTime: performance.now(),
      duration,
      onDone
    });
  }

  /**
   * Animate a tile sliding from (fromQ,fromR) to (toQ,toR) — used for normal moves.
   * The tile's q/r are set to the destination so animatedKeys suppresses the static render.
   */
  animateMove(tile: Tile, fromQ: number, fromR: number, toQ: number, toR: number): void {
    const { hexSize, offsetX, offsetY } = this.bounds;
    const fromPos = hexToPixel(fromQ, fromR, hexSize, offsetX, offsetY);
    const toPos   = hexToPixel(toQ,   toR,   hexSize, offsetX, offsetY);
    this.startAnimation({ ...tile, q: toQ, r: toR }, fromPos, toPos, () => {}, 180);
  }

  /**
   * Animate a tile sliding off the board. Projects 6 hex steps in the tile's
   * direction so it travels clearly beyond the canvas edge.
   */
  animateExit(tile: Tile, fromQ: number, fromR: number): void {
    const { hexSize, offsetX, offsetY } = this.bounds;
    const { dq, dr } = HEX_DIRS[tile.dir];
    const fromPos = hexToPixel(fromQ, fromR, hexSize, offsetX, offsetY);
    const toPos   = hexToPixel(fromQ + dq * 6, fromR + dr * 6, hexSize, offsetX, offsetY);
    this.startAnimation({ ...tile, q: fromQ, r: fromR }, fromPos, toPos, () => {}, 380);
  }

  private startLoop(): void {
    const loop = (ts: number) => {
      this.animate(ts);
      this.rafId = requestAnimationFrame(loop);
    };
    this.rafId = requestAnimationFrame(loop);
  }

  animate(timestamp: number): void {
    // Advance animations
    for (let i = this.animations.length - 1; i >= 0; i--) {
      const a = this.animations[i];
      const elapsed = timestamp - a.startTime;
      a.progress = Math.min(elapsed / a.duration, 1);
      if (a.progress >= 1) {
        a.onDone();
        this.animations.splice(i, 1);
      }
    }

    // Update pulse for powerup mode
    this.pulsePhase = (timestamp % 1200) / 1200; // 0..1 over 1.2 s

    this.render();
  }

  // ─── Rendering ────────────────────────────────────────────────────────────

  render(): void {
    if (!this.ctx) return;

    const canvas  = this.canvasRef.nativeElement;
    const dpr     = window.devicePixelRatio || 1;
    const cw      = canvas.width  / dpr;
    const ch      = canvas.height / dpr;
    const ctx     = this.ctx;
    const { hexSize, offsetX, offsetY } = this.bounds;

    // Background
    ctx.fillStyle = '#f0f0f5';
    ctx.fillRect(0, 0, cw, ch);

    if (!this.levelData) return;

    const gs = this.gameState;

    // ── 1. Board cells ──────────────────────────────────────────────────────
    for (const [q, r] of this.levelData.boardCells) {
      const key = hexKey(q, r);
      const { x, y } = hexToPixel(q, r, hexSize, offsetX, offsetY);

      const isHovered =
        this.highlightedCell?.q === q &&
        this.highlightedCell?.r === r;

      this.drawHexagon(
        ctx, x, y, hexSize - 1,
        isHovered ? '#dde8f5' : '#e8e8e8',
        '#b0b0b8',
        1.5
      );
    }

    // ── 2. Animated tiles ───────────────────────────────────────────────────
    const animatedKeys = new Set<string>();

    for (const anim of this.animations) {
      const t    = this.easeInOut(anim.progress);
      const x    = anim.fromX + (anim.toX - anim.fromX) * t;
      const y    = anim.fromY + (anim.toY - anim.fromY) * t;
      const tile = anim.tile;
      animatedKeys.add(hexKey(tile.q, tile.r));
      this.drawTile(ctx, x, y, hexSize, tile, false, gs);
    }

    // ── 3. Static tiles ─────────────────────────────────────────────────────
    if (gs) {
      for (const [key, tile] of gs.tiles) {
        if (animatedKeys.has(key)) continue;

        const { x, y } = hexToPixel(tile.q, tile.r, hexSize, offsetX, offsetY);

        const isHovered =
          !tile.isBlocker &&
          this.highlightedCell?.q === tile.q &&
          this.highlightedCell?.r === tile.r;

        this.drawTile(ctx, x, y, hexSize, tile, isHovered, gs);

        // Active powerup: pulsing cyan border on movable tiles
        if (gs.activePowerup && !tile.isBlocker) {
          const alpha = 0.4 + 0.5 * Math.abs(Math.sin(this.pulsePhase * Math.PI));
          ctx.save();
          ctx.globalAlpha = alpha;
          this.drawHexagon(ctx, x, y, hexSize - 2, 'transparent', '#00d8ff', 3);
          ctx.globalAlpha = 1;
          ctx.restore();
        }
      }
    }
  }

  // ─── Draw primitives ──────────────────────────────────────────────────────

  /**
   * Draws a flat-top hexagon centered at (cx, cy).
   */
  drawHexagon(
    ctx: CanvasRenderingContext2D,
    cx: number,
    cy: number,
    size: number,
    fill: string,
    stroke: string,
    strokeWidth: number
  ): void {
    ctx.beginPath();
    for (let i = 0; i < 6; i++) {
      const angle = (Math.PI / 180) * (60 * i); // flat-top: 0°, 60°, 120°, ...
      const px = cx + size * Math.cos(angle);
      const py = cy + size * Math.sin(angle);
      if (i === 0) ctx.moveTo(px, py);
      else          ctx.lineTo(px, py);
    }
    ctx.closePath();

    if (fill !== 'transparent') {
      ctx.fillStyle = fill;
      ctx.fill();
    }

    if (stroke && strokeWidth > 0) {
      ctx.strokeStyle   = stroke;
      ctx.lineWidth     = strokeWidth;
      ctx.stroke();
    }
  }

  /**
   * Draws a tile (colored hex + gradient + border + arrow).
   */
  private drawTile(
    ctx: CanvasRenderingContext2D,
    cx: number,
    cy: number,
    hexSize: number,
    tile: Tile,
    isHovered: boolean,
    gs: GameState | null
  ): void {
    const tileSize = hexSize - 3;
    const baseColor = TILE_COLORS[tile.color];

    // Drop shadow
    ctx.save();
    ctx.shadowColor   = 'rgba(0,0,0,0.35)';
    ctx.shadowBlur    = 8;
    ctx.shadowOffsetY = 3;
    this.drawHexagon(ctx, cx, cy, tileSize, baseColor, 'transparent', 0);
    ctx.restore();

    // Solid base
    this.drawHexagon(ctx, cx, cy, tileSize, baseColor, 'transparent', 0);

    // Gradient highlight (lighter on top half)
    if (!tile.isBlocker) {
      const grad = ctx.createLinearGradient(cx, cy - tileSize, cx, cy + tileSize);
      grad.addColorStop(0,   'rgba(255,255,255,0.38)');
      grad.addColorStop(0.45,'rgba(255,255,255,0.10)');
      grad.addColorStop(1,   'rgba(0,0,0,0.12)');
      this.drawHexagon(ctx, cx, cy, tileSize, grad as unknown as string, 'transparent', 0);
    }

    // Border
    const borderColor = tile.isBlocker
      ? 'rgba(0,0,0,0.45)'
      : isHovered
        ? 'rgba(255,255,255,0.90)'
        : 'rgba(0,0,0,0.25)';
    const borderWidth = isHovered ? 2.5 : 1.5;
    this.drawHexagonStroke(ctx, cx, cy, tileSize, borderColor, borderWidth);

    // Arrow (skip for blocker tiles)
    if (!tile.isBlocker) {
      const angle = HEX_DIRS[tile.dir].angle;
      this.drawArrow(ctx, cx, cy, tileSize, angle);
    }
  }

  /** Strokes a flat-top hex outline only (no fill path needed). */
  private drawHexagonStroke(
    ctx: CanvasRenderingContext2D,
    cx: number,
    cy: number,
    size: number,
    stroke: string,
    strokeWidth: number
  ): void {
    ctx.beginPath();
    for (let i = 0; i < 6; i++) {
      const angle = (Math.PI / 180) * (60 * i);
      const px = cx + size * Math.cos(angle);
      const py = cy + size * Math.sin(angle);
      if (i === 0) ctx.moveTo(px, py);
      else          ctx.lineTo(px, py);
    }
    ctx.closePath();
    ctx.strokeStyle = stroke;
    ctx.lineWidth   = strokeWidth;
    ctx.stroke();
  }

  /**
   * Draws a white chevron arrow pointing in the given angle (degrees).
   * angle=0 → points right (East), increases clockwise.
   */
  drawArrow(
    ctx: CanvasRenderingContext2D,
    cx: number,
    cy: number,
    size: number,
    angleDeg: number
  ): void {
    const rad    = (angleDeg * Math.PI) / 180;
    const arrowR = size * 0.44; // reach from center
    const stemW  = size * 0.13; // half-width of chevron arms

    ctx.save();
    ctx.translate(cx, cy);
    ctx.rotate(rad);

    // Chevron shape: two lines meeting at a point
    const tipX  =  arrowR;
    const baseX = -arrowR * 0.1;
    const hw    =  arrowR * 0.42; // half-height of the V opening

    ctx.beginPath();
    ctx.moveTo(baseX - stemW,  hw);
    ctx.lineTo(tipX,            0);
    ctx.lineTo(baseX - stemW, -hw);
    ctx.lineTo(baseX + stemW, -hw + stemW);
    ctx.lineTo(tipX - stemW * 1.4, 0);
    ctx.lineTo(baseX + stemW,  hw - stemW);
    ctx.closePath();

    // White with subtle shadow
    ctx.shadowColor   = 'rgba(0,0,0,0.55)';
    ctx.shadowBlur    = 4;
    ctx.shadowOffsetX = 1;
    ctx.shadowOffsetY = 1;
    ctx.fillStyle     = 'rgba(255,255,255,0.92)';
    ctx.fill();

    ctx.restore();
  }

  // ─── Easing ───────────────────────────────────────────────────────────────

  private easeInOut(t: number): number {
    return t < 0.5
      ? 2 * t * t
      : -1 + (4 - 2 * t) * t;
  }

  // ─── Input handlers ───────────────────────────────────────────────────────

  onCanvasClick(event: MouseEvent): void {
    const pos = this.canvasEventPos(event.clientX, event.clientY);
    const hex = pixelToHex(pos.x, pos.y, this.bounds.hexSize, this.bounds.offsetX, this.bounds.offsetY);
    this.ngZone.run(() => this.tileClicked.emit(hex));
  }

  onTouchStart(event: TouchEvent): void {
    event.preventDefault();
    if (event.touches.length === 0) return;
    const touch = event.touches[0];
    const pos   = this.canvasEventPos(touch.clientX, touch.clientY);
    const hex   = pixelToHex(pos.x, pos.y, this.bounds.hexSize, this.bounds.offsetX, this.bounds.offsetY);
    this.ngZone.run(() => this.tileClicked.emit(hex));
  }

  /** Convert client coords to canvas logical coords (accounting for DPR). */
  private canvasEventPos(clientX: number, clientY: number): { x: number; y: number } {
    const rect = this.canvasRef.nativeElement.getBoundingClientRect();
    return {
      x: clientX - rect.left,
      y: clientY - rect.top
    };
  }
}
