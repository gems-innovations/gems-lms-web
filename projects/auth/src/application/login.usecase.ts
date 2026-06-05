import { computed, inject, Injectable, DestroyRef, signal } from '@angular/core';
import { Router } from '@angular/router';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { UserService } from '../infrastructure/services/user.service';
import { AuthSessionService } from './auth-session.service';
import { Subject, EMPTY } from 'rxjs';
import { switchMap, tap, catchError } from 'rxjs/operators';
import { ILoginCredentials } from '../domain/model/login-credentials.model';

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
          tap(user => {
            this.authSession.saveSession(user);
            this._isLoading.set(false);
            this.router.navigate([this.authSession.getHomeRoute()]);
          }),
          catchError(() => {
            this._error.set('Correo o contraseña incorrectos');
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
