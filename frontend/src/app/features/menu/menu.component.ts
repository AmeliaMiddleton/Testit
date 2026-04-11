import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterModule } from '@angular/router';
import { AuthService } from '../../core/services/auth.service';
import { ApiService } from '../../core/services/api.service';
import { PlayerProfile } from '../../shared/models';

@Component({
  selector: 'app-menu',
  standalone: true,
  imports: [CommonModule, RouterModule],
  template: `
    <div class="menu-wrapper">

      <!-- Top Bar -->
      <header class="top-bar">
        <button class="sign-out-btn" (click)="onSignOut()" title="Sign out">
          <span class="so-icon">←</span>
          <span class="so-label">Exit</span>
        </button>

        <div class="top-resources" *ngIf="profile">
          <div class="resource-chip coin-chip">
            <span class="res-icon">🪙</span>
            <span class="res-val">{{ profile.coins | number }}</span>
          </div>
          <div class="resource-chip heart-chip">
            <span class="res-icon">❤️</span>
            <span class="res-val">5</span>
          </div>
        </div>

        <div class="top-resources" *ngIf="!profile && !profileError">
          <div class="resource-chip skeleton-chip"></div>
          <div class="resource-chip skeleton-chip"></div>
        </div>
      </header>

      <!-- Hero Section -->
      <section class="hero">
        <div class="hex-logo-wrap" aria-hidden="true">
          <div class="hex-shape outer"></div>
          <div class="hex-shape inner"></div>
          <span class="hex-letter">H</span>
        </div>
        <h1 class="title-main">Hexa<span class="title-accent">Away</span></h1>
        <p class="title-tagline" *ngIf="profile">Welcome back, <strong>{{ profile.username }}</strong>!</p>
        <p class="title-tagline" *ngIf="!profile && !profileError">Loading…</p>
      </section>

      <!-- Main Buttons -->
      <nav class="main-nav">
        <button class="nav-btn play-btn" (click)="go('/levels')">
          <span class="btn-icon">▶</span>
          <span class="btn-label">PLAY</span>
          <span class="btn-shine"></span>
        </button>

        <div class="secondary-btns">
          <button class="nav-btn shop-btn" (click)="go('/shop')">
            <span class="btn-icon">🛒</span>
            <span class="btn-label">SHOP</span>
            <span class="btn-shine"></span>
          </button>
          <button class="nav-btn league-btn" (click)="go('/league')">
            <span class="btn-icon">🏆</span>
            <span class="btn-label">LEAGUE</span>
            <span class="btn-shine"></span>
          </button>
        </div>
      </nav>

      <!-- Error notice -->
      <p class="profile-error" *ngIf="profileError">Could not load profile. Check connection.</p>

      <!-- Background decorative hexagons -->
      <div class="bg-hex hex-bg-1" aria-hidden="true"></div>
      <div class="bg-hex hex-bg-2" aria-hidden="true"></div>
      <div class="bg-hex hex-bg-3" aria-hidden="true"></div>
    </div>
  `,
  styles: [`
    :host {
      display: block;
      min-height: 100vh;
      background: linear-gradient(160deg, #2a0a4a 0%, #4a1280 50%, #1a0535 100%);
      font-family: 'Segoe UI', Arial, sans-serif;
      overflow: hidden;
    }

    .menu-wrapper {
      min-height: 100vh;
      display: flex;
      flex-direction: column;
      align-items: center;
      position: relative;
    }

    /* ── Top bar ── */
    .top-bar {
      width: 100%;
      max-width: 480px;
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 14px 16px;
      box-sizing: border-box;
      position: relative;
      z-index: 10;
    }

    .sign-out-btn {
      display: flex;
      align-items: center;
      gap: 5px;
      background: rgba(255,255,255,0.1);
      border: 1px solid rgba(255,255,255,0.2);
      border-radius: 50px;
      color: rgba(255,255,255,0.75);
      font-size: 0.82rem;
      font-weight: 600;
      padding: 7px 14px;
      cursor: pointer;
      transition: background 0.2s, color 0.2s;
    }

    .sign-out-btn:hover {
      background: rgba(232,64,64,0.25);
      color: #ff8888;
      border-color: rgba(232,64,64,0.4);
    }

    .so-icon { font-size: 1rem; font-weight: 700; }

    .top-resources {
      display: flex;
      gap: 10px;
    }

    .resource-chip {
      display: flex;
      align-items: center;
      gap: 6px;
      background: rgba(255,255,255,0.1);
      border: 1px solid rgba(255,255,255,0.18);
      border-radius: 50px;
      padding: 6px 14px;
      font-size: 0.88rem;
      font-weight: 700;
      color: #fff;
    }

    .coin-chip { border-color: rgba(255,204,0,0.4); background: rgba(255,204,0,0.12); }
    .heart-chip { border-color: rgba(232,64,64,0.4); background: rgba(232,64,64,0.12); }

    .skeleton-chip {
      width: 80px;
      height: 34px;
      border-radius: 50px;
      background: rgba(255,255,255,0.08);
      animation: shimmer 1.2s ease-in-out infinite;
    }

    /* ── Hero ── */
    .hero {
      display: flex;
      flex-direction: column;
      align-items: center;
      margin-top: 24px;
      margin-bottom: 36px;
      gap: 10px;
      animation: floatIn 0.7s ease-out both;
      position: relative;
      z-index: 5;
    }

    /* CSS Hex shape */
    .hex-logo-wrap {
      width: 100px;
      height: 100px;
      position: relative;
      display: flex;
      align-items: center;
      justify-content: center;
      margin-bottom: 4px;
    }

    .hex-shape {
      position: absolute;
      clip-path: polygon(50% 0%, 93% 25%, 93% 75%, 50% 100%, 7% 75%, 7% 25%);
    }

    .hex-shape.outer {
      width: 100px;
      height: 100px;
      background: linear-gradient(160deg, #f07830, #e84040);
      animation: rotateSlow 8s linear infinite;
      filter: drop-shadow(0 0 18px rgba(240,120,48,0.8));
    }

    .hex-shape.inner {
      width: 72px;
      height: 72px;
      background: linear-gradient(160deg, #ffcc00, #f07830);
      animation: rotateSlow 8s linear infinite reverse;
    }

    .hex-letter {
      position: relative;
      z-index: 2;
      font-size: 2.2rem;
      font-weight: 900;
      color: #fff;
      text-shadow: 0 2px 8px rgba(0,0,0,0.4);
    }

    .title-main {
      font-size: 3rem;
      font-weight: 900;
      color: #fff;
      margin: 0;
      text-shadow: 0 3px 12px rgba(0,0,0,0.4);
      letter-spacing: 1px;
    }

    .title-accent {
      background: linear-gradient(90deg, #ffcc00, #f07830);
      -webkit-background-clip: text;
      -webkit-text-fill-color: transparent;
      background-clip: text;
    }

    .title-tagline {
      color: rgba(255,255,255,0.6);
      font-size: 0.95rem;
      margin: 0;
    }

    .title-tagline strong { color: rgba(255,255,255,0.9); }

    /* ── Nav buttons ── */
    .main-nav {
      width: 100%;
      max-width: 360px;
      display: flex;
      flex-direction: column;
      gap: 16px;
      padding: 0 20px;
      box-sizing: border-box;
      position: relative;
      z-index: 5;
    }

    .nav-btn {
      position: relative;
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 10px;
      border: none;
      border-radius: 18px;
      cursor: pointer;
      font-weight: 900;
      letter-spacing: 1.5px;
      overflow: hidden;
      transition: transform 0.15s, box-shadow 0.15s;
    }

    .nav-btn:hover  { transform: translateY(-3px); }
    .nav-btn:active { transform: translateY(1px) scale(0.98); }

    .play-btn {
      width: 100%;
      padding: 20px;
      font-size: 1.5rem;
      background: linear-gradient(135deg, #f07830, #e84040);
      color: #fff;
      box-shadow: 0 8px 28px rgba(240,120,48,0.55);
    }

    .secondary-btns {
      display: flex;
      gap: 14px;
    }

    .shop-btn,
    .league-btn {
      flex: 1;
      padding: 16px 10px;
      font-size: 1rem;
      color: #fff;
    }

    .shop-btn {
      background: linear-gradient(135deg, #40b840, #20a060);
      box-shadow: 0 6px 20px rgba(64,184,64,0.4);
    }

    .league-btn {
      background: linear-gradient(135deg, #4080e8, #a040e8);
      box-shadow: 0 6px 20px rgba(160,64,232,0.4);
    }

    .btn-icon { font-size: 1.3em; }
    .btn-label { position: relative; z-index: 1; }

    /* Shine sweep */
    .btn-shine {
      position: absolute;
      top: 0; left: -100%;
      width: 60%;
      height: 100%;
      background: linear-gradient(90deg, transparent, rgba(255,255,255,0.18), transparent);
      animation: shine 3s ease-in-out infinite;
      pointer-events: none;
    }

    .play-btn   .btn-shine { animation-delay: 0s;    }
    .shop-btn   .btn-shine { animation-delay: 0.5s;  }
    .league-btn .btn-shine { animation-delay: 1s;    }

    /* ── Error ── */
    .profile-error {
      color: #ff8888;
      font-size: 0.82rem;
      text-align: center;
      margin-top: 8px;
    }

    /* ── Background decorative hexagons ── */
    .bg-hex {
      position: fixed;
      clip-path: polygon(50% 0%, 93% 25%, 93% 75%, 50% 100%, 7% 75%, 7% 25%);
      opacity: 0.06;
      pointer-events: none;
      z-index: 0;
    }

    .hex-bg-1 {
      width: 300px; height: 300px;
      background: #f07830;
      top: -80px; right: -80px;
      animation: driftHex1 18s ease-in-out infinite;
    }

    .hex-bg-2 {
      width: 200px; height: 200px;
      background: #4080e8;
      bottom: 60px; left: -60px;
      animation: driftHex2 14s ease-in-out infinite;
    }

    .hex-bg-3 {
      width: 140px; height: 140px;
      background: #ffcc00;
      bottom: 200px; right: 20px;
      animation: driftHex1 20s 3s ease-in-out infinite;
    }

    /* ── Animations ── */
    @keyframes floatIn {
      from { opacity: 0; transform: translateY(30px); }
      to   { opacity: 1; transform: translateY(0); }
    }

    @keyframes shimmer {
      0%, 100% { opacity: 0.5; }
      50%       { opacity: 1;   }
    }

    @keyframes shine {
      0%   { left: -100%; }
      40%  { left:  120%; }
      100% { left:  120%; }
    }

    @keyframes rotateSlow {
      from { transform: rotate(0deg); }
      to   { transform: rotate(360deg); }
    }

    @keyframes driftHex1 {
      0%, 100% { transform: translate(0,0) rotate(0deg); }
      50%       { transform: translate(20px, 30px) rotate(30deg); }
    }

    @keyframes driftHex2 {
      0%, 100% { transform: translate(0,0) rotate(0deg); }
      50%       { transform: translate(-15px, -20px) rotate(-20deg); }
    }

    /* ── Responsive ── */
    @media (max-width: 380px) {
      .title-main { font-size: 2.4rem; }
      .play-btn   { font-size: 1.2rem; padding: 16px; }
    }
  `]
})
export class MenuComponent implements OnInit {
  profile: PlayerProfile | null = null;
  profileError = false;

  constructor(
    private router: Router,
    private auth:   AuthService,
    private api:    ApiService
  ) {}

  ngOnInit(): void {
    this.loadProfile();
  }

  private loadProfile(): void {
    this.api.get<PlayerProfile>('/api/player/profile').subscribe({
      next:  (p) => { this.profile = p; },
      error: ()  => { this.profileError = true; }
    });
  }

  go(path: string): void {
    this.router.navigate([path]);
  }

  onSignOut(): void {
    this.auth.signOut();
    this.router.navigate(['/login']);
  }
}
