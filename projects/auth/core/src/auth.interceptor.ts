import { inject } from '@angular/core';
import { HttpErrorResponse, HttpInterceptorFn } from '@angular/common/http';
import { Router } from '@angular/router';
import { catchError, throwError } from 'rxjs';
import { environment, BrandingService } from 'shared/core';
import { AuthSessionService } from './auth-session.service';

/**
 * Adds the JWT to every request sent to the API gateway and ends the session when the
 * API answers 401 (expired or invalid token).
 */
export const authInterceptor: HttpInterceptorFn = (req, next) => {
  const session = inject(AuthSessionService);
  const router = inject(Router);
  const branding = inject(BrandingService);

  const isApiCall = req.url.startsWith(environment.apiBaseUrl);
  const isLogin = req.url === environment.apiUrls.auth.login;
  const token = session.token();

  const request = isApiCall && token && !isLogin
    ? req.clone({ setHeaders: { Authorization: `Bearer ${token}` } })
    : req;

  return next(request).pipe(
    catchError((err: unknown) => {
      if (isApiCall && !isLogin && err instanceof HttpErrorResponse && err.status === 401 && session.isAuthenticated()) {
        session.clearSession();
        branding.reset();
        router.navigate(['/auth/signin']);
      }
      return throwError(() => err);
    })
  );
};
