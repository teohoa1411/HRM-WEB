import { Injectable, signal, computed, OnDestroy, NgZone } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Router } from '@angular/router';
import { tap, catchError, throwError, Observable, of, Subject, BehaviorSubject } from 'rxjs';
import { environment } from '@environments/environment';
import { ApiResponse } from '../models/api.models';
import { AuthState, LoginRequest, LoginResponse, RefreshResponse, Role } from '../models/auth.models';

@Injectable({ providedIn: 'root' })
export class AuthService implements OnDestroy {
  private readonly apiUrl = environment.apiUrl;

  // Proactive refresh timer
  private refreshTimerId: ReturnType<typeof setTimeout> | null = null;
  // Buffer: refresh 2 minutes before expiry
  private readonly REFRESH_BUFFER_MS = 2 * 60 * 1000;
  // Minimum token lifetime before scheduling refresh (30 seconds)
  private readonly MIN_REFRESH_DELAY_MS = 30 * 1000;

  // Flag to prevent concurrent refresh calls
  private _isRefreshing = false;
  private _refreshResult$ = new BehaviorSubject<boolean | null>(null);

  // In-memory token (never localStorage)
  private _state = signal<AuthState>({
    accessToken: null,
    userId: null,
    username: null,
    email: null,
    role: null,
    companyId: null,
    mustChangePassword: false,
    isAuthenticated: false
  });

  readonly state = this._state.asReadonly();
  readonly isAuthenticated = computed(() => this._state().isAuthenticated);
  readonly currentRole = computed(() => this._state().role);
  readonly companyId = computed(() => this._state().companyId);
  readonly username = computed(() => this._state().username);
  readonly accessToken = computed(() => this._state().accessToken);
  readonly mustChangePassword = computed(() => this._state().mustChangePassword);

  constructor(
    private http: HttpClient,
    private router: Router,
    private ngZone: NgZone
  ) {}

  ngOnDestroy() {
    this.clearRefreshTimer();
  }

  login(request: LoginRequest) {
    return this.http.post<ApiResponse<LoginResponse>>(
      `${this.apiUrl}/auth/login`,
      request,
      { withCredentials: true } // Send/receive cookies
    ).pipe(
      tap(res => {
        if (res.success) {
          this.setAuthState(res.data);
          this.scheduleProactiveRefresh(res.data.accessToken);
        }
      }),
      catchError(err => throwError(() => err))
    );
  }

  logout() {
    this.clearRefreshTimer();
    if (this._state().accessToken) {
      this.http.post(`${this.apiUrl}/auth/logout`, {}, { withCredentials: true }).subscribe();
    }
    this.clearState();
    this.router.navigate(['/auth/login']);
  }

  /**
   * Try to restore session using refresh token cookie.
   * Called on app startup (APP_INITIALIZER) to survive page reloads.
   * Returns observable that completes after attempt.
   */
  restoreSession(): Observable<boolean> {
    return new Observable<boolean>(subscriber => {
      this.http.post<ApiResponse<RefreshResponse>>(
        `${this.apiUrl}/auth/refresh`,
        {},
        { withCredentials: true }
      ).subscribe({
        next: res => {
          if (res.success && res.data) {
            this.setAuthState(res.data);
            this.scheduleProactiveRefresh(res.data.accessToken);
            subscriber.next(true);
          } else {
            subscriber.next(false);
          }
          subscriber.complete();
        },
        error: () => {
          // No valid refresh token — user needs to login
          subscriber.next(false);
          subscriber.complete();
        }
      });
    });
  }

