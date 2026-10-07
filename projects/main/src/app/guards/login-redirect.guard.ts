import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { AuthSessionService } from 'auth/core';

/**
 * If the user is already authenticated, redirect them to their role home page.
 * The reset link always opens: it can be followed from a device that already holds a session (e.g. a guest).
 */
export const loginRedirectGuard: CanActivateFn = (_route, state) => {
  const session = inject(AuthSessionService);
  const router  = inject(Router);

  if (!session.isAuthenticated() || state.url.split('?')[0].endsWith('/reset-password')) return true;
  return router.createUrlTree([session.mustChangePassword() ? '/account/password' : session.getHomeRoute()]);
};
