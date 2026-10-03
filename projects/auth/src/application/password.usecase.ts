import { Injectable, inject, signal } from '@angular/core';
import { Router } from '@angular/router';
import { HttpErrorResponse } from '@angular/common/http';
import { UserService } from '../infrastructure/services/user.service';
import { AuthSessionService } from '../infrastructure/services/auth-session.service';

/** Same rule as the API: 8+ characters with a lowercase, an uppercase, a digit and one of @$!%*?& */
export const PASSWORD_RULE = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&]).{8,}$/;
export const PASSWORD_HINT = 'Mínimo 8 caracteres, con mayúscula, minúscula, número y un símbolo (@$!%*?&).';

function passwordErrorMessage(err: unknown): string {
  if (err instanceof HttpErrorResponse) {
    if (err.status === 0) return 'No se pudo conectar con el servidor. Intenta de nuevo en unos minutos.';
    switch (err.error?.code) {
      case 'WRONG_CURRENT_PASSWORD': return 'La contraseña actual no es correcta.';
      case 'SAME_PASSWORD': return 'La nueva contraseña debe ser distinta de la actual.';
      case 'INVALID_RESET_TOKEN': return 'El enlace no es válido o ya expiró. Solicita uno nuevo.';
    }
    if (err.status === 400) return PASSWORD_HINT;
    if (err.status === 429) return 'Demasiados intentos. Espera un momento e intenta de nuevo.';
  }
  return 'No se pudo completar la operación. Intenta de nuevo.';
}

/** Change, forgot and reset password flows. */
@Injectable({ providedIn: 'root' })
export class PasswordUseCase {
  private readonly userService = inject(UserService);
  private readonly session     = inject(AuthSessionService);
  private readonly router      = inject(Router);

  readonly isLoading = signal(false);
  readonly error     = signal<string | null>(null);
  readonly done      = signal(false);

  readonly mustChangePassword = this.session.mustChangePassword;

  reset(): void {
    this.isLoading.set(false);
    this.error.set(null);
    this.done.set(false);
  }

  changePassword(currentPassword: string, newPassword: string): void {
    this.run(this.userService.changePassword(currentPassword, newPassword), () => {
      this.session.passwordChanged();
      this.router.navigate([this.session.getHomeRoute()]);
    });
  }

  requestReset(email: string): void {
    this.run(this.userService.forgotPassword(email.trim()));
  }

  resetPassword(token: string, newPassword: string): void {
    this.run(this.userService.resetPassword(token, newPassword));
  }

  logout(): void {
    this.session.clearSession();
    this.router.navigate(['/auth/signin']);
  }

  private run(request: ReturnType<UserService['forgotPassword']>, onDone?: () => void): void {
    this.isLoading.set(true);
    this.error.set(null);
    request.subscribe({
      next: () => {
        this.isLoading.set(false);
        this.done.set(true);
        onDone?.();
      },
      error: err => {
        this.isLoading.set(false);
        this.error.set(passwordErrorMessage(err));
      }
    });
  }
}
