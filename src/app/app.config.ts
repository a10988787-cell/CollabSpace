// src/app/app.config.ts
import { ApplicationConfig, importProvidersFrom } from '@angular/core';
import {
  provideRouter,
  withComponentInputBinding,
  withViewTransitions,
} from '@angular/router';
import {
  provideHttpClient,
  withFetch,
  withInterceptorsFromDi,
  HTTP_INTERCEPTORS,
} from '@angular/common/http';

import { routes }          from './app.routes';
import { AuthInterceptor } from './interceptors/auth.interceptor';

export const appConfig: ApplicationConfig = {
  providers: [

    /* ── Router ──────────────────────────────────────────────────────── */
    provideRouter(
      routes,
      withComponentInputBinding(),
      withViewTransitions(),
    ),

    /* ── HTTP Client — withFetch() required for SSR compatibility ─────── */
    provideHttpClient(
      withFetch(),               // Use fetch API (required for SSR)
      withInterceptorsFromDi(),  // Class-based interceptors
    ),

    /* ── Auth Interceptor ─────────────────────────────────────────────── */
    {
      provide:  HTTP_INTERCEPTORS,
      useClass: AuthInterceptor,
      multi:    true,
    },

  ],
};