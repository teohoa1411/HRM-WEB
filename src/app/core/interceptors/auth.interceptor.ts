import { HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { AuthService } from '../auth/auth.service';

export const authInterceptor: HttpInterceptorFn = (req, next) => {
  const authService = inject(AuthService);
  const token = authService.accessToken();

  let modifiedReq = req;

  // Always send credentials (cookies) for auth endpoints
  if (req.url.includes('/auth/')) {
    modifiedReq = modifiedReq.clone({ withCredentials: true });
  }

  // Attach Bearer token if available
  if (token) {
    modifiedReq = modifiedReq.clone({
      setHeaders: { Authorization: `Bearer ${token}` }
    });
  }

  return next(modifiedReq);
};
