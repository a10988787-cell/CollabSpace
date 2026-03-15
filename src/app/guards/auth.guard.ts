// src/app/core/guards/auth.guard.ts
import { inject }                from '@angular/core';
import { Router, CanActivateFn } from '@angular/router';
import { AuthService }           from '../services/auth.service';

/**
 * Protects routes that require authentication.
 * If not logged in → redirects to /auth/login
 */
export const authGuard: CanActivateFn = (_route, state) => {
  const auth   = inject(AuthService);
  const router = inject(Router);

  if (auth.isLoggedIn) return true;

  // Not logged in — go to login and remember where they were trying to go
  router.navigate(['/auth/login'], {
    queryParams:  { returnUrl: state.url },
    replaceUrl:   true,
  });
  return false;
};

/**
 * Role guard factory.
 *
 * Rules:
 *   - Admin can access ANY dashboard (bypass role check)
 *   - Creator can only access /dashboard/creator
 *   - Brand can only access /dashboard/brand
 *   - Wrong role → redirected to their correct dashboard
 *
 * Usage in routes:
 *   canActivate: [authGuard, roleGuard('creator')]
 */
export const roleGuard = (requiredRole: 'creator' | 'brand' | 'admin'): CanActivateFn => {
  return () => {
    const auth   = inject(AuthService);
    const router = inject(Router);

    if (!auth.isLoggedIn) {
      router.navigate(['/auth/login']);
      return false;
    }

    const userRole = auth.currentUser?.role;

    // Admin bypasses all role restrictions
    if (userRole === 'admin') return true;

    // User has the exact required role → allow
    if (userRole === requiredRole) return true;

    // Wrong role → send them to THEIR correct dashboard instead
    // e.g. a brand user trying to access /dashboard/creator goes to /dashboard/brand
    const correctPath = auth.getRoleDashboard();
    router.navigateByUrl(correctPath, { replaceUrl: true });
    return false;
  };
};