// src/app/core/interceptors/auth.interceptor.ts
import { Injectable }                              from '@angular/core';
import {
  HttpInterceptor,
  HttpRequest,
  HttpHandler,
  HttpEvent,
  HttpErrorResponse,
}                                                  from '@angular/common/http';
import { Observable, throwError }                  from 'rxjs';
import { catchError }                              from 'rxjs/operators';
import { Router }                                  from '@angular/router';
import { environment }                             from '../environment';

@Injectable()
export class AuthInterceptor implements HttpInterceptor {

  constructor(private router: Router) {}

  intercept(req: HttpRequest<unknown>, next: HttpHandler): Observable<HttpEvent<unknown>> {

    // Only attach token to requests going to our own API
    const isApiCall = req.url.startsWith(environment.apiUrl);
    if (!isApiCall) {
      return next.handle(req);
    }

    // Retrieve JWT from storage (localStorage for persisted, sessionStorage for session)
    const token =
      localStorage.getItem(environment.tokenKey) ||
      sessionStorage.getItem(environment.tokenKey);

    // Clone the request and add Authorization header if token exists
    const authReq = token
      ? req.clone({ setHeaders: { Authorization: `Bearer ${token}` } })
      : req;

    return next.handle(authReq).pipe(
      catchError((err: HttpErrorResponse) => {

        // 401 Unauthorized — token expired or invalid → redirect to login
        if (err.status === 401) {
          localStorage.removeItem(environment.tokenKey);
          localStorage.removeItem(environment.userKey);
          sessionStorage.removeItem(environment.tokenKey);
          sessionStorage.removeItem(environment.userKey);

          // Avoid redirect loops on the auth pages themselves
          const currentUrl = this.router.url;
          if (!currentUrl.startsWith('/auth')) {
            this.router.navigate(['/auth/login'], {
              queryParams: { returnUrl: currentUrl },
            });
          }
        }

        return throwError(() => err);
      })
    );
  }
}