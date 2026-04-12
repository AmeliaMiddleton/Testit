import { Component, OnInit, OnDestroy, ViewChild } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { ApiService } from '../../core/services/api.service';
import { AuthService } from '../../core/services/auth.service';
import { GameStateService } from '../../core/services/game-state.service';
import { LevelData, PlayerProfile, hexKey } from '../../shared/models';
import { HexCanvasComponent } from '../../shared/hex-canvas/hex-canvas.component';

type GamePhase = 'loading' | 'playing' | 'won' | 'lost' | 'error';
type Powerup   = 'bomb' | 'hammer' | null;

@Component({
  selector: 'app-game',
  standalone: true,
  imports: [CommonModule, RouterModule, HexCanvasComponent],
  template: `
    <div class="game-wrapper" [class.won-glow]="phase === 'won'">

      <!-- Loading screen -->
      <div class="loading-screen" *ngIf="phase === 'loading'">
        <div class="hex-spinner">
          <div class="hs-hex"></div>
        </div>
        <p>Loading Level {{ levelId }}…</p>
      </div>

      <!-- Error screen -->
      <div class="error-screen" *ngIf="phase === 'error'">
        <p class="err-icon">⚠</p>
        <p>Failed to load level.</p>
        <button class="overlay-btn orange-btn" (click)="goMenu()">Back to Menu</button>
      </div>

      <!-- Main game UI -->
      <ng-container *ngIf="phase === 'playing' || phase === 'won' || phase === 'lost'">

        <!-- HUD -->
        <header class="hud">
          <button class="hud-back" (click)="confirmBack()" title="Back">←</button>

          <div class="hud-center">
            <span class="hud-label">LEVEL</span>
            <span class="hud-value">{{ levelId }}</span>
          </div>

          <div class="hud-moves" [class.danger]="movesLeft <= 3">
            <span class="hud-label">MOVES</span>
            <span class="hud-value">{{ movesLeft }}</span>
          </div>

          <div class="hud-coins">
            <span class="coin-icon">🪙</span>
            <span class="hud-value">{{ profile?.coins ?? 0 }}</span>
          </div>

          <button class="hud-logout" (click)="onLogOut()" title="Log out">⏻</button>
        </header>

        <!-- Canvas -->
        <div class="canvas-area">
          <app-hex-canvas
            [levelData]="levelData"
            [gameState]="gameState.state"
            (tileClicked)="onTileClicked($event)">
          </app-hex-canvas>
        </div>

        <!-- Power-up bar -->
        <footer class="powerup-bar">
          <button
            class="pu-btn bomb-btn"
            [class.active]="activePowerup === 'bomb'"
            [disabled]="(profile?.bombs ?? 0) === 0"
            (click)="togglePowerup('bomb')">
            <span class="pu-icon">💣</span>
            <span class="pu-label">Bomb</span>
            <span class="pu-count">{{ profile?.bombs ?? 0 }}</span>
          </button>

          <button
            class="pu-btn hammer-btn"
            [class.active]="activePowerup === 'hammer'"
            [disabled]="(profile?.hammers ?? 0) === 0"
            (click)="togglePowerup('hammer')">
            <span class="pu-icon">🔨</span>
            <span class="pu-label">Hammer</span>
            <span class="pu-count">{{ profile?.hammers ?? 0 }}</span>
          </button>
        </footer>

        <!-- Powerup hint banner -->
        <div class="pu-hint" *ngIf="activePowerup">
          <span *ngIf="activePowerup === 'bomb'">💣 Tap a tile to destroy it!</span>
          <span *ngIf="activePowerup === 'hammer'">🔨 Tap a blocker tile to remove it!</span>
          <button class="pu-cancel" (click)="togglePowerup(activePowerup!)">Cancel</button>
        </div>

      </ng-container>

      <!-- WIN OVERLAY -->
      <div class="overlay win-overlay" *ngIf="phase === 'won'">
        <div class="overlay-card" [class.slide-in]="phase === 'won'">
          <div class="overlay-icon">🎉</div>
          <h2 class="overlay-title">Level Complete!</h2>

          <!-- Stars earned -->
          <div class="star-display">
            <span *ngFor="let s of [1,2,3]" class="big-star" [class.lit]="starsEarned >= s">★</span>
          </div>

          <!-- Coins earned -->
          <div class="coins-earned">
            <span class="coin-icon">🪙</span>
            <span>+{{ coinsEarned }} coins earned</span>
          </div>

          <div class="overlay-actions">
            <button class="overlay-btn orange-btn" (click)="nextLevel()">Next Level ›</button>
            <button class="overlay-btn ghost-btn"  (click)="retryLevel()">Replay</button>
          </div>
        </div>
      </div>

      <!-- LOSE OVERLAY -->
      <div class="overlay lose-overlay" *ngIf="phase === 'lost'">
        <div class="overlay-card" [class.slide-in]="phase === 'lost'">
          <div class="overlay-icon">😞</div>
          <h2 class="overlay-title">Out of Moves!</h2>
          <p class="overlay-sub">The tiles are still trapped. Try again!</p>

          <div class="overlay-actions">
            <button class="overlay-btn orange-btn" (click)="retryLevel()">Retry</button>
            <button class="overlay-btn green-btn"  (click)="goShop()">Shop 🛒</button>
            <button class="overlay-btn ghost-btn"  (click)="goMenu()">Menu</button>
          </div>
        </div>
      </div>

    </div>
  `,
  styles: [`
    :host {
      display: block;
      height: 100vh;
      background: linear-gradient(160deg, #1a0535 0%, #2a0a4a 60%, #1a0535 100%);
      font-family: 'Segoe UI', Arial, sans-serif;
      overflow: hidden;
    }

    .game-wrapper {
      height: 100vh;
      display: flex;
      flex-direction: column;
      position: relative;
      transition: background 0.5s;
    }

    .game-wrapper.won-glow {
      background: linear-gradient(160deg, #0a3520 0%, #1a5a30 60%, #0a2010 100%);
    }

    /* ── Loading / Error ── */
    .loading-screen,
    .error-screen {
      flex: 1;
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      gap: 20px;
      color: rgba(255,255,255,0.75);
      font-size: 1rem;
    }

    .hex-spinner {
      width: 60px;
      height: 60px;
      position: relative;
    }

    .hs-hex {
      width: 100%;
      height: 100%;
      clip-path: polygon(50% 0%, 93% 25%, 93% 75%, 50% 100%, 7% 75%, 7% 25%);
      background: linear-gradient(135deg, #f07830, #e84040);
      animation: spinPulse 1.2s ease-in-out infinite;
    }

    .err-icon { font-size: 2.5rem; }

    /* ── HUD ── */
    .hud {
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 10px 14px;
      background: rgba(0,0,0,0.35);
      backdrop-filter: blur(8px);
      border-bottom: 1px solid rgba(255,255,255,0.08);
      z-index: 10;
      flex-shrink: 0;
    }

    .hud-back {
      width: 38px;
      height: 38px;
      display: flex;
      align-items: center;
      justify-content: center;
      background: rgba(255,255,255,0.1);
      border: 1px solid rgba(255,255,255,0.18);
      border-radius: 50%;
      color: rgba(255,255,255,0.8);
      font-size: 1.1rem;
      font-weight: 700;
      cursor: pointer;
      transition: background 0.2s;
    }

    .hud-back:hover { background: rgba(255,255,255,0.2); }

    .hud-logout {
      width: 38px;
      height: 38px;
      display: flex;
      align-items: center;
      justify-content: center;
      background: rgba(255,255,255,0.1);
      border: 1px solid rgba(255,255,255,0.18);
      border-radius: 50%;
      color: rgba(255,255,255,0.75);
      font-size: 1rem;
      cursor: pointer;
      transition: background 0.2s, color 0.2s, border-color 0.2s;
    }

    .hud-logout:hover {
      background: rgba(232,64,64,0.25);
      color: #ff8888;
      border-color: rgba(232,64,64,0.4);
    }

    .hud-center,
    .hud-moves,
    .hud-coins {
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 2px;
    }

    .hud-label {
      font-size: 0.65rem;
      font-weight: 700;
      color: rgba(255,255,255,0.5);
      text-transform: uppercase;
      letter-spacing: 0.8px;
    }

    .hud-value {
      font-size: 1.2rem;
      font-weight: 900;
      color: #fff;
      line-height: 1;
    }

    .hud-moves.danger .hud-value {
      color: #ff5555;
      animation: dangerPulse 0.6s ease-in-out infinite alternate;
    }

    .coin-icon { font-size: 1rem; }

    /* ── Canvas area ── */
    .canvas-area {
      flex: 1;
      min-height: 0;
      display: flex;
      align-items: center;
      justify-content: center;
      position: relative;
    }

    app-hex-canvas {
      width: 100%;
      height: 100%;
    }

    /* ── Power-up bar ── */
    .powerup-bar {
      display: flex;
      justify-content: center;
      gap: 20px;
      padding: 12px 16px;
      background: rgba(0,0,0,0.3);
      backdrop-filter: blur(8px);
      border-top: 1px solid rgba(255,255,255,0.08);
      flex-shrink: 0;
    }

    .pu-btn {
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 4px;
      padding: 10px 24px;
      border-radius: 14px;
      border: 2px solid transparent;
      cursor: pointer;
      font-family: inherit;
      transition: transform 0.15s, box-shadow 0.15s, border-color 0.2s;
      position: relative;
    }

    .pu-btn:disabled {
      opacity: 0.35;
      cursor: not-allowed;
    }

    .pu-btn:hover:not(:disabled) { transform: translateY(-2px); }
    .pu-btn:active:not(:disabled) { transform: scale(0.96); }

    .bomb-btn {
      background: linear-gradient(135deg, #3a1870, #5a208a);
      box-shadow: 0 4px 14px rgba(90,32,138,0.4);
    }

    .hammer-btn {
      background: linear-gradient(135deg, #1a4080, #2060b8);
      box-shadow: 0 4px 14px rgba(32,96,184,0.4);
    }

    .pu-btn.active {
      border-color: #ffcc00;
      box-shadow: 0 0 0 3px rgba(255,204,0,0.3), 0 4px 14px rgba(255,204,0,0.4);
      animation: activePulse 0.8s ease-in-out infinite alternate;
    }

    .pu-icon  { font-size: 1.4rem; }
    .pu-label { font-size: 0.7rem; font-weight: 700; color: rgba(255,255,255,0.75); letter-spacing: 0.5px; }
    .pu-count {
      position: absolute;
      top: -6px; right: -6px;
      background: #f07830;
      color: #fff;
      font-size: 0.7rem;
      font-weight: 800;
      min-width: 18px;
      height: 18px;
      border-radius: 50%;
      display: flex;
      align-items: center;
      justify-content: center;
      border: 2px solid #1a0535;
    }

    /* ── Powerup hint ── */
    .pu-hint {
      position: absolute;
      bottom: 80px;
      left: 50%;
      transform: translateX(-50%);
      background: rgba(255,204,0,0.15);
      border: 1px solid rgba(255,204,0,0.4);
      border-radius: 50px;
      padding: 8px 20px;
      color: #ffdd66;
      font-size: 0.88rem;
      font-weight: 600;
      display: flex;
      align-items: center;
      gap: 12px;
      white-space: nowrap;
      z-index: 15;
      animation: floatIn 0.3s ease-out both;
    }

    .pu-cancel {
      background: rgba(255,255,255,0.15);
      border: none;
      border-radius: 50px;
      color: rgba(255,255,255,0.7);
      font-size: 0.78rem;
      padding: 4px 12px;
      cursor: pointer;
    }

    /* ── Overlays ── */
    .overlay {
      position: absolute;
      inset: 0;
      display: flex;
      align-items: center;
      justify-content: center;
      z-index: 50;
      padding: 20px;
    }

    .win-overlay  { background: rgba(0, 60, 20, 0.75); backdrop-filter: blur(6px); }
    .lose-overlay { background: rgba(60, 0, 0,  0.75); backdrop-filter: blur(6px); }

    .overlay-card {
      background: rgba(20, 5, 40, 0.95);
      border: 1px solid rgba(255,255,255,0.15);
      border-radius: 24px;
      padding: 36px 32px;
      max-width: 340px;
      width: 100%;
      text-align: center;
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 16px;
      opacity: 0;
      transform: translateY(40px) scale(0.92);
      transition: opacity 0.4s ease-out, transform 0.4s ease-out;
    }

    .overlay-card.slide-in {
      opacity: 1;
      transform: translateY(0) scale(1);
    }

    .overlay-icon { font-size: 3rem; }

    .overlay-title {
      font-size: 1.8rem;
      font-weight: 900;
      color: #fff;
      margin: 0;
    }

    .overlay-sub {
      color: rgba(255,255,255,0.6);
      margin: -8px 0 0;
      font-size: 0.9rem;
    }

    /* Stars */
    .star-display { display: flex; gap: 8px; }

    .big-star {
      font-size: 2.4rem;
      color: rgba(255,255,255,0.2);
      transition: color 0.3s, text-shadow 0.3s;
    }

    .big-star.lit {
      color: #ffcc00;
      text-shadow: 0 0 14px rgba(255,204,0,0.7);
    }

    /* Coins earned */
    .coins-earned {
      display: flex;
      align-items: center;
      gap: 8px;
      background: rgba(255,204,0,0.12);
      border: 1px solid rgba(255,204,0,0.3);
      border-radius: 50px;
      padding: 8px 20px;
      color: #ffdd66;
      font-size: 0.95rem;
      font-weight: 700;
    }

    /* Overlay action buttons */
    .overlay-actions {
      display: flex;
      flex-direction: column;
      gap: 10px;
      width: 100%;
    }

    .overlay-btn {
      width: 100%;
      padding: 14px;
      border: none;
      border-radius: 14px;
      font-size: 1rem;
      font-weight: 800;
      letter-spacing: 0.5px;
      cursor: pointer;
      transition: transform 0.15s, box-shadow 0.15s;
    }

    .overlay-btn:hover  { transform: translateY(-2px); }
    .overlay-btn:active { transform: scale(0.97); }

    .orange-btn {
      background: linear-gradient(135deg, #f07830, #e84040);
      color: #fff;
      box-shadow: 0 6px 18px rgba(240,120,48,0.45);
    }

    .green-btn {
      background: linear-gradient(135deg, #40b840, #20a060);
      color: #fff;
      box-shadow: 0 6px 18px rgba(64,184,64,0.4);
    }

    .ghost-btn {
      background: rgba(255,255,255,0.08);
      border: 1px solid rgba(255,255,255,0.2);
      color: rgba(255,255,255,0.7);
      box-shadow: none;
    }

    /* ── Animations ── */
    @keyframes spinPulse {
      0%   { transform: rotate(0deg)   scale(1);    }
      50%  { transform: rotate(180deg) scale(1.12); }
      100% { transform: rotate(360deg) scale(1);    }
    }

    @keyframes dangerPulse {
      from { color: #ff5555; }
      to   { color: #ff0000; text-shadow: 0 0 8px rgba(255,0,0,0.6); }
    }

    @keyframes activePulse {
      from { box-shadow: 0 0 0 2px rgba(255,204,0,0.3); }
      to   { box-shadow: 0 0 0 5px rgba(255,204,0,0.6); }
    }

    @keyframes floatIn {
      from { opacity: 0; transform: translate(-50%, 10px); }
      to   { opacity: 1; transform: translate(-50%, 0); }
    }
  `]
})
export class GameComponent implements OnInit, OnDestroy {
  @ViewChild(HexCanvasComponent) hexCanvas?: HexCanvasComponent;

