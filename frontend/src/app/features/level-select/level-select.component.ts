import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterModule } from '@angular/router';
import { ApiService } from '../../core/services/api.service';
import { LevelSummary, LevelProgress } from '../../shared/models';

interface LevelCard {
  summary:   LevelSummary;
  progress:  LevelProgress | null;
  locked:    boolean;
  stars:     number;        // 0-3
}

@Component({
  selector: 'app-level-select',
  standalone: true,
  imports: [CommonModule, RouterModule],
  template: `
    <div class="ls-wrapper">

      <!-- Header -->
      <header class="ls-header">
        <button class="back-btn" (click)="goBack()">
          <span>←</span> Menu
        </button>
        <h1 class="header-title">Select Level</h1>
        <div class="header-spacer"></div>
      </header>

      <!-- Loading state -->
      <div class="loading-grid" *ngIf="loading">
        <div class="skeleton-card" *ngFor="let _ of skeletons"></div>
      </div>

      <!-- Error state -->
      <div class="error-state" *ngIf="!loading && error">
        <p>⚠ Could not load levels.</p>
        <button class="retry-btn" (click)="loadData()">Retry</button>
      </div>

      <!-- Level grid -->
      <main class="level-grid" *ngIf="!loading && !error">
        <button
          *ngFor="let card of levelCards; trackBy: trackById"
          class="level-card"
          [class.locked]="card.locked"
          [class.completed]="!card.locked && card.stars > 0"
          [class.unlocked]="!card.locked && card.stars === 0"
          (click)="onLevelClick(card)"
          [attr.aria-label]="'Level ' + card.summary.id + (card.locked ? ' locked' : '')"
          [disabled]="card.locked">

          <!-- Lock overlay -->
          <div class="lock-overlay" *ngIf="card.locked">
            <span class="lock-icon">🔒</span>
          </div>

          <!-- Level number -->
          <span class="level-number">{{ card.summary.id }}</span>

          <!-- Star row -->
          <div class="star-row" *ngIf="!card.locked">
            <span
              *ngFor="let s of [1,2,3]"
              class="star"
              [class.filled]="card.stars >= s">
              ★
            </span>
          </div>

          <!-- Difficulty dots -->
          <div class="diff-dots" *ngIf="!card.locked">
            <span
              *ngFor="let d of [1,2,3]"
              class="dot"
              [class.active]="card.summary.difficulty >= d">
            </span>
          </div>

        </button>
      </main>

      <!-- Decorative bg hexes -->
      <div class="bg-hex bh1" aria-hidden="true"></div>
      <div class="bg-hex bh2" aria-hidden="true"></div>
    </div>
  `,
  styles: [`
    :host {
      display: block;
      min-height: 100vh;
      background: linear-gradient(160deg, #2a0a4a 0%, #4a1280 55%, #1a0535 100%);
      font-family: 'Segoe UI', Arial, sans-serif;
    }

    .ls-wrapper {
      min-height: 100vh;
      display: flex;
      flex-direction: column;
      padding-bottom: 32px;
      position: relative;
    }

    /* ── Header ── */
    .ls-header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 14px 16px;
      position: sticky;
      top: 0;
      z-index: 20;
      background: rgba(42, 10, 74, 0.85);
      backdrop-filter: blur(10px);
      border-bottom: 1px solid rgba(255,255,255,0.08);
    }

    .back-btn {
      display: flex;
      align-items: center;
      gap: 4px;
      background: rgba(255,255,255,0.1);
      border: 1px solid rgba(255,255,255,0.2);
      border-radius: 50px;
      color: rgba(255,255,255,0.8);
      font-size: 0.88rem;
      font-weight: 600;
      padding: 8px 16px;
      cursor: pointer;
      transition: background 0.2s;
    }

    .back-btn:hover { background: rgba(255,255,255,0.18); }

    .header-title {
      font-size: 1.2rem;
      font-weight: 800;
      color: #fff;
      margin: 0;
      letter-spacing: 0.5px;
    }

    .header-spacer { width: 90px; }

    /* ── Loading skeletons ── */
    .loading-grid {
      display: grid;
      grid-template-columns: repeat(4, 1fr);
      gap: 12px;
      padding: 20px 16px;
    }

    .skeleton-card {
      aspect-ratio: 1 / 1.1;
      border-radius: 14px;
      background: rgba(255,255,255,0.06);
      animation: shimmer 1.2s ease-in-out infinite;
    }

    /* ── Error ── */
    .error-state {
      flex: 1;
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      gap: 16px;
      color: #ff8888;
      font-size: 1rem;
    }

    .retry-btn {
      padding: 10px 28px;
      border: none;
      border-radius: 50px;
      background: linear-gradient(135deg, #f07830, #e84040);
      color: #fff;
      font-weight: 700;
      cursor: pointer;
    }

    /* ── Level grid ── */
    .level-grid {
      display: grid;
      grid-template-columns: repeat(4, 1fr);
      gap: 12px;
      padding: 20px 16px;
      position: relative;
      z-index: 5;
    }

    /* ── Level card ── */
    .level-card {
      position: relative;
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      gap: 6px;
      aspect-ratio: 1 / 1.15;
      border-radius: 14px;
      border: 2px solid transparent;
      cursor: pointer;
      font-family: inherit;
      transition: transform 0.15s, box-shadow 0.15s;
      overflow: hidden;
      padding: 8px 4px;
    }

    .level-card:hover:not(:disabled) {
      transform: translateY(-3px) scale(1.03);
    }

    .level-card:active:not(:disabled) {
      transform: scale(0.97);
    }

    /* States */
    .level-card.locked {
      background: rgba(255,255,255,0.05);
      border-color: rgba(255,255,255,0.08);
      cursor: not-allowed;
    }

    .level-card.unlocked {
      background: linear-gradient(145deg, #3a1870, #5a20a0);
      border-color: rgba(255,255,255,0.2);
      box-shadow: 0 4px 14px rgba(90,32,160,0.4);
    }

    .level-card.completed {
      background: linear-gradient(145deg, #1a5a30, #20803c);
      border-color: rgba(64,184,64,0.4);
      box-shadow: 0 4px 14px rgba(32,128,60,0.4);
    }

    /* Lock overlay */
    .lock-overlay {
      position: absolute;
      inset: 0;
      display: flex;
      align-items: center;
      justify-content: center;
      background: rgba(0,0,0,0.3);
    }

    .lock-icon { font-size: 1.4rem; opacity: 0.6; }

    /* Level number */
    .level-number {
      font-size: 1.3rem;
      font-weight: 900;
      color: #fff;
      text-shadow: 0 1px 4px rgba(0,0,0,0.4);
      line-height: 1;
    }

    .locked .level-number { opacity: 0.3; }

    /* Stars */
    .star-row {
      display: flex;
      gap: 2px;
    }

    .star {
      font-size: 0.85rem;
      color: rgba(255,255,255,0.25);
      transition: color 0.2s;
    }

    .star.filled { color: #ffcc00; text-shadow: 0 0 6px rgba(255,204,0,0.6); }

    /* Difficulty dots */
    .diff-dots {
      display: flex;
      gap: 3px;
    }

    .dot {
      width: 5px;
      height: 5px;
      border-radius: 50%;
      background: rgba(255,255,255,0.2);
    }

    .dot.active { background: #f07830; }

    /* ── Decorative BG ── */
    .bg-hex {
      position: fixed;
      clip-path: polygon(50% 0%, 93% 25%, 93% 75%, 50% 100%, 7% 75%, 7% 25%);
      opacity: 0.05;
      pointer-events: none;
      z-index: 0;
    }

    .bh1 { width: 280px; height: 280px; background: #f07830; top: -60px; right: -80px; }
    .bh2 { width: 180px; height: 180px; background: #4080e8; bottom: 40px; left: -50px; }

    /* ── Animations ── */
    @keyframes shimmer {
      0%, 100% { opacity: 0.4; }
      50%       { opacity: 0.8; }
    }

    /* ── Responsive ── */
    @media (max-width: 600px) {
      .level-grid    { grid-template-columns: repeat(3, 1fr); gap: 10px; padding: 14px 12px; }
      .loading-grid  { grid-template-columns: repeat(3, 1fr); gap: 10px; padding: 14px 12px; }
      .level-number  { font-size: 1.1rem; }
    }

    @media (max-width: 360px) {
      .level-grid   { grid-template-columns: repeat(3, 1fr); gap: 8px; padding: 12px 10px; }
      .level-number { font-size: 1rem; }
    }
  `]
})
export class LevelSelectComponent implements OnInit {
  levelCards: LevelCard[] = [];
  loading    = true;
  error      = false;
  skeletons  = new Array(16);

