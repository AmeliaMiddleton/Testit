import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { Subscription } from 'rxjs';
import { AuthService } from '../../core/services/auth.service';

@Component({
  selector: 'app-reset-password',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="auth-wrapper">
      <div class="auth-container">

        <!-- Logo / Title -->
        <div class="logo-area">
          <div class="hex-logo">
            <svg viewBox="0 0 100 100" class="hex-svg">
              <polygon
                points="50,5 93,27.5 93,72.5 50,95 7,72.5 7,27.5"
                fill="#f07830" stroke="#ffcc00" stroke-width="3"/>
              <text x="50" y="58" text-anchor="middle" font-size="28"
                font-weight="bold" fill="#fff" font-family="Arial, sans-serif">H</text>
            </svg>
          </div>
          <h1 class="game-title">Hexa Away</h1>
          <p class="game-subtitle">Reset your password</p>
        </div>

        <!-- Form Card -->
        <div class="form-card">

          <!-- Error banner -->
          <div class="error-banner" *ngIf="errorMsg">
            <span class="error-icon">⚠</span> {{ errorMsg }}
          </div>

          <!-- Success banner -->
          <div class="success-banner" *ngIf="successMsg">
            <span>✓</span> {{ successMsg }}
          </div>

          <!-- Loading state while waiting for token -->
          <div class="loading-state" *ngIf="!isReady && !errorMsg && !successMsg">
            <span class="spinner"></span>
            <p>Verifying reset link…</p>
          </div>

          <!-- Reset form -->
          <form *ngIf="isReady && !successMsg" (ngSubmit)="onSubmit()" novalidate>
            <p class="form-desc">Choose a new password for your account.</p>

            <div class="field-group">
              <label class="field-label" for="newPassword">New Password</label>
              <div class="password-wrap">
                <input
                  id="newPassword"
                  class="field-input"
                  [type]="showPassword ? 'text' : 'password'"
                  name="newPassword"
                  [(ngModel)]="newPassword"
                  placeholder="Min 8 characters"
                  required
                  minlength="8"
                  autocomplete="new-password"/>
                <button type="button" class="toggle-pw" (click)="showPassword = !showPassword">
                  {{ showPassword ? '🙈' : '👁' }}
                </button>
              </div>
            </div>

            <div class="field-group">
              <label class="field-label" for="confirmPassword">Confirm Password</label>
              <input
                id="confirmPassword"
                class="field-input"
                type="password"
                name="confirmPassword"
                [(ngModel)]="confirmPassword"
                placeholder="Repeat password"
                required
                autocomplete="new-password"/>
            </div>

            <button
              type="submit"
              class="submit-btn"
              [disabled]="loading || !newPassword || !confirmPassword">
              <span *ngIf="!loading">Set New Password</span>
              <span *ngIf="loading" class="spinner"></span>
            </button>
          </form>

          <!-- Link back to login -->
          <div class="back-link" *ngIf="errorMsg || successMsg">
            <button type="button" class="link-btn" (click)="goToLogin()">
              ← Back to Login
            </button>
          </div>

        </div><!-- /.form-card -->

      </div><!-- /.auth-container -->
    </div><!-- /.auth-wrapper -->
  `,
  styles: [`
    :host {
      display: block;
      min-height: 100vh;
      background: linear-gradient(160deg, #2a0a4a 0%, #4a1280 50%, #1a0535 100%);
      font-family: 'Segoe UI', Arial, sans-serif;
    }

    .auth-wrapper {
      min-height: 100vh;
      display: flex;
      align-items: center;
      justify-content: center;
      padding: 24px 16px;
    }

    .auth-container {
      width: 100%;
      max-width: 420px;
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 20px;
    }

    .logo-area {
      text-align: center;
      animation: floatIn 0.6s ease-out both;
    }

    .hex-logo {
      width: 80px;
      height: 80px;
      margin: 0 auto 12px;
      filter: drop-shadow(0 4px 16px rgba(240,120,48,0.6));
      animation: pulse 3s ease-in-out infinite;
    }

    .hex-svg { width: 100%; height: 100%; }

    .game-title {
      font-size: 2.4rem;
      font-weight: 900;
      background: linear-gradient(90deg, #ffcc00, #f07830);
      -webkit-background-clip: text;
      -webkit-text-fill-color: transparent;
      background-clip: text;
      margin: 0 0 4px;
      letter-spacing: 1px;
    }

    .game-subtitle {
      color: rgba(255,255,255,0.65);
      font-size: 0.9rem;
      margin: 0;
    }

    .form-card {
      width: 100%;
      background: rgba(255,255,255,0.06);
      backdrop-filter: blur(14px);
      border: 1px solid rgba(255,255,255,0.12);
      border-radius: 20px;
      padding: 28px 24px;
      animation: floatIn 0.6s 0.15s ease-out both;
    }

    .error-banner,
    .success-banner {
      border-radius: 10px;
      padding: 12px 16px;
      margin-bottom: 18px;
      font-size: 0.88rem;
      font-weight: 500;
      display: flex;
      align-items: center;
      gap: 8px;
    }

    .error-banner {
      background: rgba(232,64,64,0.18);
      border: 1px solid rgba(232,64,64,0.4);
      color: #ff8888;
    }

    .success-banner {
      background: rgba(64,184,64,0.18);
      border: 1px solid rgba(64,184,64,0.4);
      color: #88ff88;
    }

    .loading-state {
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 12px;
      padding: 24px 0;
      color: rgba(255,255,255,0.65);
      font-size: 0.9rem;
    }

    .form-desc {
      color: rgba(255,255,255,0.65);
      font-size: 0.88rem;
      line-height: 1.5;
      margin: 0 0 20px;
    }

    .field-group { margin-bottom: 18px; }

    .field-label {
      display: block;
      color: rgba(255,255,255,0.75);
      font-size: 0.82rem;
      font-weight: 600;
      text-transform: uppercase;
      letter-spacing: 0.5px;
      margin-bottom: 7px;
    }

    .field-input {
      width: 100%;
      box-sizing: border-box;
      background: rgba(255,255,255,0.1);
      border: 1.5px solid rgba(255,255,255,0.18);
      border-radius: 12px;
      color: #fff;
      font-size: 1rem;
      padding: 12px 16px;
      outline: none;
      transition: border-color 0.2s, box-shadow 0.2s;
    }

    .field-input::placeholder { color: rgba(255,255,255,0.35); }

    .field-input:focus {
      border-color: #f07830;
      box-shadow: 0 0 0 3px rgba(240,120,48,0.25);
    }

    .password-wrap { position: relative; }

    .password-wrap .field-input { padding-right: 48px; }

    .toggle-pw {
      position: absolute;
      right: 12px;
      top: 50%;
      transform: translateY(-50%);
      background: none;
      border: none;
      cursor: pointer;
      font-size: 1.1rem;
      padding: 4px;
      line-height: 1;
    }

    .submit-btn {
      width: 100%;
      padding: 14px;
      margin-top: 8px;
      border: none;
      border-radius: 14px;
      background: linear-gradient(135deg, #f07830 0%, #e84040 100%);
      color: #fff;
      font-size: 1.05rem;
      font-weight: 800;
      letter-spacing: 0.5px;
      cursor: pointer;
      box-shadow: 0 6px 20px rgba(240,120,48,0.45);
      transition: transform 0.15s, box-shadow 0.15s, opacity 0.2s;
    }

    .submit-btn:hover:not(:disabled) {
      transform: translateY(-2px);
      box-shadow: 0 10px 28px rgba(240,120,48,0.55);
    }

    .submit-btn:active:not(:disabled) {
      transform: translateY(1px);
      box-shadow: 0 3px 10px rgba(240,120,48,0.3);
    }

    .submit-btn:disabled {
      opacity: 0.5;
      cursor: not-allowed;
    }

    .spinner {
      display: inline-block;
      width: 18px;
      height: 18px;
      border: 3px solid rgba(255,255,255,0.35);
      border-top-color: #fff;
      border-radius: 50%;
      animation: spin 0.7s linear infinite;
      vertical-align: middle;
    }

    .back-link {
      text-align: center;
      margin-top: 16px;
    }

    .link-btn {
      background: none;
      border: none;
      color: rgba(255,255,255,0.55);
      font-size: 0.85rem;
      cursor: pointer;
      padding: 0;
      text-decoration: underline;
      transition: color 0.2s;
    }

    .link-btn:hover { color: #ffcc00; }

    @keyframes floatIn {
      from { opacity: 0; transform: translateY(20px); }
      to   { opacity: 1; transform: translateY(0); }
    }

    @keyframes pulse {
      0%, 100% { transform: scale(1);    filter: drop-shadow(0 4px 16px rgba(240,120,48,0.6)); }
      50%       { transform: scale(1.07); filter: drop-shadow(0 4px 24px rgba(240,120,48,0.9)); }
    }

    @keyframes spin {
      to { transform: rotate(360deg); }
    }
  `]
})
export class ResetPasswordComponent implements OnInit, OnDestroy {
  newPassword    = '';
  confirmPassword = '';
  showPassword   = false;
  loading        = false;
  errorMsg       = '';
  successMsg     = '';
  isReady        = false;

  private recoverySub?: Subscription;
  private timeoutId?: ReturnType<typeof setTimeout>;

  constructor(
    private auth:   AuthService,
    private router: Router
  ) {}

  ngOnInit(): void {
    this.recoverySub = this.auth.recoverySession$.subscribe(isRecovery => {
      if (isRecovery) {
        this.isReady = true;
      }
    });

    // If no PASSWORD_RECOVERY event fires within 3 seconds, the link is invalid/expired
    this.timeoutId = setTimeout(() => {
      if (!this.isReady) {
        this.errorMsg = 'This reset link is invalid or has expired. Please request a new one.';
      }
    }, 3000);
  }

  ngOnDestroy(): void {
    this.recoverySub?.unsubscribe();
    if (this.timeoutId) clearTimeout(this.timeoutId);
  }

  async onSubmit(): Promise<void> {
    if (this.newPassword !== this.confirmPassword) {
      this.errorMsg = 'Passwords do not match.';
      return;
    }
    if (this.newPassword.length < 8) {
      this.errorMsg = 'Password must be at least 8 characters.';
      return;
    }

    this.loading  = true;
    this.errorMsg = '';

    try {
      const { error } = await this.auth.updatePassword(this.newPassword);
      if (error) {
        this.errorMsg = error.message;
        return;
      }
      this.successMsg = 'Password updated successfully! Redirecting to login…';
      await this.auth.signOut();
      setTimeout(() => this.router.navigate(['/login']), 2000);
    } catch (err: any) {
      this.errorMsg = err?.message ?? 'Failed to update password. Please try again.';
    } finally {
      this.loading = false;
    }
  }

  goToLogin(): void {
    this.router.navigate(['/login']);
  }
}
