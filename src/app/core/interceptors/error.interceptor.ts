import { HttpInterceptorFn, HttpErrorResponse, HttpRequest, HttpHandlerFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { Router } from '@angular/router';
import { MatSnackBar } from '@angular/material/snack-bar';
import { catchError, switchMap, throwError } from 'rxjs';
import { AuthService } from '../auth/auth.service';

export const errorInterceptor: HttpInterceptorFn = (req, next) => {
  const router = inject(Router);
  const snackBar = inject(MatSnackBar);
  const authService = inject(AuthService);

  return next(req).pipe(
    catchError((err: HttpErrorResponse) => {
      if (err.status === 401) {
        // Skip refresh for auth endpoints themselves (login, refresh, logout)
        const isAuthEndpoint = req.url.includes('/auth/login')
          || req.url.includes('/auth/refresh')
          || req.url.includes('/auth/logout');

        if (!isAuthEndpoint && authService.isAuthenticated()) {
          // Try refreshing the token before giving up
          return authService.refreshToken().pipe(
            switchMap(success => {
              if (success) {
                // Retry the original request with the new token
                const newToken = authService.accessToken();
                const retryReq = req.clone({
                  setHeaders: { Authorization: `Bearer ${newToken}` }
                });
                return next(retryReq);
              } else {
                // Refresh failed — session truly expired
                authService.logout();
                return throwError(() => err);
              }
            })
          );
        }

        // Auth endpoint failed or user wasn't authenticated
        if (authService.isAuthenticated()) {
          authService.logout();
        }
      } else if (err.status === 403) {
        snackBar.open('Access denied', 'Close', { duration: 3000, panelClass: 'error-snack' });
      } else if (err.status >= 500) {
        snackBar.open('Server error. Please try again.', 'Close', { duration: 4000, panelClass: 'error-snack' });
      }
      return throwError(() => err);
    })
  );
};