  levelId    = 0;
  phase: GamePhase = 'loading';
  profile: PlayerProfile | null = null;
  activePowerup: Powerup = null;

  starsEarned = 0;
  coinsEarned = 0;

  levelData: LevelData | null = null;

  constructor(
    private route:     ActivatedRoute,
    private router:    Router,
    private api:       ApiService,
    private auth:      AuthService,
    public  gameState: GameStateService
  ) {}

  ngOnInit(): void {
    this.route.paramMap.subscribe(params => {
      this.levelId = Number(params.get('id'));
      this.phase = 'loading';
      this.activePowerup = null;
      this.gameState.reset();
      this.loadLevel();
    });
  }

  ngOnDestroy(): void {
    this.gameState.reset();
  }

  get movesLeft(): number {
    return this.gameState.state?.movesLeft ?? 0;
  }

  // ── Data loading ──────────────────────────────────────────────────────────

  private loadLevel(): void {
    this.phase = 'loading';

    Promise.all([
      this.api.get<LevelData>(`/api/levels/${this.levelId}`).toPromise(),
      this.api.get<PlayerProfile>('/api/player/profile').toPromise()
    ])
    .then(([levelData, profile]) => {
      if (!levelData) { this.phase = 'error'; return; }
      this.levelData = levelData;
      this.profile   = profile ?? null;

      this.gameState.init(levelData, {
        bombs:    this.profile?.bombs    ?? 0,
        hammers:  this.profile?.hammers  ?? 0
      });

      this.phase = 'playing';
    })
    .catch(() => {
      this.phase = 'error';
    });
  }

