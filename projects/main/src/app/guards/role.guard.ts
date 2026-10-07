import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { AuthSessionService, EUserRole } from 'auth/core';

/**
 * Factory that returns a guard allowing only users whose role is in `allowedRoles`.
 * Unauthenticated users → /auth/signin
 * Wrong role            → user's home route
 */
export const roleGuard = (allowedRoles: EUserRole[]): CanActivateFn => {
  return () => {
    const session = inject(AuthSessionService);
    const router  = inject(Router);

    if (!session.isAuthenticated()) {
      return router.createUrlTree(['/auth/signin']);
    }

    const role = session.role();
    if (role && allowedRoles.includes(role)) return true;

    // Role not allowed → redirect to appropriate home
    return router.createUrlTree([session.getHomeRoute()]);
  };
};
