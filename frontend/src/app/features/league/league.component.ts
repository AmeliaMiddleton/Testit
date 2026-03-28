import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { ApiService } from '../../core/services/api.service';
import { AuthService } from '../../core/services/auth.service';
import { LeaderboardEntry } from '../../shared/models';

@Component({
  selector: 'app-league',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="league-screen">
      <!-- Top Bar -->
      <div class="top-bar">
        <div class="currency">
          <span class="heart">❤️</span><span class="label">5 MAX</span>
          <span class="coins">🪙 {{ coins }}</span>
        </div>
      </div>

      <!-- League Progression -->
      <div class="league-header">
        <div class="league-progress-icons">
          <span *ngFor="let l of leagues" class="league-icon" [class.active]="l === currentLeague">
            {{ leagueEmoji(l) }}
          </span>
        </div>

        <div class="league-title-card">
          <div class="trophy">🏆</div>
          <div class="league-name">{{ currentLeague.toUpperCase() }} LEAGUE</div>
          <div class="countdown">⏱ {{ countdown }}</div>
        </div>
      </div>

      <!-- Leaderboard -->
      <div class="leaderboard">
        <div *ngIf="loading" class="loading-msg">Loading...</div>
        <div *ngFor="let entry of entries; let i = index"
             class="entry"
             [class.current-user]="entry.userId === currentUserId"
             [class.rank-1]="entry.rank === 1"
             [class.rank-2]="entry.rank === 2"
             [class.rank-3]="entry.rank === 3">
          <span class="rank">{{ entry.rank }}</span>
          <div class="avatar" [style.background]="avatarColor(entry.avatar)">
            {{ entry.username.charAt(0) }}
          </div>
          <span class="username">{{ entry.username }}</span>
          <span class="score">🏆 {{ entry.weeklyScore }}</span>
        </div>
      </div>

      <!-- Bottom Tab Bar -->
      <div class="tab-bar">
        <button class="tab-btn" (click)="router.navigate(['/shop'])">🛒<br><small>Shop</small></button>
        <button class="tab-btn" (click)="router.navigate(['/menu'])">🏠<br><small>Home</small></button>
        <button class="tab-btn active">🏆<br><small>League</small></button>
      </div>
    </div>
  `,
  styles: [`
    .league-screen {
      min-height: 100vh;
      background: linear-gradient(160deg, #7c3aed, #4c1d95);
      color: #fff;
      display: flex;
      flex-direction: column;
      font-family: 'Nunito', sans-serif;
      padding-bottom: 70px;
    }
    .top-bar {
      display: flex;
      justify-content: flex-end;
      align-items: center;
      padding: 12px 16px;
    }
    .currency {
      display: flex;
      gap: 10px;
      align-items: center;
      background: rgba(0,0,0,0.25);
      padding: 6px 14px;
      border-radius: 20px;
      font-weight: 700;
      font-size: 14px;
    }
    .league-header {
      padding: 0 16px 8px;
    }
    .league-progress-icons {
      display: flex;
      justify-content: center;
      gap: 12px;
      margin-bottom: 12px;
      font-size: 22px;
    }
    .league-icon { opacity: 0.4; }
    .league-icon.active { opacity: 1; filter: drop-shadow(0 0 6px gold); }
    .league-title-card {
      background: linear-gradient(135deg, #cd7f32, #e8a96b);
      border-radius: 16px;
      padding: 20px;
      text-align: center;
      margin-bottom: 8px;
      box-shadow: 0 4px 16px rgba(0,0,0,0.3);
    }
    .trophy { font-size: 48px; }
    .league-name { font-size: 24px; font-weight: 900; letter-spacing: 1px; margin: 4px 0; }
    .countdown {
      background: rgba(0,0,0,0.2);
      display: inline-block;
      padding: 4px 14px;
      border-radius: 20px;
      font-size: 14px;
      font-weight: 700;
    }
    .leaderboard {
      background: rgba(255,255,255,0.07);
      border-radius: 16px 16px 0 0;
      flex: 1;
      overflow-y: auto;
      margin: 0 8px;
    }
    .loading-msg { padding: 24px; text-align: center; opacity: 0.6; }
    .entry {
      display: flex;
      align-items: center;
      gap: 12px;
      padding: 10px 16px;
      border-bottom: 1px solid rgba(255,255,255,0.08);
      transition: background 0.2s;
    }
    .entry.current-user { background: rgba(74, 222, 128, 0.25); border-radius: 8px; }
    .entry.rank-1 .rank { color: gold; font-size: 18px; }
    .entry.rank-2 .rank { color: silver; font-size: 16px; }
    .entry.rank-3 .rank { color: #cd7f32; font-size: 15px; }
    .rank { width: 28px; text-align: center; font-weight: 900; font-size: 14px; }
    .avatar {
      width: 36px; height: 36px; border-radius: 50%;
      display: flex; align-items: center; justify-content: center;
      font-weight: 900; font-size: 16px; color: #fff;
      border: 2px solid rgba(255,255,255,0.3);
    }
    .username { flex: 1; font-weight: 700; font-size: 15px; }
    .score {
      background: rgba(255,255,255,0.12);
      padding: 4px 10px;
      border-radius: 12px;
      font-size: 13px;
      font-weight: 700;
    }
    .tab-bar {
      position: fixed;
      bottom: 0; left: 0; right: 0;
      display: flex;
      background: #1e1b4b;
      border-top: 1px solid rgba(255,255,255,0.1);
      z-index: 100;
    }
    .tab-btn {
      flex: 1; padding: 10px;
      background: none; border: none;
      color: rgba(255,255,255,0.5);
      font-size: 20px; cursor: pointer;
      transition: color 0.2s;
    }
    .tab-btn small { font-size: 10px; display: block; }
    .tab-btn.active { color: #a78bfa; }
    .tab-btn:hover { color: #fff; }
  `]
})
export class LeagueComponent implements OnInit {
  entries: LeaderboardEntry[] = [];
  loading = true;
  coins = 0;
  currentUserId = '';
  currentLeague = 'bronze';
  leagues = ['bronze', 'silver', 'gold', 'platinum', 'diamond'];
  countdown = '2d 6h';

  private countdownSeconds = 2 * 86400 + 6 * 3600;

  constructor(
    public router: Router,
    private api: ApiService,
    private auth: AuthService
  ) {}

  ngOnInit(): void {
    this.currentUserId = this.auth.currentUser?.id ?? '';
    this.loadProfile();
    this.loadLeaderboard();
    this.startCountdown();
  }

  private loadProfile(): void {
    this.api.get<{ coins: number; league?: string }>('/api/player/profile').subscribe({
      next: p => {
        this.coins = p.coins;
        if (p.league) this.currentLeague = p.league;
      },
      error: () => {}
    });
  }

  private loadLeaderboard(): void {
    this.api.get<LeaderboardEntry[]>(`/api/leaderboard?league=${this.currentLeague}`).subscribe({
      next: data => {
        this.entries = data;
        this.loading = false;
      },
      error: () => {
        this.entries = this.mockEntries();
        this.loading = false;
      }
    });
  }

  leagueEmoji(league: string): string {
    const map: Record<string, string> = {
      bronze: '🥉', silver: '🥈', gold: '🥇', platinum: '💎', diamond: '👑'
    };
    return map[league] ?? '🏆';
  }

  avatarColor(avatar: string): string {
    const colors: Record<string, string> = {
      bear: '#8b5e3c', lion: '#d4a017', panda: '#555', cat: '#9c6b98', default: '#4080e8'
    };
    return colors[avatar] ?? colors['default'];
  }

  private startCountdown(): void {
    setInterval(() => {
      if (this.countdownSeconds > 0) {
        this.countdownSeconds--;
        const days = Math.floor(this.countdownSeconds / 86400);
        const hours = Math.floor((this.countdownSeconds % 86400) / 3600);
        const mins = Math.floor((this.countdownSeconds % 3600) / 60);
        if (days > 0) this.countdown = `${days}d ${hours}h`;
        else if (hours > 0) this.countdown = `${hours}h ${mins}m`;
        else this.countdown = `${mins}m`;
      }
    }, 1000);
  }

  private mockEntries(): LeaderboardEntry[] {
    const names = [
      'GageRay','AceRay','Player187','RuneVale','Player2212','SorenKnight',
      'FinnBlade','Player3837','GiaNova','IndyJet','Player5816','GaleSky',
      'QuestRider','MiraKnight','Player6119','StarVex','LunaStrike','IronPaw',
      'CrestRider','NovaBear','DuskHawk','TidalEdge','BlazePeak','CoralWing',
      'FrostGem','VoidStar','NeonClaw','SwiftTale','BoulderCat','EmberRise'
    ];
    return names.map((name, i) => ({
      id: i + 1,
      userId: `mock-${i}`,
      username: name,
      avatar: ['bear','lion','panda','cat'][i % 4],
      weeklyScore: Math.max(10, 400 - i * 10),
      totalScore: (400 - i * 10) * 5,
      league: 'bronze',
      rank: i + 55
    }));
  }
}