  constructor(
    private router: Router,
    private api:    ApiService
  ) {}

  ngOnInit(): void {
    this.loadData();
  }

  loadData(): void {
    this.loading = true;
    this.error   = false;

    // Fetch both in parallel
    Promise.all([
      this.api.get<LevelSummary[]>('/api/levels').toPromise(),
      this.api.get<LevelProgress[]>('/api/progress').toPromise()
    ])
    .then(([levels, progressList]) => {
      const safeProgress = progressList ?? [];
      this.buildCards(levels ?? [], safeProgress);
      this.loading = false;
    })
    .catch(() => {
      this.error   = true;
      this.loading = false;
    });
  }

  private buildCards(levels: LevelSummary[], progressList: LevelProgress[]): void {
    const progressMap = new Map<number, LevelProgress>(
      progressList.map(p => [p.levelId, p])
    );

    this.levelCards = levels.map((summary, index) => {
      const progress = progressMap.get(summary.id) ?? null;
      const prevCompleted = index === 0
        ? true
        : !!(progressMap.get(levels[index - 1].id)?.completed);
      const locked = !prevCompleted;
      const stars  = progress?.stars ?? 0;

      return { summary, progress, locked, stars };
    });
  }

  onLevelClick(card: LevelCard): void {
    if (card.locked) return;
    this.router.navigate(['/game', card.summary.id]);
  }

  goBack(): void {
    this.router.navigate(['/menu']);
  }

  trackById(_: number, card: LevelCard): number {
    return card.summary.id;
  }
}
