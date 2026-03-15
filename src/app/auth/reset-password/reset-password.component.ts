// src/app/auth/reset-password/reset-password.component.ts
import { Component, OnInit, ViewEncapsulation } from '@angular/core';
import { CommonModule }                         from '@angular/common';
import { FormsModule }                          from '@angular/forms';
import { Router, ActivatedRoute }               from '@angular/router';
import { AuthService }                          from '../../services/auth.service';

@Component({
  selector: 'app-reset-password',
  standalone: true,
  imports: [CommonModule, FormsModule],
  styleUrls: ['../login/login.component.css'],
  encapsulation: ViewEncapsulation.None,
  template: `
<div class="auth-page">
  <div class="auth-left">
    <div class="orb orb--1"></div>
    <div class="orb orb--2"></div>
    <div class="auth-brand">
      <div class="auth-brand__logo">
        <svg fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="2.5">
          <path stroke-linecap="round" stroke-linejoin="round" d="M13 10V3L4 14h7v7l9-11h-7z"/>
        </svg>
      </div>
      <span class="auth-brand__name">Collab<span>Space</span></span>
    </div>
    <div class="auth-visual">
      <div class="auth-visual__eyebrow"><span class="auth-visual__eyebrow-dot"></span>Account Security</div>
      <h2 class="auth-visual__headline">Create a <em>New Password</em></h2>
      <p class="auth-visual__sub">Choose a strong password to secure your CollabSpace account. You'll be signed in automatically after resetting.</p>
    </div>
  </div>

  <div class="auth-right">
    <div class="auth-form-wrap">

      <!-- Success -->
      <div *ngIf="resetSuccess" class="auth-success">
        <div class="auth-success__icon">
          <svg fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="2.5">
            <path stroke-linecap="round" stroke-linejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"/>
          </svg>
        </div>
        <div class="auth-success__title">Password Reset!</div>
        <p class="auth-success__sub">Your password has been changed. Redirecting to your dashboard…</p>
      </div>

      <!-- Invalid token -->
      <div *ngIf="tokenInvalid && !resetSuccess" class="auth-form-wrap">
        <div class="auth-alert auth-alert--error" style="margin-bottom:20px;">
          <svg fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="2" style="width:16px;height:16px;"><path stroke-linecap="round" stroke-linejoin="round" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/></svg>
          This reset link is invalid or has expired. Please request a new one.
        </div>
        <button class="submit-btn" (click)="goToForgot()">Request New Link</button>
      </div>

      <!-- Form -->
      <div *ngIf="!resetSuccess && !tokenInvalid">
        <div class="auth-form__header">
          <h1 class="auth-form__title">New password</h1>
          <p class="auth-form__sub">Must be at least 8 characters with uppercase and a number.</p>
        </div>

        <div *ngIf="globalError" class="auth-alert auth-alert--error">
          <svg fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="2" style="width:16px;height:16px;"><path stroke-linecap="round" stroke-linejoin="round" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/></svg>
          {{ globalError }}
        </div>

        <div class="field-group">
          <div class="form-field">
            <label class="form-label">New Password</label>
            <div class="input-wrap">
              <span class="input-wrap__icon">
                <svg fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"/></svg>
              </span>
              <input [type]="showPwd ? 'text' : 'password'" class="form-input" [ngClass]="{ 'form-input--error': pwdError }"
                placeholder="New password" [(ngModel)]="password" (input)="checkStrength()"/>
              <button type="button" class="pwd-toggle" (click)="showPwd = !showPwd">
                <svg fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"/><path stroke-linecap="round" stroke-linejoin="round" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"/></svg>
              </button>
            </div>
            <div *ngIf="password" class="pwd-strength">
              <div class="pwd-strength__bars">
                <div class="pwd-bar" [ngClass]="score >= 1 ? 'pwd-bar--' + level : ''"></div>
                <div class="pwd-bar" [ngClass]="score >= 2 ? 'pwd-bar--' + level : ''"></div>
                <div class="pwd-bar" [ngClass]="score >= 3 ? 'pwd-bar--' + level : ''"></div>
                <div class="pwd-bar" [ngClass]="score >= 4 ? 'pwd-bar--' + level : ''"></div>
              </div>
              <span class="pwd-strength__label" [ngClass]="'pwd-strength__label--' + level">{{ label }}</span>
            </div>
            <span *ngIf="pwdError" class="field-error">{{ pwdError }}</span>
          </div>

          <div class="form-field">
            <label class="form-label">Confirm Password</label>
            <div class="input-wrap">
              <span class="input-wrap__icon">
                <svg fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z"/></svg>
              </span>
              <input [type]="showConfirm ? 'text' : 'password'" class="form-input"
                [ngClass]="{ 'form-input--error': confirmError, 'form-input--success': confirm && !confirmError && confirm === password }"
                placeholder="Confirm new password" [(ngModel)]="confirm" (blur)="checkConfirm()"/>
              <button type="button" class="pwd-toggle" (click)="showConfirm = !showConfirm">
                <svg fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"/><path stroke-linecap="round" stroke-linejoin="round" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"/></svg>
              </button>
            </div>
            <span *ngIf="confirmError" class="field-error">{{ confirmError }}</span>
          </div>
        </div>

        <button class="submit-btn" style="margin-top:22px;" [disabled]="isLoading" (click)="onSubmit()">
          <span *ngIf="!isLoading">Reset Password
            <svg fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="2.5" style="width:16px;height:16px;"><path stroke-linecap="round" stroke-linejoin="round" d="M13 7l5 5m0 0l-5 5m5-5H6"/></svg>
          </span>
          <span *ngIf="isLoading" style="display:flex;align-items:center;gap:8px;"><span class="btn-spinner"></span>Resetting…</span>
        </button>
      </div>
    </div>
  </div>
</div>`,
})
export class ResetPasswordComponent implements OnInit {
  password     = ''; confirm   = '';
  pwdError     = ''; confirmError = ''; globalError = '';
  showPwd      = false; showConfirm = false;
  isLoading    = false; resetSuccess = false; tokenInvalid = false;
  score = 0; level = 'weak'; label = 'Weak';
  private token = '';

