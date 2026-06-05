import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { AuthSessionService } from 'auth';

/** Redirects unauthenticated users to /auth/signin. */
export const authGuard: CanActivateFn = () => {
  const session = inject(AuthSessionService);
  const router  = inject(Router);

  if (session.isAuthenticated()) return true;
  return router.createUrlTree(['/auth/signin']);
};
