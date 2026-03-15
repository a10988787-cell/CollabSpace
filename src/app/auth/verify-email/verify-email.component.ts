// src/app/auth/verify-email/verify-email.component.ts
import { Component, OnInit, ViewEncapsulation } from '@angular/core';
import { CommonModule }                         from '@angular/common';
import { Router, ActivatedRoute }               from '@angular/router';
import { AuthService }                          from '../../services/auth.service';

@Component({
  selector: 'app-verify-email',
  standalone: true,
  imports: [CommonModule],
  styleUrls: ['../login/login.component.css'],
  encapsulation: ViewEncapsulation.None,
  template: `
<div class="auth-page" style="align-items:center;justify-content:center;">
  <div style="text-align:center;padding:40px;max-width:420px;">
    <!-- Verifying -->
    <div *ngIf="status === 'loading'">
      <div style="width:56px;height:56px;border-radius:50%;background:rgba(139,92,246,0.1);
        border:1px solid rgba(139,92,246,0.25);display:flex;align-items:center;justify-content:center;margin:0 auto 20px;">
        <span class="btn-spinner" style="width:24px;height:24px;border-width:3px;border-color:rgba(139,92,246,0.3);border-top-color:#8B5CF6;"></span>
      </div>
      <div style="font-family:var(--font-display);font-size:1.4rem;font-weight:800;color:var(--text-primary);">Verifying…</div>
      <p style="color:var(--text-muted);margin-top:8px;font-size:0.85rem;">Confirming your email address</p>
    </div>

    <!-- Success -->
    <div *ngIf="status === 'success'" class="auth-success">
      <div class="auth-success__icon">
        <svg fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="2.5">
          <path stroke-linecap="round" stroke-linejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"/>
        </svg>
      </div>
      <div class="auth-success__title">Email Verified!</div>
      <p class="auth-success__sub">Your email has been confirmed. Redirecting to your dashboard…</p>
    </div>

    <!-- Error -->
    <div *ngIf="status === 'error'">
      <div class="auth-success__icon" style="background:rgba(251,113,133,0.1);border-color:rgba(251,113,133,0.3);">
        <svg fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="2.5" style="color:#FB7185;">
          <path stroke-linecap="round" stroke-linejoin="round" d="M6 18L18 6M6 6l12 12"/>
        </svg>
      </div>
      <div class="auth-success__title" style="color:#FB7185;">Verification Failed</div>
      <p class="auth-success__sub">This link is invalid or has expired. Please sign up again or request a new link.</p>
      <button class="submit-btn" style="margin-top:20px;width:auto;padding:10px 24px;" (click)="goToLogin()">
        Back to Sign In
      </button>
    </div>
  </div>
</div>`,
})
export class VerifyEmailComponent implements OnInit {
  status: 'loading' | 'success' | 'error' = 'loading';

  constructor(
    private authService: AuthService,
    private router: Router,
    private route: ActivatedRoute,
  ) {}

  ngOnInit(): void {
    const token = this.route.snapshot.params['token'];
    if (!token) { this.status = 'error'; return; }

    this.authService.verifyEmail(token).subscribe({
      next:  () => { this.status = 'success'; setTimeout(() => this.router.navigate(['/dashboard']), 1800); },
      error: () => { this.status = 'error'; },
    });
  }

  goToLogin(): void { this.router.navigate(['/auth/login']); }
}