  // ── Power-ups ─────────────────────────────────────────────────────────────

  togglePowerup(type: 'bomb' | 'hammer'): void {
    this.activePowerup = this.activePowerup === type ? null : type;
    this.gameState.setActivePowerup(this.activePowerup);
  }

  // ── Tile interaction ──────────────────────────────────────────────────────

  onTileClicked(coords: { q: number; r: number }): void {
    const { q, r } = coords;

    if (this.activePowerup === 'bomb') {
      this.gameState.useBomb(q, r);
      this.activePowerup = null;
      this.gameState.setActivePowerup(null);
      if (this.profile && this.profile.bombs > 0) this.profile.bombs--;
      this.saveProgressToApi();
      this.checkGameEnd();
      return;
    }

    if (this.activePowerup === 'hammer') {
      this.gameState.useHammer(q, r);
      this.activePowerup = null;
      this.gameState.setActivePowerup(null);
      if (this.profile && this.profile.hammers > 0) this.profile.hammers--;
      this.saveProgressToApi();
      this.checkGameEnd();
      return;
    }

    // Normal move — capture tile before state changes
    const tile = this.gameState.state?.tiles.get(hexKey(q, r));

    const { result, toQ, toR } = this.gameState.moveTile(q, r);

    if (result === 'exited') {
      if (tile) this.hexCanvas?.animateExit(tile, q, r, toQ, toR);
      this.checkGameEnd();
    } else if (result === 'moved') {
      if (tile) this.hexCanvas?.animateMove(tile, q, r, toQ, toR);
      this.checkGameEnd();
    }
    // 'blocked' — no animation needed
  }

