// src/app/core/services/auth.service.ts
import { Injectable }                              from '@angular/core';
import { HttpClient, HttpErrorResponse }           from '@angular/common/http';
import { Router }                                  from '@angular/router';
import { BehaviorSubject, Observable, throwError } from 'rxjs';
import { tap, catchError, map }                    from 'rxjs/operators';
import { environment }                             from '../environment';

/* ─── Interfaces ──────────────────────────────────────────────────────────── */
export interface User {
  id:          string;
  _id?: string; 
  firstName:   string;
  lastName:    string;
  fullName:    string;
  initials:    string;
  email:       string;
  role:        'creator' | 'brand' | 'admin';
  platform:    string;
  companyName: string;
  avatar:      string;
  bio:         string;
  isVerified:  boolean;
  createdAt:   string;
  lastLogin:   string;
}

export interface AuthResponse {
  success: boolean;
  message: string;
  token:   string;
  user:    User;
}

export interface SignupPayload {
  firstName:   string;
  lastName:    string;
  email:       string;
  password:    string;
  role:        'creator' | 'brand';
  platform?:   string;
  companyName?: string;
}

export interface LoginPayload {
  email:      string;
  password:   string;
  rememberMe: boolean;
}

export interface ApiResponse<T = null> {
  success: boolean;
  message: string;
  data?:   T;
}

/* ─── Service ─────────────────────────────────────────────────────────────── */
@Injectable({ providedIn: 'root' })
export class AuthService {

  private readonly API     = environment.apiUrl;
  private readonly TK      = environment.tokenKey;
  private readonly UK      = environment.userKey;

  /* Reactive user state — components subscribe to this */
  private currentUserSubject = new BehaviorSubject<User | null>(this.loadUserFromStorage());
  public  currentUser$       = this.currentUserSubject.asObservable();

  /* Convenience: is the user currently logged in? */
  public  isLoggedIn$        = this.currentUser$.pipe(map(u => !!u));

  constructor(private http: HttpClient, private router: Router) {}

  /* ── Getters ──────────────────────────────────────────────────────────── */

  get currentUser(): User | null {
    return this.currentUserSubject.value;
  }

  get isLoggedIn(): boolean {
    return !!this.currentUser && !!this.getToken();
  }

  get token(): string | null {
    return this.getToken();
  }

  /* ── Storage helpers ──────────────────────────────────────────────────── */

  private loadUserFromStorage(): User | null {
    try {
      const raw = localStorage.getItem(this.UK) || sessionStorage.getItem(this.UK);
      return raw ? JSON.parse(raw) : null;
    } catch {
      return null;
    }
  }

  private getToken(): string | null {
    return localStorage.getItem(this.TK) || sessionStorage.getItem(this.TK);
  }

  private saveSession(token: string, user: User, persist: boolean): void {
    const storage = persist ? localStorage : sessionStorage;
    storage.setItem(this.TK, token);
    storage.setItem(this.UK, JSON.stringify(user));
    this.currentUserSubject.next(user);
  }

  private clearSession(): void {
    localStorage.removeItem(this.TK);
    localStorage.removeItem(this.UK);
    sessionStorage.removeItem(this.TK);
    sessionStorage.removeItem(this.UK);
    this.currentUserSubject.next(null);
  }

  /* ══════════════════════════════════════════════════════════════════════
     SIGNUP
     ══════════════════════════════════════════════════════════════════════ */
  signup(payload: SignupPayload): Observable<AuthResponse> {
    return this.http.post<AuthResponse>(`${this.API}/auth/signup`, payload).pipe(
      tap(_res => {
        // Intentionally do NOT store token or session after signup.
        // The user must log in explicitly so role-based dashboard routing
        // works correctly and any email verification flow is preserved.
      }),
      catchError(this.handleError)
    );
  }

  /* ══════════════════════════════════════════════════════════════════════
     LOGIN
     ══════════════════════════════════════════════════════════════════════ */
  login(payload: LoginPayload): Observable<AuthResponse> {
    return this.http.post<AuthResponse>(`${this.API}/auth/login`, payload).pipe(
      tap(res => {
        if (res.token && res.user) {
          this.saveSession(res.token, res.user, payload.rememberMe);
        }
      }),
      catchError(this.handleError)
    );
  }

  /* ══════════════════════════════════════════════════════════════════════
     LOGOUT
     ══════════════════════════════════════════════════════════════════════ */
  logout(): void {
    // Notify backend (fire and forget — don't block UI)
    this.http.post(`${this.API}/auth/logout`, {}).subscribe({
      error: () => {} // Silent fail — we still clear local session
    });
    this.clearSession();
    this.router.navigate(['/auth/login']);
  }

