// src/app/auth/login/login.component.ts
import { Component, OnInit, ViewEncapsulation } from '@angular/core';
import { CommonModule }                         from '@angular/common';
import { FormsModule }                          from '@angular/forms';
import { RouterModule, Router, ActivatedRoute } from '@angular/router';
import { AuthService }                          from '../../services/auth.service';
import { environment }                          from '../../environment';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule],
  templateUrl: './login.component.html',
  styleUrls: ['./login.component.css'],
  encapsulation: ViewEncapsulation.None,
})
export class LoginComponent implements OnInit {

  /* ── Form fields ─────────────────────────────────────────────────────── */
  email         = '';
  password      = '';
  rememberMe    = false;
  showPassword  = false;

  /* ── UI state ────────────────────────────────────────────────────────── */
  isLoading     = false;
  loginSuccess  = false;
  globalError   = '';
  emailError    = '';
  passwordError = '';

  /* ── Post-signup banner ──────────────────────────────────────────────── */
  justRegistered      = false;
  registeredEmail     = '';

  readonly stars = [1, 2, 3, 4, 5];

  constructor(
    private authService: AuthService,
    private router: Router,
    private route: ActivatedRoute,
  ) {}

  ngOnInit(): void {
    // ── If already logged in → go straight to their role's dashboard ──────
    if (this.authService.isLoggedIn) {
      this.router.navigateByUrl(
        this.authService.getRoleDashboard(),
        { replaceUrl: true }
      );
      return;
    }

    // ── Read query params ────────────────────────────────────────────────
    this.route.queryParams.subscribe(params => {
      // Post-signup banner
      if (params['registered'] === 'true') {
        this.justRegistered  = true;
        this.registeredEmail = params['email'] || '';
        if (this.registeredEmail) this.email = this.registeredEmail;
      }

      // Instagram OAuth error
      if (params['error']) {
        const errorMap: Record<string, string> = {
          instagram_not_configured: '⚙️ Instagram login is not set up yet. Add INSTAGRAM_APP_ID and INSTAGRAM_APP_SECRET to your .env file.',
          instagram_denied:         'Instagram authorisation was cancelled. Please try again.',
          instagram_token_failed:   'Could not get an Instagram access token. Please try again.',
          instagram_profile_failed: 'Could not fetch your Instagram profile. Make sure you added yourself as a test user in Meta Developer Console.',
          instagram_server_error:   'A server error occurred with Instagram login. Please try again.',
        };
        this.globalError = errorMap[params['error']] || 'Instagram login failed. Please try again.';
      }
    });
  }

  /* ── Validation ──────────────────────────────────────────────────────── */
  validateEmail(): void {
    if (!this.email.trim()) {
      this.emailError = 'Email address is required';
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(this.email)) {
      this.emailError = 'Please enter a valid email address';
    } else {
      this.emailError = '';
    }
  }

  validatePassword(): void {
    if (!this.password) {
      this.passwordError = 'Password is required';
    } else if (this.password.length < 6) {
      this.passwordError = 'Password must be at least 6 characters';
    } else {
      this.passwordError = '';
    }
  }

  private isFormValid(): boolean {
    this.validateEmail();
    this.validatePassword();
    return !this.emailError && !this.passwordError;
  }

  /* ── Login submit ─────────────────────────────────────────────────────── */
  onLogin(): void {
    this.globalError = '';
    if (!this.isFormValid()) return;

    this.isLoading = true;

    this.authService.login({
      email:      this.email.trim().toLowerCase(),
      password:   this.password,
      rememberMe: this.rememberMe,
    }).subscribe({
      next: (res) => {
        this.isLoading   = false;
        this.loginSuccess = true;

        // ── Role-based redirect ──────────────────────────────────────────
        // The login response contains user.role from the backend.
        // getRoleDashboard() reads that role and returns the correct path:
        //   creator → /dashboard/creator
        //   brand   → /dashboard/brand
        //   admin   → /dashboard/admin
        const role        = res.user?.role || this.authService.currentUser?.role;
        let   destination = '/dashboard/creator'; // safe fallback

        if (role === 'brand')   destination = '/dashboard/brand';
        if (role === 'admin')   destination = '/dashboard/admin';
        if (role === 'creator') destination = '/dashboard/creator';

        setTimeout(() => {
          this.router.navigateByUrl(destination, { replaceUrl: true });
        }, 1400);
      },
      error: (err) => {
        this.isLoading   = false;
        this.globalError = err?.friendlyMessage
          || err?.error?.message
          || 'Invalid email or password. Please try again.';
      },
    });
  }

  /* ── UI helpers ──────────────────────────────────────────────────────── */
  togglePassword():   void { this.showPassword = !this.showPassword; }
  goToSignup():       void { this.router.navigate(['/auth/signup']); }
  onForgotPassword(): void { this.router.navigate(['/auth/forgot-password']); }
  dismissBanner():    void { this.justRegistered = false; }
  loginWithInstagram(): void { window.location.href = `${environment.apiUrl}/auth/instagram?role=creator`; }
  loginWithInstagramBrand(): void { window.location.href = `${environment.apiUrl}/auth/instagram?role=brand`; }
}