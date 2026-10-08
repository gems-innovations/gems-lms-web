import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { AuthSessionService } from 'auth/core';
import { isGuestUser } from '../public/guest-access.service';

/**
 * If the user is already authenticated, redirect them to their role home page.
 * The reset and verification links always open: it can be followed from a device that already holds a session (e.g. a guest).
 * A guest session never blocks the sign-in screen: the guest invitation links there to sign in with a real account.
 */
export const loginRedirectGuard: CanActivateFn = (_route, state) => {
  const session = inject(AuthSessionService);
  const router  = inject(Router);

  if (!session.isAuthenticated() || isGuestUser(session.user()) || /\/(reset-password|verify-email)$/.test(state.url.split('?')[0])) return true;
  return router.createUrlTree([session.mustChangePassword() ? '/account/password' : session.getHomeRoute()]);
};