  private checkGameEnd(): void {
    if (this.gameState.isWon()) {
      this.handleWin();
    } else if (this.gameState.isLost()) {
      this.handleLose();
    }
  }

  // ── Win/Lose handling ────────────────────────────────────────────────────

  private handleWin(): void {
    this.starsEarned = this.calcStars();
    this.coinsEarned = this.starsEarned * 10;

    this.saveProgressToApi(true);
    this.awardCoins(this.coinsEarned);

    // Slight delay so the last animation completes
    setTimeout(() => { this.phase = 'won'; }, 500);
  }

  private handleLose(): void {
    setTimeout(() => { this.phase = 'lost'; }, 400);
  }

  private calcStars(): number {
    const state = this.gameState.state;
    if (!state || !this.levelData) return 1;
    const ratio = state.movesLeft / this.levelData.maxMoves;
    if (ratio >= 0.5) return 3;
    if (ratio >= 0.2) return 2;
    return 1;
  }

  // ── API calls ─────────────────────────────────────────────────────────────

  private saveProgressToApi(completed = false): void {
    const state = this.gameState.state;
    if (!state) return;

    const payload = {
      levelId:   this.levelId,
      completed,
      stars:     completed ? this.calcStars() : 0,
      bestMoves: state.movesLeft
    };

    this.api.post('/api/progress', payload).subscribe({
      error: (e) => console.warn('Progress save failed', e)
    });
  }

  private awardCoins(amount: number): void {
    if (!this.profile || amount <= 0) return;

    this.profile.coins += amount;

    this.api.put('/api/player/profile', {
      coins:   this.profile.coins,
      bombs:   this.profile.bombs,
      hammers: this.profile.hammers
    }).subscribe({
      error: (e) => console.warn('Profile update failed', e)
    });
  }

  // ── Navigation ────────────────────────────────────────────────────────────

  nextLevel(): void {
    this.router.navigate(['/game', this.levelId + 1]);
  }

  retryLevel(): void {
    if (this.levelData) {
      this.gameState.init(this.levelData, {
        bombs:   this.profile?.bombs   ?? 0,
        hammers: this.profile?.hammers ?? 0
      });
      this.activePowerup = null;
      this.phase = 'playing';
    } else {
      this.loadLevel();
    }
  }

  goMenu():  void { this.router.navigate(['/menu']);  }
  goShop():  void { this.router.navigate(['/shop']);  }

  onLogOut(): void {
    this.auth.signOut();
    this.router.navigate(['/auth']);
  }

  confirmBack(): void {
    if (this.phase === 'playing') {
      const ok = window.confirm('Leave this level? Progress will be lost.');
      if (!ok) return;
    }
    this.goMenu();
  }
}
