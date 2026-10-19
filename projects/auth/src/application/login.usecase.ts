import { computed, inject, Injectable, DestroyRef, signal } from '@angular/core';
import { Router } from '@angular/router';
import { HttpErrorResponse } from '@angular/common/http';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { UserService } from '../infrastructure/services/user.service';
import { AuthSessionService } from 'auth/core';
import { Subject, EMPTY, of } from 'rxjs';
import { switchMap, tap, catchError, timeout, shareReplay } from 'rxjs/operators';
import { ILoginCredentials } from '../domain/model/login-credentials.model';

/** Mensaje para la persona: solo se habla de la contraseña cuando de verdad es la contraseña (401/400). */
export function loginErrorMessage(err: unknown): string {
  if (err instanceof HttpErrorResponse) {
    if (err.status === 0) {
      return typeof navigator !== 'undefined' && navigator.onLine === false
        ? 'No tienes conexión. Revisa tu internet y vuelve a intentarlo.'
        : 'No logramos conectarnos con GEMS. Revisa tu internet e inténtalo de nuevo.';
    }
    if (err.error?.code === 'USER_DEACTIVATED') return 'Tu cuenta está desactivada. Contacta al administrador.';
    if (err.status === 429) return 'Demasiados intentos. Espera un momento e intenta de nuevo.';
    if (err.status >= 500) return 'Tuvimos un problema de nuestro lado (no es tu contraseña). Inténtalo en un momento.';
  }
  return 'Correo o contraseña incorrectos';
}

@Injectable({ providedIn: 'root' })
export class LoginUseCase {
  private readonly destroyRef     = inject(DestroyRef);
  private readonly userService    = inject(UserService);
  private readonly authSession    = inject(AuthSessionService);
  private readonly router         = inject(Router);

  private readonly _isLoading = signal(false);
  private readonly _error     = signal<string | null>(null);

  readonly isLoading   = computed(() => this._isLoading());
  readonly error       = computed(() => this._error());
  readonly currentUser = this.authSession.user;

  private readonly login$ = new Subject<ILoginCredentials>();

  constructor() {
    this.login$.pipe(
      tap(() => {
        this._isLoading.set(true);
        this._error.set(null);
      }),
      switchMap(credentials =>
        this.userService.login(credentials).pipe(
          tap(({ user, token, mustChangePassword }) => this.authSession.saveSession(user, token, mustChangePassword)),
          // Branding is best-effort: it never blocks the login (ni lo demora más de 2,5 s con red lenta).
          // Si tarda, se entra igual y la marca termina de llegar en segundo plano (shareReplay mantiene la petición).
          switchMap(() => {
            const branding$ = this.authSession.loadInstitutionBranding().pipe(shareReplay(1));
            branding$.subscribe({ error: () => undefined });
            return branding$.pipe(timeout({ first: 2500, with: () => of(null) }), catchError(() => of(null)));
          }),
          tap(() => {
            this._isLoading.set(false);
            this.router.navigate([this.authSession.mustChangePassword()
              ? '/account/password'
              : this.authSession.getHomeRoute()]);
          }),
          catchError(err => {
            this._error.set(loginErrorMessage(err));
            this._isLoading.set(false);
            return EMPTY;
          })
        )
      ),
      takeUntilDestroyed(this.destroyRef)
    ).subscribe();
  }

  login(credentials: ILoginCredentials): void {
    this.login$.next(credentials);
  }
}