  /* ══════════════════════════════════════════════════════════════════════
     GET CURRENT USER (refresh from server)
     ══════════════════════════════════════════════════════════════════════ */
  fetchCurrentUser(): Observable<User> {
    return this.http.get<{ success: boolean; user: User }>(`${this.API}/auth/me`).pipe(
      tap(res => {
        // Update the stored user with fresh data from server
        const storage = localStorage.getItem(this.TK) ? localStorage : sessionStorage;
        storage.setItem(this.UK, JSON.stringify(res.user));
        this.currentUserSubject.next(res.user);
      }),
      map(res => res.user),
      catchError(err => {
        // Token is invalid — force logout
        if (err.status === 401) {
          this.clearSession();
          this.router.navigate(['/auth/login']);
        }
        return throwError(() => err);
      })
    );
  }

  /* ══════════════════════════════════════════════════════════════════════
     EMAIL VERIFICATION
     ══════════════════════════════════════════════════════════════════════ */
  verifyEmail(token: string): Observable<AuthResponse> {
    return this.http.get<AuthResponse>(`${this.API}/auth/verify-email/${token}`).pipe(
      tap(res => {
        if (res.token && res.user) {
          this.saveSession(res.token, res.user, false);
        }
      }),
      catchError(this.handleError)
    );
  }

  /* ══════════════════════════════════════════════════════════════════════
     FORGOT PASSWORD
     ══════════════════════════════════════════════════════════════════════ */
  forgotPassword(email: string): Observable<ApiResponse> {
    return this.http.post<ApiResponse>(`${this.API}/auth/forgot-password`, { email }).pipe(
      catchError(this.handleError)
    );
  }

  /* ══════════════════════════════════════════════════════════════════════
     RESET PASSWORD
     ══════════════════════════════════════════════════════════════════════ */
  resetPassword(token: string, password: string): Observable<AuthResponse> {
    return this.http.post<AuthResponse>(
      `${this.API}/auth/reset-password/${token}`,
      { password }
    ).pipe(
      tap(res => {
        if (res.token && res.user) {
          this.saveSession(res.token, res.user, false);
        }
      }),
      catchError(this.handleError)
    );
  }

  /* ══════════════════════════════════════════════════════════════════════
     CHANGE PASSWORD
     ══════════════════════════════════════════════════════════════════════ */
  changePassword(currentPassword: string, newPassword: string): Observable<ApiResponse> {
    return this.http.post<ApiResponse>(`${this.API}/auth/change-password`, {
      currentPassword,
      newPassword,
    }).pipe(catchError(this.handleError));
  }

  /* ══════════════════════════════════════════════════════════════════════
     UPDATE PROFILE
     ══════════════════════════════════════════════════════════════════════ */
  updateProfile(data: Partial<User>): Observable<{ success: boolean; user: User }> {
    return this.http.put<{ success: boolean; user: User }>(`${this.API}/users/profile`, data).pipe(
      tap(res => {
        // Sync updated user into local state
        const storage = localStorage.getItem(this.TK) ? localStorage : sessionStorage;
        storage.setItem(this.UK, JSON.stringify(res.user));
        this.currentUserSubject.next(res.user);
      }),
      catchError(this.handleError)
    );
  }

  /* ── Role checks ──────────────────────────────────────────────────────── */
  isCreator(): boolean { return this.currentUser?.role === 'creator'; }

  /** Returns the correct dashboard route based on user role */
  getRoleDashboard(): string {
    const role = this.currentUser?.role;
    if (role === 'brand')   return '/dashboard/brand';
    if (role === 'admin')   return '/dashboard/admin';
    return '/dashboard/creator';  // default for creator + fallback
  }
  isBrand():   boolean { return this.currentUser?.role === 'brand';   }
  isAdmin():   boolean { return this.currentUser?.role === 'admin';   }

  /* ── Error handler ────────────────────────────────────────────────────── */
  private handleError(err: HttpErrorResponse): Observable<never> {
    let message = 'Something went wrong. Please try again.';

    if (err.error?.message) {
      message = err.error.message;
    } else if (err.status === 0) {
      message = 'Cannot connect to server. Please check your connection.';
    } else if (err.status === 429) {
      message = 'Too many attempts. Please wait a moment and try again.';
    } else if (err.status === 423) {
      message = err.error?.message || 'Account temporarily locked.';
    } else if (err.status >= 500) {
      message = 'Server error. Please try again later.';
    }

    return throwError(() => ({ ...err, friendlyMessage: message }));
  }

  /** Called by InstagramSuccessComponent after OAuth redirect */
  saveInstagramSession(token: string, info: { role: string; username: string; followers: number }): void {
    // Save JWT token
    localStorage.setItem(this.TK, token);
    // Build a minimal user object so guards and role-routing work
    const user: any = {
      role:               info.role,
      platform:           'Instagram',
      instagramHandle:    info.username,
      instagramFollowers: info.followers,
      isLoggedIn:         true,
    };
    localStorage.setItem(this.UK, JSON.stringify(user));
    this.currentUserSubject.next(user as any);
  }

}