// src/app/auth/signup/signup.component.ts
import { Component, ViewEncapsulation } from '@angular/core';
import { CommonModule }                 from '@angular/common';
import { FormsModule }                  from '@angular/forms';
import { RouterModule, Router }         from '@angular/router';
import { AuthService }                  from '../../services/auth.service';

@Component({
  selector: 'app-signup',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule],
  templateUrl: './signup.component.html',
  styleUrls: ['../login/login.component.css'],   // shared auth CSS
  encapsulation: ViewEncapsulation.None,
})
export class SignupComponent {

  /* ── Step state ──────────────────────────────────────────────────────── */
  currentStep  = 1;
  selectedRole = '';

  /* ── Form fields ─────────────────────────────────────────────────────── */
  firstName       = '';
  lastName        = '';
  email           = '';
  platform        = '';
  companyName     = '';
  password        = '';
  confirmPassword = '';
  agreedToTerms   = false;

  /* ── UI state ───────────────────────────────────────────────────────── */
  isLoading           = false;
  signupSuccess       = false;
  showPassword        = false;
  showConfirmPassword = false;
  globalError         = '';

  /* ── Field errors ────────────────────────────────────────────────────── */
  firstNameError       = '';
  lastNameError        = '';
  emailError           = '';
  passwordError        = '';
  confirmPasswordError = '';

  /* ── Password strength ────────────────────────────────────────────────── */
  pwdScore = 0;
  pwdLevel = 'weak';
  pwdLabel = 'Weak';

  /* ── Stars helper ─────────────────────────────────────────────────────── */
  readonly stars = [1, 2, 3, 4, 5];

  constructor(
    private authService: AuthService,
    private router: Router,
  ) {}

  /* ── Role selection ──────────────────────────────────────────────────── */
  selectRole(role: string): void {
    this.selectedRole = role;
    this.globalError  = '';
    // Force Angular change detection by reassigning
    this.selectedRole = role;
  }

  /* ── Step navigation ──────────────────────────────────────────────────── */
  nextStep(): void {
    this.globalError = '';
    if (this.currentStep === 1) {
      if (!this.selectedRole || this.selectedRole.trim() === '') {
        this.globalError = 'Please select Creator or Brand to continue.';
        return;
      }
      this.currentStep = 2;
      return;
    }
    if (this.currentStep === 2) {
      if (!this.validateStep2()) return;
      this.currentStep = 3;
      return;
    }
  }

  prevStep(): void {
    if (this.currentStep > 1) {
      this.currentStep--;
      this.globalError = '';
    }
  }

  /* ── Step 2 Validation ────────────────────────────────────────────────── */
  private validateStep2(): boolean {
    this.validateFirstName();
    this.validateLastName();
    this.validateEmail();
    return !this.firstNameError && !this.lastNameError && !this.emailError;
  }

  validateFirstName(): void {
    if (!this.firstName.trim()) {
      this.firstNameError = 'First name is required';
    } else if (this.firstName.trim().length < 2) {
      this.firstNameError = 'First name must be at least 2 characters';
    } else {
      this.firstNameError = '';
    }
  }

  validateLastName(): void {
    this.lastNameError = !this.lastName.trim() ? 'Last name is required' : '';
  }

  validateEmail(): void {
    if (!this.email.trim()) {
      this.emailError = 'Email address is required';
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(this.email)) {
      this.emailError = 'Please enter a valid email address';
    } else {
      this.emailError = '';
    }
  }

  /* ── Password strength ────────────────────────────────────────────────── */
  checkPasswordStrength(): void {
    const p = this.password;
    let score = 0;
    if (p.length >= 8)          score++;
    if (/[A-Z]/.test(p))        score++;
    if (/[0-9]/.test(p))        score++;
    if (/[^A-Za-z0-9]/.test(p)) score++;
    this.pwdScore = score;

    if (score <= 1) {
      this.pwdLevel = 'weak';
      this.pwdLabel = 'Weak — add uppercase, numbers & symbols';
    } else if (score === 2) {
      this.pwdLevel = 'medium';
      this.pwdLabel = 'Medium — getting stronger';
    } else if (score === 3) {
      this.pwdLevel = 'medium';
      this.pwdLabel = 'Good — almost there!';
    } else {
      this.pwdLevel = 'strong';
      this.pwdLabel = 'Strong — great password!';
    }
  }

  private validatePassword(): boolean {
    if (!this.password) {
      this.passwordError = 'Password is required';
      return false;
    }
    if (this.password.length < 8) {
      this.passwordError = 'Password must be at least 8 characters';
      return false;
    }
    if (this.pwdScore < 2) {
      this.passwordError = 'Please choose a stronger password';
      return false;
    }
    this.passwordError = '';
    return true;
  }

  validateConfirmPassword(): void {
    if (!this.confirmPassword) {
      this.confirmPasswordError = 'Please confirm your password';
    } else if (this.confirmPassword !== this.password) {
      this.confirmPasswordError = 'Passwords do not match';
    } else {
      this.confirmPasswordError = '';
    }
  }

  /* ── Signup submit ────────────────────────────────────────────────────── */
  onSignup(): void {
    this.globalError = '';

    if (!this.validatePassword()) return;
    this.validateConfirmPassword();
    if (this.confirmPasswordError) return;

    if (!this.agreedToTerms) {
      this.globalError = 'Please agree to the Terms of Service to continue.';
      return;
    }

    this.isLoading = true;

    this.authService.signup({
      firstName:   this.firstName.trim(),
      lastName:    this.lastName.trim(),
      email:       this.email.trim().toLowerCase(),
      password:    this.password,
      role:        this.selectedRole as 'creator' | 'brand',
      platform:    this.selectedRole === 'creator' ? this.platform    : undefined,
      companyName: this.selectedRole === 'brand'   ? this.companyName.trim() : undefined,
    }).subscribe({
      next: () => {
        this.isLoading     = false;
        this.signupSuccess = true;
        // ── Redirect to login after 2s with a query param to show success message ──
        setTimeout(() => {
          this.router.navigate(['/auth/login'], {
            queryParams: { registered: 'true', email: this.email.trim().toLowerCase() },
            replaceUrl: true,
          });
        }, 2000);
      },
      error: (err) => {
        this.isLoading   = false;
        this.globalError = err?.friendlyMessage
          || err?.error?.message
          || 'Something went wrong. Please try again.';
      },
    });
  }

  /* ── UI helpers ──────────────────────────────────────────────────────── */
  togglePassword():        void { this.showPassword        = !this.showPassword; }
  toggleConfirmPassword(): void { this.showConfirmPassword = !this.showConfirmPassword; }
  goToLogin():             void { this.router.navigate(['/auth/login']); }
}