  /**
   * Attempt to refresh the access token.
   * Used by error interceptor when a 401 is received.
   * Returns observable<boolean> indicating success.
   * Prevents concurrent refresh calls.
   */
  refreshToken(): Observable<boolean> {
    if (this._isRefreshing) {
      // Wait for ongoing refresh to complete
      return new Observable(subscriber => {
        const sub = this._refreshResult$.subscribe(result => {
          if (result !== null) {
            subscriber.next(result);
            subscriber.complete();
            sub.unsubscribe();
          }
        });
      });
    }

    this._isRefreshing = true;
    this._refreshResult$.next(null);

    return new Observable<boolean>(subscriber => {
      this.http.post<ApiResponse<RefreshResponse>>(
        `${this.apiUrl}/auth/refresh`,
        {},
        { withCredentials: true }
      ).subscribe({
        next: res => {
          this._isRefreshing = false;
          if (res.success && res.data) {
            this.setAuthState(res.data);
            this.scheduleProactiveRefresh(res.data.accessToken);
            this._refreshResult$.next(true);
            subscriber.next(true);
          } else {
            this._refreshResult$.next(false);
            subscriber.next(false);
          }
          subscriber.complete();
        },
        error: () => {
          this._isRefreshing = false;
          this._refreshResult$.next(false);
          subscriber.next(false);
          subscriber.complete();
        }
      });
    });
  }

  get isRefreshing(): boolean {
    return this._isRefreshing;
  }

  hasRole(...roles: Role[]): boolean {
    const current = this._state().role;
    return current !== null && roles.includes(current);
  }

  isSuperAdmin(): boolean { return this.hasRole('SUPER_ADMIN'); }
  /** COMPANY_ADMIN hoặc MANAGER. Dùng cho quyền chung của hai vai trò này. */
  isAdminOrManager(): boolean { return this.hasRole('COMPANY_ADMIN', 'MANAGER'); }
  /** Chỉ COMPANY_ADMIN — không bao gồm MANAGER. Dùng để ẩn các action cấu hình hệ thống. */
  isStrictAdmin(): boolean { return this.hasRole('COMPANY_ADMIN'); }
  isAccountant(): boolean { return this.hasRole('ACCOUNTANT'); }
  canPreparePayroll(): boolean { return this.hasRole('MANAGER', 'ACCOUNTANT', 'COMPANY_ADMIN'); }
  canConfirmFinancialData(): boolean { return this.hasRole('ACCOUNTANT', 'COMPANY_ADMIN'); }
  canMarkPayrollPaid(): boolean { return this.hasRole('ACCOUNTANT', 'COMPANY_ADMIN'); }
  isEmployee(): boolean { return this.hasRole('EMPLOYEE'); }

  clearMustChangePassword() {
    this._state.update(s => ({ ...s, mustChangePassword: false }));
  }

  // ─── Private helpers ───

  private setAuthState(data: LoginResponse | RefreshResponse) {
    const { accessToken, userId, username, email, role, companyId, mustChangePassword } = data;
    this._state.set({
      accessToken, userId, username, email, role, companyId,
      mustChangePassword, isAuthenticated: true
    });
  }

  private clearState() {
    this._state.set({
      accessToken: null, userId: null, username: null, email: null,
      role: null, companyId: null, mustChangePassword: false, isAuthenticated: false
    });
  }

  /**
   * Schedule a proactive token refresh before the access token expires.
   * Decodes JWT exp claim to determine when to refresh.
   */
  private scheduleProactiveRefresh(accessToken: string) {
    this.clearRefreshTimer();

    try {
      const payload = JSON.parse(atob(accessToken.split('.')[1]));
      const expiresAtMs = payload.exp * 1000;
      const now = Date.now();
      const delay = expiresAtMs - now - this.REFRESH_BUFFER_MS;

      if (delay < this.MIN_REFRESH_DELAY_MS) {
        // Token is about to expire very soon, refresh immediately
        this.refreshToken().subscribe();
        return;
      }

      // Run timer outside Angular zone to avoid triggering change detection
      this.ngZone.runOutsideAngular(() => {
        this.refreshTimerId = setTimeout(() => {
          this.ngZone.run(() => {
            this.refreshToken().subscribe({
              next: success => {
                if (!success) {
                  // Refresh failed — token will expire, user will be logged out on next API call
                  console.warn('Proactive token refresh failed');
                }
              }
            });
          });
        }, delay);
      });
    } catch (e) {
      console.error('Failed to decode access token for proactive refresh', e);
    }
  }

  private clearRefreshTimer() {
    if (this.refreshTimerId) {
      clearTimeout(this.refreshTimerId);
      this.refreshTimerId = null;
    }
  }
}
