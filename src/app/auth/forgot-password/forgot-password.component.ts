// src/app/auth/forgot-password/forgot-password.component.ts
import { Component, ViewEncapsulation } from '@angular/core';
import { CommonModule }                 from '@angular/common';
import { FormsModule }                  from '@angular/forms';
import { Router }                       from '@angular/router';
import { AuthService }                  from '../../services/auth.service';

@Component({
  selector: 'app-forgot-password',
  standalone: true,
  imports: [CommonModule, FormsModule],
  styleUrls: ['../login/login.component.css'],
  encapsulation: ViewEncapsulation.None,
  template: `
<div class="auth-page">
  <!-- Left panel -->
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
      <div class="auth-visual__eyebrow"><span class="auth-visual__eyebrow-dot"></span>Account Recovery</div>
      <h2 class="auth-visual__headline">Reset Your<br><em>Password</em></h2>
      <p class="auth-visual__sub">Enter your email and we'll send you a secure link to create a new password. It takes less than a minute.</p>
    </div>
  </div>

  <!-- Right panel -->
  <div class="auth-right">
    <div class="auth-form-wrap">

      <!-- Sent state -->
      <div *ngIf="emailSent" class="auth-success">
        <div class="auth-success__icon">
          <svg fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="2.5">
            <path stroke-linecap="round" stroke-linejoin="round" d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"/>
          </svg>
        </div>
        <div class="auth-success__title">Check your inbox</div>
        <p class="auth-success__sub">
          If an account exists for <strong>{{ email }}</strong>, we've sent a reset link. Check spam if you don't see it.
        </p>
        <button class="submit-btn" style="margin-top:24px;width:auto;padding:12px 28px;" (click)="backToLogin()">
          Back to Sign In
        </button>
      </div>

      <!-- Form -->
      <div *ngIf="!emailSent">
        <div class="auth-form__header">
          <h1 class="auth-form__title">Forgot password?</h1>
          <p class="auth-form__sub">We'll email you a link to reset it.</p>
        </div>

        <div *ngIf="globalError" class="auth-alert auth-alert--error">
          <svg fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="2" style="width:16px;height:16px;">
            <path stroke-linecap="round" stroke-linejoin="round" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/>
          </svg>
          {{ globalError }}
        </div>

        <div class="form-field" style="margin-bottom:20px;">
          <label class="form-label">Email address</label>
          <div class="input-wrap">
            <span class="input-wrap__icon">
              <svg fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="2">
                <path stroke-linecap="round" stroke-linejoin="round" d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"/>
              </svg>
            </span>
            <input type="email" class="form-input" placeholder="your@email.com" [(ngModel)]="email" [ngClass]="{ 'form-input--error': emailError }"/>
          </div>
          <span *ngIf="emailError" class="field-error">{{ emailError }}</span>
        </div>

        <button class="submit-btn" [disabled]="isLoading" (click)="onSubmit()">
          <span *ngIf="!isLoading">Send Reset Link
            <svg fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="2.5" style="width:16px;height:16px;">
              <path stroke-linecap="round" stroke-linejoin="round" d="M13 7l5 5m0 0l-5 5m5-5H6"/>
            </svg>
          </span>
          <span *ngIf="isLoading" style="display:flex;align-items:center;gap:8px;">
            <span class="btn-spinner"></span>Sending…
          </span>
        </button>

        <div class="auth-footer" style="margin-top:18px;">
          Remember it? <a (click)="backToLogin()" style="cursor:pointer;">Sign in here</a>
        </div>
      </div>
    </div>
  </div>
</div>`,
})
export class ForgotPasswordComponent {
  email       = '';
  emailError  = '';
  globalError = '';
  isLoading   = false;
  emailSent   = false;

  constructor(private authService: AuthService, private router: Router) {}

  onSubmit(): void {
    this.emailError  = '';
    this.globalError = '';

    if (!this.email.trim()) { this.emailError = 'Email is required'; return; }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(this.email)) { this.emailError = 'Enter a valid email'; return; }

    this.isLoading = true;
    this.authService.forgotPassword(this.email.trim().toLowerCase()).subscribe({
      next:  () => { this.isLoading = false; this.emailSent = true; },
      error: (err) => { this.isLoading = false; this.globalError = err?.friendlyMessage || 'Failed to send reset email.'; },
    });
  }

  backToLogin(): void { this.router.navigate(['/auth/login']); }
}