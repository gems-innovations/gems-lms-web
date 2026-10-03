import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { AuthSessionService } from 'auth';

/** If the user is already authenticated, redirect them to their role home page. */
export const loginRedirectGuard: CanActivateFn = () => {
  const session = inject(AuthSessionService);
  const router  = inject(Router);

  if (!session.isAuthenticated()) return true;
  return router.createUrlTree([session.mustChangePassword() ? '/account/password' : session.getHomeRoute()]);
};