  constructor(private authService: AuthService, private router: Router, private route: ActivatedRoute) {}

  ngOnInit(): void {
    this.token = this.route.snapshot.params['token'] || '';
    if (!this.token) this.tokenInvalid = true;
  }

  checkStrength(): void {
    const p = this.password; let s = 0;
    if (p.length >= 8) s++; if (/[A-Z]/.test(p)) s++; if (/[0-9]/.test(p)) s++; if (/[^A-Za-z0-9]/.test(p)) s++;
    this.score = s;
    if (s <= 1) { this.level = 'weak'; this.label = 'Weak'; }
    else if (s <= 3) { this.level = 'medium'; this.label = s === 2 ? 'Medium' : 'Good'; }
    else { this.level = 'strong'; this.label = 'Strong'; }
  }

  checkConfirm(): void {
    this.confirmError = !this.confirm ? 'Please confirm your password' : this.confirm !== this.password ? 'Passwords do not match' : '';
  }

  onSubmit(): void {
    this.pwdError = this.globalError = '';
    if (!this.password || this.password.length < 8) { this.pwdError = 'Password must be at least 8 characters'; return; }
    if (this.score < 2) { this.pwdError = 'Please choose a stronger password'; return; }
    this.checkConfirm(); if (this.confirmError) return;

    this.isLoading = true;
    this.authService.resetPassword(this.token, this.password).subscribe({
      next: () => { this.isLoading = false; this.resetSuccess = true; setTimeout(() => this.router.navigate(['/dashboard']), 1800); },
      error: (err) => {
        this.isLoading = false;
        if (err.status === 400) this.tokenInvalid = true;
        else this.globalError = err?.friendlyMessage || 'Failed to reset password.';
      },
    });
  }

  goToForgot(): void { this.router.navigate(['/auth/forgot-password']); }
}