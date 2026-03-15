// src/app/app.routes.ts
import { Routes } from '@angular/router';
import { authGuard, roleGuard } from './guards/auth.guard';

export const routes: Routes = [

  /* ── Default ────────────────────────────────────────────────────── */
  { path: '', redirectTo: '/auth/login', pathMatch: 'full' },

  /* ════════════════════════════════════════════════════════════════
     AUTH  — /auth/*
     ════════════════════════════════════════════════════════════════ */
  {
    path: 'auth',
    children: [
      { path: '',                redirectTo: 'login', pathMatch: 'full' },
      { path: 'login',           loadComponent: () => import('./auth/login/login.component').then(m => m.LoginComponent),                     title: 'Sign In — CollabSpace' },
      { path: 'signup',          loadComponent: () => import('./auth/signup/signup.component').then(m => m.SignupComponent),                   title: 'Create Account — CollabSpace' },
      { path: 'forgot-password', loadComponent: () => import('./auth/forgot-password/forgot-password.component').then(m => m.ForgotPasswordComponent), title: 'Reset Password — CollabSpace' },
      { path: 'reset-password/:token',  loadComponent: () => import('./auth/reset-password/reset-password.component').then(m => m.ResetPasswordComponent),  title: 'New Password — CollabSpace' },
      { path: 'verify-email/:token',    loadComponent: () => import('./auth/verify-email/verify-email.component').then(m => m.VerifyEmailComponent),         title: 'Verify Email — CollabSpace' },
    ],
  },

  /* ════════════════════════════════════════════════════════════════
     CREATOR DASHBOARD  — /dashboard/creator
     ════════════════════════════════════════════════════════════════ */
  {
    path: 'dashboard/creator',
    canActivate: [authGuard, roleGuard('creator')],
    loadComponent: () => import('./Creator/creator-dashboard/creator-dashboard.component').then(m => m.CreatorDashboardComponent),
    title: 'Creator Dashboard — CollabSpace',
  },

  /* ════════════════════════════════════════════════════════════════
     BRAND DASHBOARD  — /dashboard/brand/*
     ════════════════════════════════════════════════════════════════ */
  {
    path: 'dashboard/brand',
    canActivate: [authGuard, roleGuard('brand')],
    loadComponent: () => import('./Brand/brand-dashboard/brand-dashboard.component').then(m => m.BrandDashboardComponent),
    title: 'Brand Dashboard — CollabSpace',
    children: [
      { path: '', pathMatch: 'full', children: [] },

      /* Profile */
      { path: 'profile',          loadComponent: () => import('./Brand/brand-profile/brand-profile.component').then(m => m.BrandProfileComponent),               title: 'Brand Profile — CollabSpace' },

      /* Explore Creators — NEW: brand browses & invites creators */
      { path: 'explore-creators', loadComponent: () => import('./Brand/brand-explore-creators/brand-explore-creators.component').then(m => m.BrandExploreCreatorsComponent), title: 'Explore Creators — CollabSpace' },

      /* Campaigns */
      { path: 'campaigns',        loadComponent: () => import('./Brand/brand-campaigns/brand-campaigns.component').then(m => m.BrandCampaignsComponent),          title: 'Campaigns — CollabSpace' },

      /* Collaborations — NEW: manage invites + incoming content from creators */
      { path: 'collaborations',   loadComponent: () => import('./Brand/brand-collaborations/brand-collaborations.component').then(m => m.BrandCollaborationsComponent), title: 'Collaborations — CollabSpace' },

      /* Content Review — NEW: brand reviews creator-uploaded collab content */
      { path: 'content-review',   loadComponent: () => import('./Brand/brand-content-review/brand-content-review.component').then(m => m.BrandContentReviewComponent), title: 'Content Review — CollabSpace' },

      /* Budget */
      { path: 'budget',           loadComponent: () => import('./Brand/brand-budget/brand-budget.component').then(m => m.BrandBudgetComponent),                   title: 'Budget — CollabSpace' },

      /* Payments — includes pay creator action */
      { path: 'payments',         loadComponent: () => import('./Brand/brand-payments/brand-payments.component').then(m => m.BrandPaymentsComponent),             title: 'Payments & Invoices — CollabSpace' },

      /* Contracts */
      { path: 'contracts',        loadComponent: () => import('./Brand/brand-contracts/brand-contracts.component').then(m => m.BrandContractsComponent),          title: 'Contracts — CollabSpace' },

      /* Analytics */
      { path: 'analytics',        loadComponent: () => import('./Brand/brand-analytics/brand-analytics.component').then(m => m.BrandAnalyticsComponent),          title: 'Analytics — CollabSpace' },

      /* Media Assets */
      { path: 'assets',           loadComponent: () => import('./Brand/brand-assets/brand-assets.component').then(m => m.BrandAssetsComponent),                   title: 'Media Assets — CollabSpace' },

      /* Team */
      { path: 'team',             loadComponent: () => import('./Brand/brand-team/brand-team.component').then(m => m.BrandTeamComponent),                         title: 'Team — CollabSpace' },

      { path: '**', redirectTo: '' },
    ],
  },

  /* ════════════════════════════════════════════════════════════════
     ADMIN DASHBOARD  — /dashboard/admin
     ════════════════════════════════════════════════════════════════ */
  {
    path: 'dashboard/admin',
    canActivate: [authGuard, roleGuard('admin')],
    loadComponent: () => import('./Admin/admin-dashboard/admin-dashboard.component').then(m => m.AdminDashboardComponent),
    title: 'Admin Panel — CollabSpace',
  },

  /* ── 404 ─────────────────────────────────────────────────────── */
  { path: '**', redirectTo: '/auth/login' },
];