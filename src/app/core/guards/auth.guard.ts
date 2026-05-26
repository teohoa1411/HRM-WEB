import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { AuthService } from '../auth/auth.service';
import { Role } from '../models/auth.models';

export const authGuard: CanActivateFn = () => {
  const auth = inject(AuthService);
  const router = inject(Router);
  if (!auth.isAuthenticated()) return router.createUrlTree(['/auth/login']);
  // Force password change before accessing any protected page
  if (auth.mustChangePassword()) return router.createUrlTree(['/auth/change-password']);
  return true;
};

export const roleGuard = (...allowedRoles: Role[]): CanActivateFn => () => {
  const auth = inject(AuthService);
  const router = inject(Router);
  if (auth.hasRole(...allowedRoles)) return true;
  return router.createUrlTree(['/dashboard']);
};
