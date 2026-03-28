import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { ApiService } from '../../core/services/api.service';
import { AuthService } from '../../core/services/auth.service';
import { PlayerProfile } from '../../shared/models';

interface ShopPackage {
  id:       string;
  tag?:     string;          // e.g. "50% OFF", "MOST POPULAR"
  title:    string;
  rewards:  string[];
  price:    string;
  style:    'starter' | 'popular' | 'noads' | 'noads-only' | 'free';
  disabled?: boolean;
}

interface CoinItem {
  id:      'bomb' | 'hammer';
  icon:    string;
  label:   string;
  cost:    number;
  field:   'bombs' | 'hammers';
}

@Component({
  selector: 'app-shop',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="shop-wrapper">

      <!-- Top bar -->
      <header class="shop-header">
        <button class="back-btn" (click)="goBack()">← Back</button>
        <h1 class="shop-title">SHOP</h1>
        <div class="header-resources" *ngIf="profile">
          <div class="res-chip coin-chip">
            <span>🪙</span>
            <span>{{ profile.coins | number }}</span>
          </div>
          <div class="res-chip heart-chip">
            <span>❤️</span>
            <span>5</span>
          </div>
        </div>
        <div class="header-resources" *ngIf="!profile">
          <div class="res-chip skeleton-chip"></div>
        </div>
      </header>

      <!-- Toast notification -->
      <div class="toast" [class.visible]="toastMsg" *ngIf="toastMsg">
        {{ toastMsg }}
      </div>

      <!-- Scroll area -->
      <div class="shop-scroll">

        <!-- ── Real-money packs ── -->
        <section class="shop-section">
          <h2 class="section-heading">💎 Premium Packs</h2>

          <div
            *ngFor="let pkg of packages"
            class="pack-card"
            [class]="'pack-' + pkg.style">

            <!-- Tag badge -->
            <span class="pack-tag" *ngIf="pkg.tag">{{ pkg.tag }}</span>

            <div class="pack-body">
              <div class="pack-info">
                <span class="pack-title">{{ pkg.title }}</span>
                <ul class="pack-rewards">
                  <li *ngFor="let r of pkg.rewards">{{ r }}</li>
                </ul>
              </div>
              <button
                class="buy-btn"
                [class]="'buy-' + pkg.style"
                (click)="onBuyRealMoney(pkg)"
                [disabled]="pkg.disabled">
                {{ pkg.price }}
              </button>
            </div>
          </div>
        </section>

        <!-- ── Coin items ── -->
        <section class="shop-section">
          <h2 class="section-heading">🪙 Buy with Coins</h2>
          <p class="section-sub" *ngIf="!profile">Loading your balance…</p>
          <p class="section-sub" *ngIf="profile">Balance: {{ profile.coins | number }} coins</p>

          <div class="coin-items-grid">
            <div
              *ngFor="let item of coinItems"
              class="coin-item-card">

              <span class="ci-icon">{{ item.icon }}</span>
              <span class="ci-label">{{ item.label }}</span>
              <span class="ci-cost">
                <span class="ci-coin">🪙</span> {{ item.cost }}
              </span>

              <button
                class="coin-buy-btn"
                [disabled]="!profile || (profile.coins < item.cost) || buyingItem === item.id"
                (click)="onBuyWithCoins(item)">
                <span *ngIf="buyingItem !== item.id">Buy</span>
                <span *ngIf="buyingItem === item.id" class="mini-spinner"></span>
              </button>
            </div>
          </div>
        </section>

        <!-- ── Free ad reward ── -->
        <section class="shop-section">
          <h2 class="section-heading">📺 Free Reward</h2>

          <div class="free-ad-card">
            <div class="free-ad-info">
              <span class="free-ad-icon">📺</span>
              <div>
                <p class="free-ad-title">Watch an Ad</p>
                <p class="free-ad-sub">Earn 300 free coins!</p>
              </div>
            </div>
            <button
              class="free-ad-btn"
              [disabled]="adWatched"
              (click)="onWatchAd()">
              {{ adWatched ? '✓ Collected' : 'Watch →' }}
            </button>
          </div>
        </section>

      </div><!-- /.shop-scroll -->

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

    .shop-wrapper {
      min-height: 100vh;
      display: flex;
      flex-direction: column;
      position: relative;
    }

    /* ── Header ── */
    .shop-header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 14px 16px;
      position: sticky;
      top: 0;
      z-index: 20;
      background: rgba(42,10,74,0.9);
      backdrop-filter: blur(10px);
      border-bottom: 1px solid rgba(255,255,255,0.08);
    }

    .back-btn {
      background: rgba(255,255,255,0.1);
      border: 1px solid rgba(255,255,255,0.2);
      border-radius: 50px;
      color: rgba(255,255,255,0.8);
      font-size: 0.88rem;
      font-weight: 600;
      padding: 8px 16px;
      cursor: pointer;
      transition: background 0.2s;
      white-space: nowrap;
    }

    .back-btn:hover { background: rgba(255,255,255,0.18); }

    .shop-title {
      font-size: 1.3rem;
      font-weight: 900;
      color: #fff;
      margin: 0;
      letter-spacing: 2px;
      background: linear-gradient(90deg, #ffcc00, #f07830);
      -webkit-background-clip: text;
      -webkit-text-fill-color: transparent;
      background-clip: text;
    }

    .header-resources { display: flex; gap: 8px; }

    .res-chip {
      display: flex;
      align-items: center;
      gap: 5px;
      border-radius: 50px;
      padding: 6px 12px;
      font-size: 0.85rem;
      font-weight: 700;
      color: #fff;
    }

    .coin-chip { background: rgba(255,204,0,0.15); border: 1px solid rgba(255,204,0,0.35); }
    .heart-chip { background: rgba(232,64,64,0.15); border: 1px solid rgba(232,64,64,0.35); }

    .skeleton-chip {
      width: 70px;
      height: 32px;
      border-radius: 50px;
      background: rgba(255,255,255,0.07);
      animation: shimmer 1.2s ease-in-out infinite;
    }

    /* ── Toast ── */
    .toast {
      position: fixed;
      top: 80px;
      left: 50%;
      transform: translateX(-50%) translateY(-20px);
      background: rgba(64,184,64,0.9);
      color: #fff;
      font-size: 0.9rem;
      font-weight: 700;
      padding: 10px 24px;
      border-radius: 50px;
      z-index: 100;
      opacity: 0;
      transition: opacity 0.3s, transform 0.3s;
      pointer-events: none;
      white-space: nowrap;
    }

    .toast.visible {
      opacity: 1;
      transform: translateX(-50%) translateY(0);
    }

    /* ── Scroll area ── */
    .shop-scroll {
      flex: 1;
      overflow-y: auto;
      padding: 16px 14px 40px;
      position: relative;
      z-index: 5;
    }

    /* ── Section ── */
    .shop-section {
      margin-bottom: 28px;
    }

    .section-heading {
      font-size: 1rem;
      font-weight: 800;
      color: rgba(255,255,255,0.85);
      margin: 0 0 12px;
      letter-spacing: 0.3px;
    }

    .section-sub {
      font-size: 0.82rem;
      color: rgba(255,255,255,0.45);
      margin: -8px 0 12px;
    }

    /* ── Pack cards ── */
    .pack-card {
      position: relative;
      border-radius: 16px;
      margin-bottom: 12px;
      overflow: hidden;
      border: 1.5px solid transparent;
      transition: transform 0.15s;
    }

    .pack-card:hover { transform: translateY(-2px); }

    .pack-starter  { background: linear-gradient(135deg, #4a1280, #7a20b0); border-color: rgba(255,204,0,0.4); }
    .pack-popular  { background: linear-gradient(135deg, #1a4060, #2060a0); border-color: rgba(64,128,232,0.5); }
    .pack-noads    { background: linear-gradient(135deg, #203050, #304080); border-color: rgba(100,160,255,0.35); }
    .pack-noads-only { background: linear-gradient(135deg, #302010, #604020); border-color: rgba(240,120,48,0.35); }
    .pack-free     { background: linear-gradient(135deg, #1a3a1a, #205020); border-color: rgba(64,184,64,0.4); }

    .pack-tag {
      position: absolute;
      top: 0; right: 0;
      background: linear-gradient(90deg, #ffcc00, #f07830);
      color: #1a0535;
      font-size: 0.72rem;
      font-weight: 900;
      padding: 4px 12px;
      border-bottom-left-radius: 10px;
      letter-spacing: 0.5px;
    }

    .pack-body {
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 16px;
      gap: 12px;
    }

    .pack-info { flex: 1; }

    .pack-title {
      display: block;
      font-size: 0.95rem;
      font-weight: 800;
      color: #fff;
      margin-bottom: 6px;
    }

    .pack-rewards {
      list-style: none;
      margin: 0;
      padding: 0;
      display: flex;
      flex-wrap: wrap;
      gap: 4px;
    }

    .pack-rewards li {
      font-size: 0.78rem;
      color: rgba(255,255,255,0.7);
      background: rgba(255,255,255,0.07);
      border-radius: 50px;
      padding: 3px 10px;
    }

    /* Buy buttons */
    .buy-btn {
      flex-shrink: 0;
      padding: 10px 18px;
      border: none;
      border-radius: 12px;
      font-size: 0.95rem;
      font-weight: 800;
      cursor: pointer;
      transition: transform 0.15s, box-shadow 0.15s;
      white-space: nowrap;
    }

    .buy-btn:hover:not(:disabled)  { transform: scale(1.06); }
    .buy-btn:active:not(:disabled) { transform: scale(0.95); }
    .buy-btn:disabled { opacity: 0.45; cursor: not-allowed; }

    .buy-starter   { background: linear-gradient(135deg, #ffcc00, #f07830); color: #1a0535; box-shadow: 0 4px 14px rgba(255,204,0,0.4); }
    .buy-popular   { background: linear-gradient(135deg, #4080e8, #2050c0); color: #fff; box-shadow: 0 4px 14px rgba(64,128,232,0.4); }
    .buy-noads     { background: linear-gradient(135deg, #6090e0, #3060b0); color: #fff; }
    .buy-noads-only{ background: linear-gradient(135deg, #f07830, #c04020); color: #fff; }
    .buy-free      { background: linear-gradient(135deg, #40b840, #20a060); color: #fff; box-shadow: 0 4px 14px rgba(64,184,64,0.4); }

    /* ── Coin items grid ── */
    .coin-items-grid {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 12px;
    }

    .coin-item-card {
      background: rgba(255,255,255,0.07);
      border: 1px solid rgba(255,255,255,0.12);
      border-radius: 14px;
      padding: 16px 12px;
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 8px;
      text-align: center;
      transition: background 0.2s;
    }

    .coin-item-card:hover { background: rgba(255,255,255,0.1); }

    .ci-icon  { font-size: 2rem; }
    .ci-label { font-size: 0.88rem; font-weight: 700; color: rgba(255,255,255,0.85); }
    .ci-cost  {
      display: flex;
      align-items: center;
      gap: 4px;
      font-size: 0.9rem;
      font-weight: 800;
      color: #ffcc00;
    }

    .coin-buy-btn {
      width: 100%;
      padding: 9px;
      border: none;
      border-radius: 10px;
      background: linear-gradient(135deg, #f07830, #e84040);
      color: #fff;
      font-size: 0.88rem;
      font-weight: 800;
      cursor: pointer;
      transition: opacity 0.2s, transform 0.15s;
      min-height: 36px;
      display: flex;
      align-items: center;
      justify-content: center;
    }

    .coin-buy-btn:disabled {
      opacity: 0.35;
      cursor: not-allowed;
    }

    .coin-buy-btn:hover:not(:disabled)  { transform: scale(1.04); }
    .coin-buy-btn:active:not(:disabled) { transform: scale(0.96); }

    .mini-spinner {
      display: inline-block;
      width: 14px;
      height: 14px;
      border: 2px solid rgba(255,255,255,0.3);
      border-top-color: #fff;
      border-radius: 50%;
      animation: spin 0.6s linear infinite;
    }

    /* ── Free ad card ── */
    .free-ad-card {
      background: rgba(64,184,64,0.1);
      border: 1px solid rgba(64,184,64,0.3);
      border-radius: 16px;
      padding: 16px;
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 12px;
    }

    .free-ad-info {
      display: flex;
      align-items: center;
      gap: 12px;
    }

    .free-ad-icon { font-size: 2rem; }

    .free-ad-title {
      font-size: 0.95rem;
      font-weight: 800;
      color: #fff;
      margin: 0 0 2px;
    }

    .free-ad-sub {
      font-size: 0.8rem;
      color: rgba(255,255,255,0.6);
      margin: 0;
    }

    .free-ad-btn {
      flex-shrink: 0;
      padding: 10px 20px;
      border: none;
      border-radius: 12px;
      background: linear-gradient(135deg, #40b840, #20a060);
      color: #fff;
      font-size: 0.9rem;
      font-weight: 800;
      cursor: pointer;
      transition: transform 0.15s;
    }

    .free-ad-btn:hover:not(:disabled)  { transform: scale(1.06); }
    .free-ad-btn:disabled { opacity: 0.5; cursor: default; }

    /* ── Decorative BG ── */
    .bg-hex {
      position: fixed;
      clip-path: polygon(50% 0%, 93% 25%, 93% 75%, 50% 100%, 7% 75%, 7% 25%);
      opacity: 0.04;
      pointer-events: none;
      z-index: 0;
    }

    .bh1 { width: 320px; height: 320px; background: #ffcc00; top: -80px; right: -80px; }
    .bh2 { width: 200px; height: 200px; background: #4080e8; bottom: 40px; left: -60px; }

    /* ── Animations ── */
    @keyframes shimmer {
      0%, 100% { opacity: 0.4; }
      50%       { opacity: 0.8; }
    }

    @keyframes spin {
      to { transform: rotate(360deg); }
    }
  `]
})
export class ShopComponent implements OnInit {
  profile:    PlayerProfile | null = null;
  toastMsg    = '';
  adWatched   = false;
  buyingItem: 'bomb' | 'hammer' | null = null;

  packages: ShopPackage[] = [
    {
      id: 'starter',
      tag: '50% OFF',
      title: 'STARTER PACK',
      rewards: ['4,000 🪙', '1 💣', '1 🔨', '1 🌀'],
      price: '$1.99',
      style: 'starter'
    },
    {
      id: 'popular',
      tag: 'MOST POPULAR',
      title: 'VALUE BUNDLE',
      rewards: ['4,500 🪙', '3 💣', '3 🔨'],
      price: '$5.49',
      style: 'popular'
    },
    {
      id: 'noads',
      title: 'NO ADS PACK',
      rewards: ['Remove Ads', '500 🪙', '3 💣', '3 🔨'],
      price: '$9.99',
      style: 'noads'
    },
    {
      id: 'noads-only',
      title: 'NO ADS',
      rewards: ['Remove Ads forever'],
      price: '$7.99',
      style: 'noads-only'
    }
  ];

  coinItems: CoinItem[] = [
    { id: 'bomb',   icon: '💣', label: '1 Bomb',   cost: 100, field: 'bombs'   },
    { id: 'hammer', icon: '🔨', label: '1 Hammer', cost: 80,  field: 'hammers' }
  ];

  constructor(
    private router: Router,
    private api:    ApiService,
    private auth:   AuthService
  ) {}

  ngOnInit(): void {
    this.api.get<PlayerProfile>('/api/player/profile').subscribe({
      next:  (p) => { this.profile = p; },
      error: ()  => {}
    });
  }

  onBuyRealMoney(pkg: ShopPackage): void {
    // In a real app this would open a payment sheet.
    // For now, show a placeholder alert.
    this.showToast(`Opening checkout for ${pkg.title}… (demo)`);
  }

  onBuyWithCoins(item: CoinItem): void {
    if (!this.profile || this.profile.coins < item.cost) return;

    this.buyingItem = item.id;
    this.profile.coins   -= item.cost;
    this.profile[item.field] += 1;

    this.api.put<PlayerProfile>('/api/player/profile', {
      coins:   this.profile.coins,
      bombs:   this.profile.bombs,
      hammers: this.profile.hammers
    }).subscribe({
      next: (updated) => {
        this.profile    = updated;
        this.buyingItem = null;
        this.showToast(`${item.label} purchased!`);
      },
      error: () => {
        // Roll back optimistic update
        if (this.profile) {
          this.profile.coins      += item.cost;
          this.profile[item.field] -= 1;
        }
        this.buyingItem = null;
        this.showToast('Purchase failed. Try again.');
      }
    });
  }

  onWatchAd(): void {
    const confirmed = window.confirm('Watch a short ad to earn 300 coins?');
    if (!confirmed || !this.profile) return;

    this.profile.coins += 300;
    this.adWatched      = true;

    this.api.put<PlayerProfile>('/api/player/profile', {
      coins:   this.profile.coins,
      bombs:   this.profile.bombs,
      hammers: this.profile.hammers
    }).subscribe({
      next: (updated) => {
        this.profile = updated;
        this.showToast('+300 coins! Thanks for watching!');
      },
      error: () => {
        if (this.profile) this.profile.coins -= 300;
        this.adWatched = false;
        this.showToast('Could not award coins. Try again.');
      }
    });
  }

  goBack(): void { this.router.navigate(['/menu']); }

  private showToast(msg: string): void {
    this.toastMsg = msg;
    setTimeout(() => { this.toastMsg = ''; }, 2800);
  }
}
