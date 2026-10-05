import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { AuthSessionService } from 'auth/core';

const CHANGE_PASSWORD = '/account/password';

/**
 * Redirects unauthenticated users to /auth/signin, and users who still have a temporary
 * password to the change-password page.
 */
export const authGuard: CanActivateFn = (_route, state) => {
  const session = inject(AuthSessionService);
  const router  = inject(Router);

  if (!session.isAuthenticated()) return router.createUrlTree(['/auth/signin']);
  if (session.mustChangePassword() && !state.url.startsWith(CHANGE_PASSWORD)) {
    return router.createUrlTree([CHANGE_PASSWORD]);
  }
  return true;
};
