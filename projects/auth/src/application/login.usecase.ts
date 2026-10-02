import { computed, inject, Injectable, DestroyRef, signal } from '@angular/core';
import { Router } from '@angular/router';
import { HttpErrorResponse } from '@angular/common/http';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { UserService } from '../infrastructure/services/user.service';
import { AuthSessionService } from '../infrastructure/services/auth-session.service';
import { Subject, EMPTY } from 'rxjs';
import { switchMap, tap, catchError } from 'rxjs/operators';
import { ILoginCredentials } from '../domain/model/login-credentials.model';

function loginErrorMessage(err: unknown): string {
  if (err instanceof HttpErrorResponse) {
    if (err.status === 0) return 'No se pudo conectar con el servidor. Intenta de nuevo en unos minutos.';
    if (err.error?.code === 'USER_DEACTIVATED') return 'Tu cuenta está desactivada. Contacta al administrador.';
    if (err.status === 429) return 'Demasiados intentos. Espera un momento e intenta de nuevo.';
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
          tap(({ user, token }) => this.authSession.saveSession(user, token)),
          // Branding is best-effort: it never blocks the login.
          switchMap(() => this.authSession.loadInstitutionBranding()),
          tap(() => {
            this._isLoading.set(false);
            this.router.navigate([this.authSession.getHomeRoute()]);
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
