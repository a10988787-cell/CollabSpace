// src/app/app.routes.ts
import { Routes } from '@angular/router';
import { authGuard, roleGuard } from './guards/auth.guard';

export const routes: Routes = [

  /* ── Default ──────────────────────────────────────────────────────────── */
  { path: '', redirectTo: '/auth/login', pathMatch: 'full' },

  /* ══════════════════════════════════════════════════════════════════════
     AUTH
     ══════════════════════════════════════════════════════════════════════ */
  {
    path: 'auth',
    children: [
      {
        path: 'login',
        loadComponent: () =>
          import('./auth/login/login.component').then(m => m.LoginComponent),
        title: 'Sign In — CollabSpace',
      },
      {
        path: 'signup',
        loadComponent: () =>
          import('./auth/signup/signup.component').then(m => m.SignupComponent),
        title: 'Create Account — CollabSpace',
      },
      {
        path: 'forgot-password',
        loadComponent: () =>
          import('./auth/forgot-password/forgot-password.component')
            .then(m => m.ForgotPasswordComponent),
        title: 'Reset Password — CollabSpace',
      },
      {
        path: 'reset-password/:token',
        loadComponent: () =>
          import('./auth/reset-password/reset-password.component')
            .then(m => m.ResetPasswordComponent),
        title: 'New Password — CollabSpace',
      },
      {
        path: 'verify-email/:token',
        loadComponent: () =>
          import('./auth/verify-email/verify-email.component')
            .then(m => m.VerifyEmailComponent),
        title: 'Verify Email — CollabSpace',
      },
      { path: '', redirectTo: 'login', pathMatch: 'full' },
    ],
  },

  /* ══════════════════════════════════════════════════════════════════════
     CREATOR DASHBOARD
     ══════════════════════════════════════════════════════════════════════ */
  {
    path: 'dashboard/creator',
    canActivate: [authGuard, roleGuard('creator')],
    loadComponent: () =>
      import('./Creator/creator-dashboard/creator-dashboard.component')
        .then(m => m.CreatorDashboardComponent),
    title: 'Creator Dashboard — CollabSpace',
  },

  /* ══════════════════════════════════════════════════════════════════════
     ADMIN DASHBOARD
     ══════════════════════════════════════════════════════════════════════ */
  {
    path: 'dashboard/admin',
    canActivate: [authGuard, roleGuard('admin')],
    loadComponent: () =>
      import('./Admin/admin-dashboard/admin-dashboard.component')
        .then(m => m.AdminDashboardComponent),
    title: 'Admin Panel — CollabSpace',
  },

  /* ══════════════════════════════════════════════════════════════════════
     BRAND DASHBOARD — shell + all child pages
     
     Project structure (from your VSCode):
       src/app/brand/brand-dashboard/brand-dashboard.component.ts  ← shell
       src/app/brand/brand-profile/brand-profile.component.ts
       src/app/brand/brand-campaigns/brand-campaigns.component.ts
       src/app/brand/brand-collaborations/brand-collaborations.component.ts
       src/app/brand/brand-explore-creators/brand-explore-creators.component.ts
       src/app/brand/brand-budget/brand-budget.component.ts
       src/app/brand/brand-payments/brand-payments.component.ts
       src/app/brand/brand-contracts/brand-contracts.component.ts
       src/app/brand/brand-analytics/brand-analytics.component.ts
       src/app/brand/brand-assets/brand-assets.component.ts
       src/app/brand/brand-team/brand-team.component.ts
     ══════════════════════════════════════════════════════════════════════ */
  {
    path: 'dashboard/brand',
    canActivate: [authGuard, roleGuard('brand')],
    loadComponent: () =>
      import('./Brand/brand-dashboard/brand-dashboard.component')
        .then(m => m.BrandDashboardComponent),
    title: 'Brand Dashboard — CollabSpace',
    children: [

      /* Default — overview, shell shows its own content */
      { path: '', pathMatch: 'full', children: [] },

      /* ── Brand Profile ───────────────────────────────────────────── */
      {
        path: 'profile',
        loadComponent: () =>
          import('./Brand/brand-profile/brand-profile.component')
            .then(m => m.BrandProfileComponent),
        title: 'Brand Profile — CollabSpace',
      },

      /* ── Campaigns ───────────────────────────────────────────────── */
      {
        path: 'campaigns',
        loadComponent: () =>
          import('./Brand/brand-campaigns/brand-campaigns.component')
            .then(m => m.BrandCampaignsComponent),
        title: 'Campaigns — CollabSpace',
      },

      /* ── Collaborations ──────────────────────────────────────────── */
      {
        path: 'collaborations',
        loadComponent: () =>
          import('./Brand/brand-collaborations/brand-collaborations.component')
            .then(m => m.BrandCollaborationsComponent),
        title: 'Collaborations — CollabSpace',
      },

      /* ── Explore Creators ────────────────────────────────────────── */
      // {
      //   path: 'explore-creators',
      //   loadComponent: () =>
      //     import('./Brand/brand-explore-creators/brand-explore-creators.component')
      //       .then(m => m.BrandExploreCreatorsComponent),
      //   title: 'Explore Creators — CollabSpace',
      // },

      /* ── Budget ──────────────────────────────────────────────────── */
      {
        path: 'budget',
        loadComponent: () =>
          import('./Brand/brand-budget/brand-budget.component')
            .then(m => m.BrandBudgetComponent),
        title: 'Budget — CollabSpace',
      },

      /* ── Payments ────────────────────────────────────────────────── */
      {
        path: 'payments',
        loadComponent: () =>
          import('./Brand/brand-payments/brand-payments.component')
            .then(m => m.BrandPaymentsComponent),
        title: 'Payments & Invoices — CollabSpace',
      },

      /* ── Contracts ───────────────────────────────────────────────── */
      {
        path: 'contracts',
        loadComponent: () =>
          import('./Brand/brand-contracts/brand-contracts.component')
            .then(m => m.BrandContractsComponent),
        title: 'Contracts — CollabSpace',
      },

      /* ── Analytics ───────────────────────────────────────────────── */
      {
        path: 'analytics',
        loadComponent: () =>
          import('./Brand/brand-analytics/brand-analytics.component')
            .then(m => m.BrandAnalyticsComponent),
        title: 'Analytics — CollabSpace',
      },

      /* ── Media Assets ────────────────────────────────────────────── */
      {
        path: 'assets',
        loadComponent: () =>
          import('./Brand/brand-assets/brand-assets.component')
            .then(m => m.BrandAssetsComponent),
        title: 'Media Assets — CollabSpace',
      },

      /* ── Team ────────────────────────────────────────────────────── */
      {
        path: 'team',
        loadComponent: () =>
          import('./Brand/brand-team/brand-team.component')
            .then(m => m.BrandTeamComponent),
        title: 'Team — CollabSpace',
      },

      /* Wildcard inside brand — redirect to overview */
      { path: '**', redirectTo: '' },
    ],
  },

  /* ── 404 ─────────────────────────────────────────────────────────────── */
  { path: '**', redirectTo: '/auth/login' },
];