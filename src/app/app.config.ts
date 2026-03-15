// src/app/app.config.ts
import { ApplicationConfig, importProvidersFrom } from '@angular/core';
import {
  provideRouter,
  withComponentInputBinding,
  withViewTransitions,
}                                                  from '@angular/router';
import {
  provideHttpClient,
  withInterceptorsFromDi,
  HTTP_INTERCEPTORS,
}                                                  from '@angular/common/http';

import { routes }          from './app.routes';
import { AuthInterceptor } from './interceptors/auth.interceptor';

export const appConfig: ApplicationConfig = {
  providers: [

    /* ── Router ──────────────────────────────────────────────────────── */
    provideRouter(
      routes,
      withComponentInputBinding(),   // Allows route params as @Input()
      withViewTransitions(),         // Smooth page transitions (Angular 17+)
    ),

    /* ── HTTP Client + Auth Interceptor ──────────────────────────────── */
    provideHttpClient(
      withInterceptorsFromDi(),      // Uses class-based interceptors
    ),

    /* ── Register the Auth Interceptor ───────────────────────────────── */
    {
      provide:  HTTP_INTERCEPTORS,
      useClass: AuthInterceptor,
      multi:    true,
    },

  ],
};