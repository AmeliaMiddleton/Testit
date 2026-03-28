import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { ApiService } from '../../core/services/api.service';
import { AuthService } from '../../core/services/auth.service';
import { LeaderboardEntry, PlayerProfile } from '../../shared/models';

type LeagueId = 'bronze' | 'silver' | 'gold' | 'platinum' | 'diamond';

interface LeagueMeta {
  id:       LeagueId;
  label:    string;
  icon:     string;
  color:    string;
  minScore: number;
}

@Component({
  selector: 'app-league',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="league-wrapper">

      <!-- Top bar -->
      <header class="league-header">
        <button class="back-btn" (click)="goMenu()">← Menu</button>

        <div class="header-coins" *ngIf="profile">
          <span>🪙</span>
          <span>{{ profile.coins | number }}</span>
        </div>
      </header>

      <!-- League title -->
      <section class="league-title-area">
        <div class="trophy-icon">{{ currentLeague.icon }}</div>
        <h1 class="league-name">{{ currentLeague.label | uppercase }} LEAGUE</h1>
        <div class="countdown-badge">
          <span class="cd-icon">⏱</span>
          <span>Ends in <strong>{{ countdownDisplay }}</strong></span>
        </div>
      </section>

      <!-- League progression bar -->
      <section class="progression-area">
        <div class="prog-bar-wrap">
          <div
            *ngFor="let l of leagues; let i = index"
            class="prog-step"
            [class.active]="l.id === currentLeague.id"
            [class.past]="leagueIndex(l.id) < leagueIndex(currentLeague.id)">

            <div class="prog-line-before"
              *ngIf="i > 0"
              [class.filled]="leagueIndex(l.id) <= leagueIndex(currentLeague.id)">
            </div>

            <div class="prog-dot">
              <span class="prog-dot-icon">{{ l.icon }}</span>
            </div>
            <span class="prog-dot-label">{{ l.label }}</span>
          </div>
        </div>
      </section>

      <!-- Promo message -->
      <div class="promo-banner" *ngIf="currentLeague.id !== 'diamond'">
        Top 10 players advance to
        <strong>{{ nextLeague?.label }} League</strong>!
      </div>

      <!-- Loading -->
      <div class="loading-rows" *ngIf="loading">
        <div class="skeleton-row" *ngFor="let _ of skeletons"></div>
      </div>

      <!-- Error -->
      <div class="error-state" *ngIf="!loading && error">
        <p>⚠ Could not load leaderboard.</p>
        <button class="retry-btn" (click)="loadLeaderboard()">Retry</button>
      </div>

      <!-- Leaderboard -->
      <ul class="leaderboard" *ngIf="!loading && !error">
        <li
          *ngFor="let entry of entries"
          class="lb-row"
          [class.current-user]="entry.userId === currentUserId"
          [class.rank-gold]="entry.rank === 1"
          [class.rank-silver]="entry.rank === 2"
          [class.rank-bronze]="entry.rank === 3">

          <!-- Rank -->
          <div class="lb-rank">
            <span *ngIf="entry.rank === 1">🥇</span>
            <span *ngIf="entry.rank === 2">🥈</span>
            <span *ngIf="entry.rank === 3">🥉</span>
            <span *ngIf="entry.rank > 3">{{ entry.rank }}</span>
          </div>

          <!-- Avatar -->
          <div class="lb-avatar" [style.background]="avatarColor(entry.username)">
            {{ entry.username.charAt(0).toUpperCase() }}
          </div>

          <!-- Name + score -->
          <div class="lb-info">
            <span class="lb-name">
              {{ entry.username }}
              <span class="you-badge" *ngIf="entry.userId === currentUserId">YOU</span>
            </span>
            <span class="lb-score">{{ entry.weeklyScore | number }} pts</span>
          </div>

          <!-- Score bar -->
          <div class="lb-bar-wrap">
            <div
              class="lb-bar-fill"
              [style.width.%]="scorePercent(entry.weeklyScore)"
              [style.background]="entry.userId === currentUserId ? '#40b840' : currentLeague.color">
            </div>
          </div>

        </li>
      </ul>

      <!-- Bottom tab bar -->
      <nav class="bottom-tab-bar">
        <button class="tab-item" (click)="goShop()">
          <span class="tab-icon">🛒</span>
          <span class="tab-label">Shop</span>
        </button>
        <button class="tab-item" (click)="goMenu()">
          <span class="tab-icon">🏠</span>
          <span class="tab-label">Home</span>
        </button>
        <button class="tab-item active">
          <span class="tab-icon">🏆</span>
          <span class="tab-label">League</span>
        </button>
      </nav>

      <!-- Decorative hexes -->
      <div class="bg-hex bh1" aria-hidden="true"></div>
      <div class="bg-hex bh2" aria-hidden="true"></div>
    </div>
  `,
  styles: [`
    :host {
      display: block;
      min-height: 100vh;
      background: linear-gradient(160deg, #1a0535 0%, #2a0a4a 60%, #1a0535 100%);
      font-family: 'Segoe UI', Arial, sans-serif;
    }

    .league-wrapper {
      min-height: 100vh;
      display: flex;
      flex-direction: column;
      padding-bottom: 80px;
      position: relative;
    }

    /* ── Header ── */
    .league-header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 14px 16px;
      position: sticky;
      top: 0;
      z-index: 20;
      background: rgba(26,5,53,0.88);
      backdrop-filter: blur(10px);
      border-bottom: 1px solid rgba(255,255,255,0.07);
    }

    .back-btn {
      background: rgba(255,255,255,0.1);
      border: 1px solid rgba(255,255,255,0.18);
      border-radius: 50px;
      color: rgba(255,255,255,0.8);
      font-size: 0.88rem;
      font-weight: 600;
      padding: 8px 16px;
      cursor: pointer;
      transition: background 0.2s;
    }

    .back-btn:hover { background: rgba(255,255,255,0.18); }

    .header-coins {
      display: flex;
      align-items: center;
      gap: 6px;
      background: rgba(255,204,0,0.12);
      border: 1px solid rgba(255,204,0,0.3);
      border-radius: 50px;
      padding: 6px 14px;
      font-size: 0.88rem;
      font-weight: 700;
      color: #ffdd66;
    }

    /* ── League title area ── */
    .league-title-area {
      display: flex;
      flex-direction: column;
      align-items: center;
      padding: 24px 16px 12px;
      gap: 10px;
      animation: floatIn 0.6s ease-out both;
      position: relative;
      z-index: 5;
    }

    .trophy-icon {
      font-size: 3.5rem;
      filter: drop-shadow(0 4px 14px rgba(240,120,48,0.6));
      animation: trophyBounce 2.5s ease-in-out infinite;
    }

    .league-name {
      font-size: 1.6rem;
      font-weight: 900;
      color: #fff;
      margin: 0;
      letter-spacing: 1.5px;
      text-shadow: 0 2px 10px rgba(0,0,0,0.4);
    }

    .countdown-badge {
      display: flex;
      align-items: center;
      gap: 7px;
      background: rgba(255,255,255,0.08);
      border: 1px solid rgba(255,255,255,0.15);
      border-radius: 50px;
      padding: 6px 18px;
      font-size: 0.85rem;
      color: rgba(255,255,255,0.75);
    }

    .countdown-badge strong { color: #fff; }
    .cd-icon { font-size: 0.9rem; }

    /* ── Progression bar ── */
    .progression-area {
      padding: 0 16px 16px;
      position: relative;
      z-index: 5;
    }

    .prog-bar-wrap {
      display: flex;
      align-items: flex-start;
      justify-content: space-between;
      position: relative;
      padding-top: 8px;
    }

    .prog-step {
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 6px;
      flex: 1;
      position: relative;
    }

    .prog-line-before {
      position: absolute;
      top: 17px;
      right: 50%;
      width: 100%;
      height: 2px;
      background: rgba(255,255,255,0.1);
      z-index: 1;
    }

    .prog-line-before.filled { background: rgba(64,184,64,0.5); }

    .prog-dot {
      width: 36px;
      height: 36px;
      border-radius: 50%;
      background: rgba(255,255,255,0.1);
      border: 2px solid rgba(255,255,255,0.2);
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 1rem;
      position: relative;
      z-index: 2;
      transition: background 0.3s, border-color 0.3s;
    }

    .prog-step.past .prog-dot {
      background: rgba(64,184,64,0.3);
      border-color: rgba(64,184,64,0.6);
    }

    .prog-step.active .prog-dot {
      background: linear-gradient(135deg, #f07830, #e84040);
      border-color: #ffcc00;
      box-shadow: 0 0 14px rgba(240,120,48,0.6);
    }

    .prog-dot-icon { line-height: 1; }

    .prog-dot-label {
      font-size: 0.65rem;
      font-weight: 700;
      color: rgba(255,255,255,0.45);
      text-transform: uppercase;
      letter-spacing: 0.3px;
      text-align: center;
    }

    .prog-step.active .prog-dot-label { color: rgba(255,255,255,0.9); }
    .prog-step.past   .prog-dot-label { color: rgba(64,184,64,0.8); }

    /* ── Promo banner ── */
    .promo-banner {
      margin: 0 16px 16px;
      padding: 10px 16px;
      background: rgba(64,128,232,0.15);
      border: 1px solid rgba(64,128,232,0.3);
      border-radius: 12px;
      font-size: 0.85rem;
      color: rgba(255,255,255,0.7);
      text-align: center;
      position: relative;
      z-index: 5;
    }

    .promo-banner strong { color: #80c0ff; }

    /* ── Loading ── */
    .loading-rows {
      padding: 0 16px;
      display: flex;
      flex-direction: column;
      gap: 10px;
    }

    .skeleton-row {
      height: 56px;
      border-radius: 12px;
      background: rgba(255,255,255,0.05);
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
    }

    .retry-btn {
      padding: 10px 24px;
      border: none;
      border-radius: 50px;
      background: linear-gradient(135deg, #f07830, #e84040);
      color: #fff;
      font-weight: 700;
      cursor: pointer;
    }

    /* ── Leaderboard ── */
    .leaderboard {
      list-style: none;
      margin: 0;
      padding: 0 12px;
      display: flex;
      flex-direction: column;
      gap: 8px;
      position: relative;
      z-index: 5;
    }

    .lb-row {
      display: grid;
      grid-template-columns: 36px 42px 1fr 80px;
      align-items: center;
      gap: 10px;
      padding: 10px 14px;
      border-radius: 14px;
      background: rgba(255,255,255,0.05);
      border: 1px solid rgba(255,255,255,0.08);
      transition: background 0.2s;
    }

    .lb-row:hover { background: rgba(255,255,255,0.08); }

    .lb-row.rank-gold   { background: rgba(255,204,0,0.1);   border-color: rgba(255,204,0,0.3);   }
    .lb-row.rank-silver { background: rgba(192,192,192,0.1); border-color: rgba(192,192,192,0.25); }
    .lb-row.rank-bronze { background: rgba(200,120,60,0.1);  border-color: rgba(200,120,60,0.25); }

    .lb-row.current-user {
      background: rgba(64,184,64,0.12);
      border-color: rgba(64,184,64,0.4);
      box-shadow: 0 0 0 2px rgba(64,184,64,0.2);
    }

    .lb-rank {
      font-size: 1.1rem;
      font-weight: 900;
      color: rgba(255,255,255,0.55);
      text-align: center;
    }

    .rank-gold .lb-rank,
    .rank-silver .lb-rank,
    .rank-bronze .lb-rank { font-size: 1.3rem; }

    .lb-avatar {
      width: 38px;
      height: 38px;
      border-radius: 50%;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 1rem;
      font-weight: 800;
      color: #fff;
      flex-shrink: 0;
      box-shadow: 0 2px 8px rgba(0,0,0,0.3);
    }

    .lb-info {
      display: flex;
      flex-direction: column;
      gap: 2px;
      min-width: 0;
    }

    .lb-name {
      font-size: 0.9rem;
      font-weight: 700;
      color: #fff;
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
    }

    .you-badge {
      display: inline-block;
      background: #40b840;
      color: #fff;
      font-size: 0.6rem;
      font-weight: 800;
      padding: 1px 6px;
      border-radius: 50px;
      margin-left: 4px;
      vertical-align: middle;
    }

    .lb-score {
      font-size: 0.78rem;
      color: rgba(255,255,255,0.5);
    }

    .lb-bar-wrap {
      height: 6px;
      background: rgba(255,255,255,0.1);
      border-radius: 3px;
      overflow: hidden;
    }

    .lb-bar-fill {
      height: 100%;
      border-radius: 3px;
      transition: width 0.6s ease-out;
    }

    /* ── Bottom tab bar ── */
    .bottom-tab-bar {
      position: fixed;
      bottom: 0;
      left: 0;
      right: 0;
      display: flex;
      background: rgba(26,5,53,0.95);
      backdrop-filter: blur(12px);
      border-top: 1px solid rgba(255,255,255,0.1);
      z-index: 30;
    }

    .tab-item {
      flex: 1;
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      gap: 3px;
      padding: 10px 0 14px;
      background: none;
      border: none;
      cursor: pointer;
      transition: background 0.2s;
    }

    .tab-item:hover { background: rgba(255,255,255,0.05); }

    .tab-icon  { font-size: 1.3rem; }
    .tab-label {
      font-size: 0.68rem;
      font-weight: 700;
      color: rgba(255,255,255,0.45);
      text-transform: uppercase;
      letter-spacing: 0.5px;
    }

    .tab-item.active .tab-label { color: #f07830; }

    /* ── Decorative BG ── */
    .bg-hex {
      position: fixed;
      clip-path: polygon(50% 0%, 93% 25%, 93% 75%, 50% 100%, 7% 75%, 7% 25%);
      opacity: 0.04;
      pointer-events: none;
      z-index: 0;
    }

    .bh1 { width: 300px; height: 300px; background: #f07830; top: -60px; right: -80px; }
    .bh2 { width: 200px; height: 200px; background: #4080e8; bottom: 100px; left: -60px; }

    /* ── Animations ── */
    @keyframes floatIn {
      from { opacity: 0; transform: translateY(20px); }
      to   { opacity: 1; transform: translateY(0); }
    }

    @keyframes trophyBounce {
      0%, 100% { transform: translateY(0) scale(1);       }
      50%       { transform: translateY(-6px) scale(1.06); }
    }

    @keyframes shimmer {
      0%, 100% { opacity: 0.4; }
      50%       { opacity: 0.8; }
    }

    /* ── Responsive ── */
    @media (max-width: 380px) {
      .lb-row    { grid-template-columns: 30px 36px 1fr 56px; gap: 7px; padding: 8px 10px; }
      .lb-name   { font-size: 0.82rem; }
      .league-name { font-size: 1.3rem; }
    }
  `]
})
export class LeagueComponent implements OnInit, OnDestroy {
  leagues: LeagueMeta[] = [
    { id: 'bronze',   label: 'Bronze',   icon: '🥉', color: '#c87840', minScore: 0      },
    { id: 'silver',   label: 'Silver',   icon: '🥈', color: '#b0b0b0', minScore: 1000   },
    { id: 'gold',     label: 'Gold',     icon: '🥇', color: '#ffcc00', minScore: 3000   },
    { id: 'platinum', label: 'Platinum', icon: '💠', color: '#60c0ff', minScore: 8000   },
    { id: 'diamond',  label: 'Diamond',  icon: '💎', color: '#a0e0ff', minScore: 20000  }
  ];

  currentLeague: LeagueMeta = this.leagues[0];
  entries:        LeaderboardEntry[] = [];
  profile:        PlayerProfile | null = null;
  currentUserId   = '';

  loading   = true;
  error     = false;
  skeletons = new Array(8);

  // Cosmetic countdown — 2d 6h in seconds
  private countdownSec = 2 * 86400 + 6 * 3600;
  private cdInterval?: ReturnType<typeof setInterval>;
  countdownDisplay = '2d 6h';

  constructor(
    private router: Router,
    private api:    ApiService,
    private auth:   AuthService
  ) {}

  ngOnInit(): void {
    this.currentUserId = this.auth.currentUserId() ?? '';
    this.loadProfile();
    this.loadLeaderboard();
    this.startCountdown();
  }

  ngOnDestroy(): void {
    if (this.cdInterval) clearInterval(this.cdInterval);
  }

  private loadProfile(): void {
    this.api.get<PlayerProfile>('/api/player/profile').subscribe({
      next:  (p) => { this.profile = p; },
      error: ()  => {}
    });
  }

  loadLeaderboard(): void {
    this.loading = true;
    this.error   = false;

    this.api.get<LeaderboardEntry[]>(`/api/leaderboard?league=${this.currentLeague.id}`).subscribe({
      next: (rawEntries) => {
        this.entries = (rawEntries ?? [])
          .sort((a, b) => b.weeklyScore - a.weeklyScore)
          .map((e, i) => ({ ...e, rank: i + 1 }));

        // Update current league based on user's entry
        const myEntry = this.entries.find(e => e.userId === this.currentUserId);
        if (myEntry?.league) {
          const found = this.leagues.find(l => l.id === (myEntry.league as LeagueId));
          if (found) this.currentLeague = found;
        }

        this.loading = false;
      },
      error: () => {
        this.error   = true;
        this.loading = false;
      }
    });
  }

  get nextLeague(): LeagueMeta | null {
    const idx = this.leagueIndex(this.currentLeague.id);
    return idx < this.leagues.length - 1 ? this.leagues[idx + 1] : null;
  }

  leagueIndex(id: LeagueId): number {
    return this.leagues.findIndex(l => l.id === id);
  }

  private startCountdown(): void {
    this.cdInterval = setInterval(() => {
      this.countdownSec = Math.max(0, this.countdownSec - 1);
      const d = Math.floor(this.countdownSec / 86400);
      const h = Math.floor((this.countdownSec % 86400) / 3600);
      const m = Math.floor((this.countdownSec % 3600) / 60);

      if (d > 0)      this.countdownDisplay = `${d}d ${h}h`;
      else if (h > 0) this.countdownDisplay = `${h}h ${m}m`;
      else            this.countdownDisplay = `${m}m`;
    }, 1000);
  }

  /** Deterministic colour from username for avatar background */
  avatarColor(username: string): string {
    const PALETTE = [
      '#e84040', '#f07830', '#f0c830', '#40b840',
      '#4080e8', '#a040e8', '#40c8e8', '#e840a0'
    ];
    let hash = 0;
    for (let i = 0; i < username.length; i++) {
      hash = username.charCodeAt(i) + ((hash << 5) - hash);
    }
    return PALETTE[Math.abs(hash) % PALETTE.length];
  }

  /** Score bar width as percentage of top score */
  scorePercent(score: number): number {
    if (!this.entries.length) return 0;
    const max = this.entries[0].weeklyScore;
    return max > 0 ? Math.round((score / max) * 100) : 0;
  }

  goMenu(): void { this.router.navigate(['/menu']); }
  goShop(): void { this.router.navigate(['/shop']); }
}
